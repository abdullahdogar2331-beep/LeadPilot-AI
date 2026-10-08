export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const country=req.query.country||"USA", niche=req.query.niche||"Plumbing", city=req.query.city||"";
  const countryCodes={USA:"us",UK:"gb",Germany:"de",Italy:"it"};
  const cc=countryCodes[country]||"us";
  const q=city ? `${niche} ${city}` : niche;
  const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&addressdetails=1&extratags=1&q="+encodeURIComponent(q)+"&countrycodes="+cc;
  try{
    const r=await fetch(url,{headers:{"User-Agent":"LeadPilot-AI/1.0 contact@example.com","Accept-Language":"en"}});
    if(!r.ok) throw new Error("Lead source unavailable");
    const data=await r.json();
    const leads=data.map((x,i)=>{
      const e=x.extratags||{}, a=x.address||{};
      const website=e.website||e["contact:website"]||"";
      const email=e.email||e["contact:email"]||"";
      return {id:"osm_"+Date.now()+"_"+i,name:e.name||x.display_name?.split(",")[0]||"Unknown business",
        city:a.city||a.town||a.village||a.municipality||city||"—",country, niche,
        website,email,phone:e.phone||e["contact:phone"]||"",source:"OpenStreetMap",lat:x.lat,lon:x.lon,status:"New"};
    }).filter(x=>x.name&&x.name!=="Unknown business");
    res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({leads});
  }catch(e){return res.status(502).json({error:e.message||"Could not find leads"});}
}