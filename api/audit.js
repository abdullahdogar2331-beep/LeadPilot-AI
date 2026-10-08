export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  let target=req.body?.url;
  if(!target) return res.status(400).json({error:"Website URL is required"});
  if(!/^https?:\/\//i.test(target)) target="https://"+target;
  try{
    const u=new URL(target);
    if(!["http:","https:"].includes(u.protocol)) throw new Error("Invalid URL");
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
    const started=Date.now();
    const r=await fetch(u,{redirect:"follow",signal:controller.signal,headers:{"User-Agent":"LeadPilot-AI-Auditor/1.0"}});
    clearTimeout(timer);
    const html=await r.text(); const ms=Date.now()-started;
    const lower=html.toLowerCase();
    const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/\s+/g," ").trim()||"";
    const desc=(html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i)||[])[1]||"";
    const viewport=/name=["']viewport["']/i.test(html);
    const h1=(html.match(/<h1\b/gi)||[]).length;
    const cta=/(contact|quote|book|call|schedule|request)/i.test(html);
    const canonical=/rel=["']canonical["']/i.test(html);
    const https=u.protocol==="https:";
    let score=0; if(https)score+=15; if(r.ok)score+=15; if(title)score+=15; if(desc)score+=10; if(viewport)score+=15; if(h1===1)score+=10; if(cta)score+=10; if(canonical)score+=5;
    const checks=[
      {label:"HTTPS",ok:https,detail:https?"Secure connection":"Use HTTPS"},
      {label:"Page reachable",ok:r.ok,detail:"HTTP "+r.status},
      {label:"Title tag",ok:!!title,detail:title||"Missing"},
      {label:"Meta description",ok:!!desc,detail:desc?"Present":"Missing"},
      {label:"Mobile viewport",ok:viewport,detail:viewport?"Present":"Missing"},
      {label:"Single H1",ok:h1===1,detail:h1+" H1 tag(s)"},
      {label:"Clear CTA",ok:cta,detail:cta?"CTA language found":"No obvious CTA"},
      {label:"Canonical",ok:canonical,detail:canonical?"Present":"Missing"}
    ];
    return res.status(200).json({url:target,score,ms,status:r.status,title,description:desc,checks});
  }catch(e){return res.status(422).json({error:e.name==="AbortError"?"Website took too long to respond":e.message||"Audit failed"});}
}