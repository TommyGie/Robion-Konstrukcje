// Pure geometry: one correction translates every point, preserving the member length.
export function magneticTranslation(points,targets,tolerance,normal=[0,0,1]){
 let best=null;
 for(const point of points)for(const target of targets){
  const delta=target.point.map((v,i)=>v-point[i]);
  // A snap must not silently move a member into another depth plane.
  if(Math.abs(delta.reduce((s,v,i)=>s+v*normal[i],0))>1e-5)continue;
  const distance=Math.hypot(...delta);
  if(distance<=tolerance&&(!best||distance<best.distance))best={delta,distance,target};
 }
 return best;
}
