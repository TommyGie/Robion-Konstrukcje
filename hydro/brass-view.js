import {IRON_PARTS,ironPorts} from './iron.js';
import * as T from '../vendor/three.module.js';
import {brassPorts,BRASS_PARTS} from './brass.js';
import {fittingGeometry} from './ppr-solid.js';
import {brassMaterial} from './brass-material.js';
export function brassMesh(e,selected=false,preview=false){
 const group=new T.Group(),part=(e.technical.family==='iron'?IRON_PARTS:BRASS_PARTS)[e.technical.catalogId],d=e.technical.outerDiameter;
 const material=()=>brassMaterial(selected,preview);
 function add(g,p=[0,0,0],dir=[0,1,0]){const m=new T.Mesh(g,material());m.position.fromArray(p);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...dir));m.userData.id=e.id;m.castShadow=true;group.add(m);return m;}
 if(e.kind==='pipe'){const r=d/2,L=e.geometry.length,h=Math.min(d*.55,L/3);add(new T.LatheGeometry([[r*.68,0],[r*.86,0],[r*.86,h],[r,h],[r,L-h],[r*.86,L-h],[r*.86,L],[r*.68,L],[r*.68,0]].map(v=>new T.Vector2(...v)),48),[0,0,0],[1,0,0]);}else add(fittingGeometry(e));
 for(const port of (e.technical.family==='iron'?ironPorts(e):brassPorts(e))){
  const r=port.diameter/2,h=port.insertion,inner=port.type==='thread-female',start=inner?h-d*.28:-d*.55,end=h,outer=inner?r*1.42:r;
  const profile=[[r*.7,start],[outer,start],[outer,end],[inner?r*.86:r*.7,end],[inner?r*.86:r*.7,start]];
  add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),48),port.point,port.direction);
  const curve=new T.Curve();curve.getPoint=t=>new T.Vector3((inner?r*.86:r)*Math.cos(t*Math.PI*12),start+t*(end-start-.5),(inner?r*.86:r)*Math.sin(t*Math.PI*12));
  add(new T.TubeGeometry(curve,120,.4,6,false),port.point,port.direction);
 }
 if(part.hex||part.union){
  // A through-bored hexagonal grip; the cap/plug's closed back is in the body mesh.
  const x=e.kind==='cap'?d*.12:e.geometry.length*.5,width=d*(part.union?.65:.23),outer=d*(part.union?.9:.68),inner=d*.32;
  const shape=new T.Shape();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?shape.lineTo(Math.cos(a)*outer,Math.sin(a)*outer):shape.moveTo(outer,0);}shape.closePath();const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
  const m=add(new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.5,bevelThickness:.5,bevelSegments:1,steps:1}));m.rotation.set(0,Math.PI/2,0);m.position.set(x-width/2,0,0);
 }
 group.userData.id=e.id;group.position.fromArray(e.geometry.position);group.rotation.set(...e.geometry.rotation.map(n=>n*Math.PI/180));return group;
}
