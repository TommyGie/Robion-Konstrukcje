import * as T from '../vendor/three.module.js';
import {pexPorts,PEX_PARTS} from './pex.js';
import {brassMaterial} from './brass-material.js';
export function pexMesh(e,selected=false,preview=false){
 const group=new T.Group(),d=e.technical.outerDiameter,ps=pexPorts(e),part=PEX_PARTS[e.technical.catalogId];
 const brass=()=>brassMaterial(selected,preview);
 const steel=()=>{const m=brass();m.color.set(preview?0x2db991:0xdbe2e7);m.roughness=.29;return m;};
 const plastic=()=>new T.MeshStandardMaterial({color:preview?0x2db991:selected?0xffe7ba:0xf1f0e9,roughness:.4,transparent:preview,opacity:preview?.65:1,side:T.DoubleSide});
 function add(g,point,dir,mat){const m=new T.Mesh(g,mat);m.position.fromArray(point);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...dir));m.userData.id=e.id;m.castShadow=true;group.add(m);return m;}
 function tube(point,dir,start,end,outer,inner,mat,segments=48){return add(new T.LatheGeometry([[inner,start],[outer,start],[outer,end],[inner,end],[inner,start]].map(p=>new T.Vector2(...p)),segments),point,dir,mat);}
 if(e.kind==='pipe')tube([0,0,0],[1,0,0],0,e.geometry.length,d/2,d/2-e.technical.wallThickness,plastic());
 else{
 const joint=e.kind==='elbow'||e.kind==='tee'?[e.geometry.radius,0,0]:[e.geometry.length/2,0,0];
 for(const p of ps){const length=Math.hypot(...p.point.map((n,i)=>n-joint[i]));tube(p.point,p.direction,-length,0,p.diameter*.4,p.diameter*.28,brass());
 if(p.type.startsWith('thread')){
 const female=p.type==='thread-female',r=p.diameter/2,start=-d*.45,end=p.insertion;
 tube(p.point,p.direction,start,end,female?r*1.3:r,female?r*.86:r*.65,brass());
 const curve=new T.Curve();curve.getPoint=t=>new T.Vector3((female?r*.86:r)*Math.cos(t*Math.PI*12),start+t*(end-start),(female?r*.86:r)*Math.sin(t*Math.PI*12));add(new T.TubeGeometry(curve,120,.35,6,false),p.point,p.direction,brass());
 }else{
 const h=p.insertion,r=p.diameter/2;
 // Steel sleeve surrounds the pipe; brass support spigot runs inside it.
 tube(p.point,p.direction,-d*.08,h,r*.72,r*.52,brass());
 tube(p.point,p.direction,0,h,r*1.12,r*1.01,part.compression?brass():steel(),part.compression?6:64);
 const ring=plastic();ring.color.set(preview?0x2db991:0x354b58);tube(p.point,p.direction,-d*.1,d*.05,r*1.16,r*.74,ring);
 if(!part.compression)for(const y of [h*.22,h*.78])tube(p.point,p.direction,y,y+.5,r*1.135,r*1.11,steel());
 }
 }
 }
 group.userData.id=e.id;group.position.fromArray(e.geometry.position);group.rotation.set(...e.geometry.rotation.map(n=>n*Math.PI/180));return group;
}
