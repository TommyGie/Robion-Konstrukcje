import {brassMaterial} from './brass-material.js';
import {fittingGeometry} from './ppr-solid.js';
import * as T from '../vendor/three.module.js';
import {pprPorts,PPR_PARTS} from './ppr.js';
const V=p=>new T.Vector3(...p);
// Hollow sockets and pipe walls are visual approximations; no PN/SDR is implied.
export function pprMesh(e,selected=false,preview=false){
 const group=new T.Group(),d=e.technical.outerDiameter,ps=pprPorts(e);
 const material=()=>new T.MeshStandardMaterial({color:preview?0x2db991:selected?0xe4d6b9:0xe1e3e2,roughness:.38,metalness:0,side:T.DoubleSide,transparent:preview,opacity:preview?.65:1});
 function add(geometry,position=[0,0,0]){const mesh=new T.Mesh(geometry,material());mesh.position.fromArray(position);mesh.userData.id=e.id;mesh.castShadow=true;mesh.receiveShadow=false;group.add(mesh);return mesh;}
 function cylinder(a,b,r){const av=V(a),bv=V(b),m=add(new T.CylinderGeometry(r,r,av.distanceTo(bv),24));m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;}
 function sleeve(point,dir,outer,inner,start,end){const profile=[[inner,start],[outer,start],[outer,end-.7],[outer-.5,end],[inner,end],[inner,start]].map(p=>new T.Vector2(...p));const mesh=add(new T.LatheGeometry(profile,32),point);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),V(dir));}
 if(e.kind==='pipe'){
  sleeve([0,0,0],[1,0,0],d/2,d*.35,0,e.geometry.length);
  // Discreet longitudinal green identification stripe.
  const stripe=add(new T.BoxGeometry(e.geometry.length,.45,d*.045),[e.geometry.length/2,d/2,0]);stripe.material.color.set(0x338478);
 }else{
  const q=e.technical.outletDiameter/d,L=ps[1]?.point[0]/d;
  const lathe=profile=>{const mesh=add(new T.LatheGeometry(profile.map(([r,x])=>new T.Vector2(r*d,x*d)),64));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(1,0,0));return mesh;};
  if(['coupling','reducer','valve'].includes(e.kind)&&!PPR_PARTS[e.technical.catalogId]?.thread){
   const length=L+.6*q,outer=e.kind==='valve'?[[.72,-.6],[.72,-.08],[.73,.15],[.86,L*.35],[.88,L*.5],[.86,L*.65],[.73,L-.15],[.72,L+.08],[.72,length-.025]]:e.kind==='reducer'?[[.72,-.6],[.72,L*.32],[.72*q,L*.72],[.72*q,length-.025]]:[[.72,-.6],[.72,length-.025]];
   lathe([[.51,-.6],[.69,-.6],[.72,-.575],...outer.slice(1),[.7*q,length],[.51*q,length],[.5*q,length-.02],[.5*q,L],[.34*q,L-.02],[.34,.02],[.5,0],[.5,-.58],[.51,-.6]]);
  }else if(e.kind==='cap')lathe([[.51,-.6],[.69,-.6],[.72,-.57],[.72,.06],[.70,.14],[.63,.21],[.5,.25],[0,.27],[0,.035],[.46,.035],[.5,0],[.5,-.58],[.51,-.6]]);
  else{
   add(fittingGeometry(e));
   for(const p of ps){if(p.type!=='socket'){
 const r=p.diameter,thread=p.type.startsWith('thread'),outer=r*.5,inner=r*(p.type==='thread-female'?.43:.34);
 const start=thread?-d*.55:-d*.25;
 const profile=[[inner,start],[outer,start],[outer,0],[inner,0],[inner,start]].map(v=>new T.Vector2(...v));
 const end=add(new T.LatheGeometry(profile,48),p.point);end.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),V(p.direction));
 if(thread){end.material.dispose();end.material=brassMaterial(selected,preview);
 const helix=new T.Curve();helix.getPoint=t=>new T.Vector3((p.type==='thread-female'?inner:outer)*Math.cos(t*Math.PI*12),start+t*(-start-.8),(p.type==='thread-female'?inner:outer)*Math.sin(t*Math.PI*12));
 const ridge=add(new T.TubeGeometry(helix,144,.45,6,false),p.point);ridge.quaternion.copy(end.quaternion);ridge.material.copy(end.material);}
 continue;}const h=p.insertion,r=p.diameter;const profile=[[.72*r,h-.3*d],[.72*r,h-.025*r],[.71*r,h-.008*r],[.695*r,h],[.51*r,h],[.5*r,h-.02*r],[.5*r,h-.3*d]].map(v=>new T.Vector2(...v));const rim=add(new T.LatheGeometry(profile,64),p.point);rim.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),V(p.direction));}
  }
  if(e.kind==='valve'){
   const center=ps[1].point[0]/2;cylinder([center,d*.55,0],[center,d*1.12,0],d*.2);
   const handle=new T.Shape();handle.moveTo(-d*.35,-d*.22);handle.lineTo(d*1.8,-d*.18);handle.quadraticCurveTo(d*2,-d*.18,d*2,0);handle.quadraticCurveTo(d*2,d*.18,d*1.8,d*.18);handle.lineTo(-d*.35,d*.22);handle.quadraticCurveTo(-d*.6,0,-d*.35,-d*.22);
   const lever=add(new T.ExtrudeGeometry(handle,{depth:d*.13,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:d*.035,bevelThickness:d*.025}),[center,d*1.12,0]);lever.rotation.x=-Math.PI/2;lever.material.color.set(0xd9dcda);
   const screw=cylinder([center,d*1.2,0],[center,d*1.29,0],d*.12);screw.material.color.set(0xbf292b);
  }
 }

 group.userData.id=e.id;group.position.fromArray(e.geometry.position);group.rotation.set(...e.geometry.rotation.map(n=>n*Math.PI/180));return group;
}
