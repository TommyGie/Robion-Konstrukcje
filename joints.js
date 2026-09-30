import * as THREE from './vendor/three.module.js?v=2026-09-30';
import {PROFILES,normalizeCut,validateElement,length,normalizeJoint} from './model.js?v=2026-09-30';
const v=a=>new THREE.Vector3(...a);
const same=(a,b)=>v(a).distanceTo(v(b))<1e-6;
export function sectionQuaternion(e){
 const z=v(e.b).sub(v(e.a)).normalize();
 if(!e.sectionX)return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),z);
 const x=v(e.sectionX).addScaledVector(z,-v(e.sectionX).dot(z)).normalize(),y=z.clone().cross(x);
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
export function cutAgainst(e,normal){
 const n=v(normal).applyQuaternion(sectionQuaternion(e).invert());
 if(Math.abs(n.z)<1e-5)throw Error('Ta płaszczyzna jest równoległa do osi profilu — nie tworzy cięcia końca.');
 const sx=-n.x/n.z,sy=-n.y/n.z;
 if(Math.abs(sx)>1e-6&&Math.abs(sy)>1e-6)throw Error('To ustawienie wymaga cięcia złożonego w dwóch płaszczyznach.');
 const s=Math.abs(sx)>Math.abs(sy)?sx:sy;
 return normalizeCut({angle:Math.atan2(1,Math.abs(s))*180/Math.PI,plane:Math.abs(sx)>Math.abs(sy)?'width':'height',flipped:s<0});
}
// Orient the square section so one face axis is normal to the joint plane.
function orient(e,binormal){
 const z=v(e.b).sub(v(e.a)).normalize(),old=new THREE.Vector3(1,0,0).applyQuaternion(sectionQuaternion(e));
 const candidates=[binormal.clone(),z.clone().cross(binormal).normalize()];candidates.push(...candidates.map(c=>c.clone().negate()));
 candidates.sort((a,b)=>b.dot(old)-a.dot(old));e.sectionX=candidates[0].toArray();
}
function endCorners(e,end,inset){
 const p=PROFILES[e.profile],q=sectionQuaternion(e),c=e.cuts[end],s=(c.flipped?-1:1)/Math.tan(c.angle*Math.PI/180);
 return [-1,1].flatMap(i=>[-1,1].map(k=>{const x=i*(p.w/2-inset),y=k*(p.h/2-inset);return new THREE.Vector3(x,y,(end==='b'?length(e):0)+s*(c.plane==='width'?x:y)).applyQuaternion(q).add(v(e.a));}));
}
export function solveJoints(before,next){
 const result=structuredClone(next),elements=new Map(result.elements.map(e=>[e.id,e]));
 const joints=(result.joints??[]).map(normalizeJoint),planes=[];
 if(result.joints)result.joints=joints;
 // A moved node moves the connected endpoint too, without moving its other end.
 for(const j of joints){const refs=[j.first,j.second],pair=refs.map(r=>elements.get(r.id));if(pair.some(e=>!e))throw Error('Odłącz połączenie przed usunięciem profilu.');
  const moved=refs.map((r,i)=>{const old=before.elements.find(e=>e.id===r.id);return old&&!same(old[r.end],pair[i][r.end]);});
  if(!same(pair[0][refs[0].end],pair[1][refs[1].end])){
   if(moved[0]&&!moved[1])pair[1][refs[1].end]=[...pair[0][refs[0].end]];
   else if(moved[1]&&!moved[0])pair[0][refs[0].end]=[...pair[1][refs[1].end]];
   else throw Error('Końce osi muszą spotykać się. Ustaw je w tym samym punkcie przed połączeniem.');
  }
 }
 for(const j of joints){const refs=[j.first,j.second],pair=refs.map(r=>elements.get(r.id));
  if(pair[0].profile!==pair[1].profile||PROFILES[pair[0].profile].w!==PROFILES[pair[0].profile].h)throw Error('Wspólny skos wymaga obecnie jednakowych profili kwadratowych. Różne przekroje wymagają podcięcia.');
  const rays=refs.map((r,i)=>v(pair[i][r.end==='a'?'b':'a']).sub(v(pair[i][r.end])).normalize());
  if(Math.abs(rays[0].dot(rays[1]))>.995)throw Error('Kąt połączenia jest zbyt mały lub profile są współliniowe.');
  const binormal=rays[0].clone().cross(rays[1]).normalize();pair.forEach(e=>orient(e,binormal));
  planes.push({j,normal:rays[0].clone().sub(rays[1]).normalize().toArray()});
 }
 for(const {j,normal} of planes)for(const ref of [j.first,j.second]){const e=elements.get(ref.id);if(ref.end==='a'&&e.baseAlignment&&e.baseAlignment!=='local')throw Error('Koniec A ma wyrównanie do płaszczyzny. Wybierz „Zachowaj kąt względem profilu” przed połączeniem.');e.cuts[ref.end]=cutAgainst(e,normal);}
 // Check both outer and hollow boundaries: a common plane alone cannot guarantee closure.
 for(const {j} of planes){const a=elements.get(j.first.id),b=elements.get(j.second.id);for(const inset of [0,PROFILES[a.profile].t]){const ac=endCorners(a,j.first.end,inset),bc=endCorners(b,j.second.end,inset);if(ac.some(c=>!bc.some(d=>c.distanceTo(d)<1e-5)))throw Error('Te połączenia wymagają sprzecznych obrotów przekroju. Potrzebne podcięcie lub połączenie złożone; zmiana nie została przyjęta.');}}
 for(const e of result.elements)if(e.baseAlignment&&e.baseAlignment!=='local')e.cuts.a=cutAgainst(e,e.baseAlignment==='horizontal'?[0,1,0]:e.baseAlignment==='verticalX'?[1,0,0]:[0,0,1]);
 result.elements=result.elements.map(validateElement);return result;
}
