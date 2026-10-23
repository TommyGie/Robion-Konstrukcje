import {fittingGeometry} from './ppr-solid.js';
import * as T from '../vendor/three.module.js';
import {copperPorts} from './copper.js';
import {brassMaterial} from './brass-material.js';
export function copperMesh(e,selected=false,preview=false,options={}){
 const group=new T.Group(),d=e.technical.outerDiameter,ps=options.ports??copperPorts(e);
 function material(thread=false){const m=brassMaterial(selected,preview);if(!preview)m.color.set(thread?0xdca16b:0xe6a080);m.roughness=.34;m.envMapIntensity=.58;return m;}
 function add(g,point=[0,0,0],dir=[0,1,0],thread=false){const m=new T.Mesh(g,material(thread));m.position.fromArray(point);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...dir));m.userData.id=e.id;m.castShadow=true;group.add(m);return m;}
 // Rounded wall lips and eased shoulders imitate formed copper, not stacked sleeves.
 function lip(profile,outer,inner,y,sign=1){
  const mid=(outer+inner)/2,r=(outer-inner)/2;
  for(let i=0;i<=12;i++){const a=i*Math.PI/12;profile.push([mid+r*Math.cos(a),y+sign*r*Math.sin(a)]);}
 }
 function tube(p,dir,start,end,outer,inner,thread=false){
  const h=(outer-inner)/2,profile=[[outer,start+h],[outer,end-h]];
  lip(profile,outer,inner,end-h);profile.push([inner,start+h]);
  const back=[];lip(back,outer,inner,start+h,-1);profile.push(...back.reverse(),profile[0]);
  add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),64),p,dir,thread);
 }
 function socket(p){
  const r=p.diameter/2,outer=r+1.2,inner=r+.08,shoulder=Math.min(4,p.insertion*.3),profile=[];
  for(let i=0;i<=16;i++){const t=i/16,k=t*t*(3-2*t);profile.push([r+1.2*k,shoulder*t]);}
  lip(profile,outer,inner,p.insertion-(outer-inner)/2);
  for(let i=16;i>=0;i--){const t=i/16,k=t*t*(3-2*t);profile.push([r-1+1.08*k,shoulder*t]);}
  profile.push(profile[0]);add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),64),p.point,p.direction);
 }
 if(e.kind==='pipe')tube([0,0,0],[1,0,0],0,e.geometry.length,d/2,d/2-(e.technical.wallThickness??1));
 else if(e.technical.catalogId==='copper-coupling'){
  tube([0,0,0],[1,0,0],-ps[0].insertion,e.geometry.length+ps[1].insertion,d/2+1.2,d/2+.08);
  // An internal pipe stop; the outside stays cylindrical.
  tube([0,0,0],[1,0,0],e.geometry.length/2-.5,e.geometry.length/2+.5,d/2+.08,d/2-.35);
 }else if(e.kind==='tee'){
  add(fittingGeometry(e));
 }else if(['elbow','elbow45'].includes(e.kind)){
  const r=e.geometry.radius,a=e.kind==='elbow45'?Math.PI/4:Math.PI/2,curve=new T.Curve();curve.getPoint=t=>new T.Vector3(r*Math.sin(t*a),r*(1-Math.cos(t*a)),0);
  for(const radius of [d/2,d/2-1])add(new T.TubeGeometry(curve,48,radius,48,false));
  const tail=e.technical.pressTail??(e.technical.shapeVersion>=3&&e.technical.catalogId==='copper-street45'?d*.75:0);
  if(tail){const profile=[[d/2,0]];lip(profile,d/2,d/2-1,tail-.5);profile.push([d/2-1,0]);add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),64),[r*Math.sin(a),r*(1-Math.cos(a)),0],ps[1].direction);}
 }else if(e.kind==='reducer'&&e.technical.shapeVersion>=3){
  const l=e.geometry.length,spigot=ps[0].type==='cu-spigot',a=d/2+(spigot?0:1.2),ai=d/2+(spigot?-1:.08),b=ps[1].diameter/2+1.2,bi=ps[1].diameter/2+.08,start=-ps[0].insertion,end=l+ps[1].insertion,profile=[];
  profile.push([a,start+.5],[a,l*.25]);
  for(let i=1;i<=24;i++){const t=i/24,k=t*t*(3-2*t);profile.push([a+(b-a)*k,l*(.25+.65*t)]);}
  lip(profile,b,bi,end-(b-bi)/2);profile.push([bi,l*.9]);
  for(let i=24;i>=0;i--){const t=i/24,k=t*t*(3-2*t);profile.push([ai+(bi-ai)*k,l*(.25+.65*t)]);}
  profile.push([ai,start+.5]);const back=[];lip(back,a,ai,start+.5,-1);profile.push(...back.reverse(),profile[0]);
  add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),64),[0,0,0],[1,0,0]);
 }else if(e.kind==='reducer'){
  const l=e.geometry.length,a=d/2,b=e.technical.outletDiameter/2;
  const profile=[[a-1,0],[a,0],[a,l*.3],[b,l*.7],[b,l],[b-1,l],[b-1,l*.7],[a-1,l*.3],[a-1,0]];
  add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),64),[0,0,0],[1,0,0]);
 }else if(e.kind==='cap'){
  tube(ps[0].point,ps[0].direction,-d*.65,0,d/2+1,d/2);
  add(new T.CylinderGeometry(d/2+1,d/2+1,1.2,64),[d*.65,0,0],[1,0,0]);
 }else{
  const joint=e.kind==='tee'?[e.geometry.radius,0,0]:[e.geometry.length/2,0,0];
  for(const p of ps){const len=Math.hypot(...p.point.map((v,i)=>v-joint[i])),r=p.type.startsWith('thread')?d/2:p.diameter/2;
   tube(p.point,p.direction,-len,0,r,r-1);
  }
 }
 for(const p of ps){const r=p.diameter/2;
  if(options.press&&p.type==='cu-press'){
   const h=p.insertion,outer=r+1.3,inner=r+.08,profile=[[r,0]];
   for(let i=0;i<=64;i++){const y=h*i/64,shoulder=Math.min(1,y/3),k=shoulder*shoulder*(3-2*shoulder),bead=1.8*Math.exp(-Math.pow((y-h*.76)/1.7,2));profile.push([r+1.3*k+bead,y]);}
   lip(profile,outer,inner,h);profile.push([inner,3],[r-1,0],profile[0]);
   add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),64),p.point,p.direction);
   const seal=new T.Mesh(new T.TorusGeometry(r+.1,.65,12,64),new T.MeshStandardMaterial({color:preview?0x2db991:0x292b28,roughness:.8,transparent:preview,opacity:preview?.65:1}));seal.position.fromArray(p.point.map((v,i)=>v+p.direction[i]*h*.76));seal.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...p.direction));seal.userData.id=e.id;group.add(seal);
  }
  if(p.type==='cu-socket'&&e.kind!=='tee'&&!(e.kind==='reducer'&&e.technical.shapeVersion>=3)&&e.technical.catalogId!=='copper-coupling')socket(p);
  if(p.type.startsWith('thread')){
   const female=p.type==='thread-female',start=-d*.35,end=female?p.insertion:0;
   tube(p.point,p.direction,start,end,female?r+2:r,female?r-.8:r-2,true);
   const curve=new T.Curve();curve.getPoint=t=>new T.Vector3((female?r-.8:r)*Math.cos(t*Math.PI*12),start+t*(end-start),(female?r-.8:r)*Math.sin(t*Math.PI*12));add(new T.TubeGeometry(curve,144,.35,6,false),p.point,p.direction,true);
  }
 }
 group.userData.id=e.id;group.position.fromArray(e.geometry.position);group.rotation.set(...e.geometry.rotation.map(n=>n*Math.PI/180));return group;
}
