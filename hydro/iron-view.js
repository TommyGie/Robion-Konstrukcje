import * as T from '../vendor/three.module.js';
import {IRON_PARTS,ironPorts} from './iron.js';
import {brassMaterial} from './brass-material.js';
import {fittingGeometry} from './ppr-solid.js';
let grain;
function castTexture(){if(grain)return grain;const a=new Uint8Array(128*128*4);let seed=1701;for(let i=0;i<a.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const v=100+(seed>>>24)%90;a[i]=a[i+1]=a[i+2]=v;a[i+3]=255;}grain=new T.DataTexture(a,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(2,2);grain.needsUpdate=true;return grain;}
export function ironMesh(e,selected=false,preview=false){
 const group=new T.Group(),part=IRON_PARTS[e.technical.catalogId],ps=ironPorts(e),d=e.technical.outerDiameter,L=e.geometry.length,black=e.technical.finish==='black';
 function material(machined=false){const m=brassMaterial(selected,preview);if(!preview){m.color.set(black?(machined?0x62676a:0x494e50):(machined?0xb5bdc2:0xa5adb1));m.metalness=black?.65:.85;m.roughness=machined?.3:black?.7:.52;m.envMapIntensity=.8;m.emissive.set(selected?0x18212a:0);if(!machined){m.bumpMap=castTexture();m.bumpScale=d*.012;}}return m;}
 function add(g,p=[0,0,0],dir=[0,1,0],machined=false){if(!g.attributes.uv){const v=g.attributes.position,uv=[];for(let i=0;i<v.count;i++)uv.push((v.getX(i)+v.getZ(i)*.73)/d,(v.getY(i)+v.getZ(i)*.41)/d);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));}const m=new T.Mesh(g,material(machined));m.position.fromArray(p);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...dir));m.userData.id=e.id;m.castShadow=true;group.add(m);return m;}
 function lathe(profile,p=[0,0,0],dir=[1,0,0],machined=false){return add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),64),p,dir,machined);}
 function shell(a,b,ra,rb,ia,ib){lathe([[ia,a],[ra,a],[rb,b],[ib,b],[ia,a]]);}
 function grip(x,width,r,inner,sides=6){const shape=new T.Shape();for(let i=0;i<sides;i++){const angle=i*Math.PI*2/sides;i?shape.lineTo(Math.cos(angle)*r,Math.sin(angle)*r):shape.moveTo(r,0);}shape.closePath();if(inner){const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);}const m=add(new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:d*.015,bevelThickness:d*.015,bevelSegments:2,steps:1}));m.rotation.set(0,Math.PI/2,0);m.position.set(x-width/2,0,0);}
 // Threads are a continuous cut profile, not a wire coil wrapped around a socket.
 function thread(p){const female=p.type==='thread-female',r=p.diameter/2,pitch=p.diameter<30?1.814:2.309,h=Math.min(p.diameter*.45,e.kind==='pipe'?L/3:p.diameter*.45),start=female?p.insertion-h:-h,end=female?p.insertion:0,segments=Math.ceil(h/pitch)*12,radial=64,positions=[],indices=[];
  for(let j=0;j<=segments;j++){const y=start+(end-start)*j/segments;for(let k=0;k<=radial;k++){const angle=k/radial*Math.PI*2,phase=((y-start)/pitch-k/radial)%1,tri=1-Math.abs(2*((phase+1)%1)-1),rr=female?r*.93+tri*pitch*.32:r-pitch*.5+tri*pitch*.5;positions.push(rr*Math.cos(angle),y,rr*Math.sin(angle));}}
  for(let j=0;j<segments;j++)for(let k=0;k<radial;k++){const a=j*(radial+1)+k,b=a+radial+1;indices.push(a,b,a+1,b,b+1,a+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const m=add(g,p.point,p.direction,true);m.material.side=T.DoubleSide;
 }
 function rim(p){const r=p.diameter/2,h=p.insertion,w=p.diameter*.18;lathe([[r*.93,h-w],[r*1.22,h-w],[r*1.34,h-w*.75],[r*1.34,h-w*.2],[r*1.29,h],[r*.96,h],[r*.93,h-w]],p.point,p.direction);}
 if(e.kind==='elbow'){
  const r=e.geometry.radius,R=r*.66,start=ps[0].point[0]-(ps[0].type==='thread-female'?ps[0].insertion:0),end=r+ps[1].insertion,bendStart=r-R,arc=R*Math.PI/2,total=bendStart-start+arc+end-R;
  const path=new T.Curve();path.getPoint=t=>{const s=t*total;if(s<bendStart-start)return new T.Vector3(start+s,0,0);if(s<bendStart-start+arc){const a=(s-(bendStart-start))/R;return new T.Vector3(bendStart+R*Math.sin(a),R*(1-Math.cos(a)),0);}return new T.Vector3(r,R+s-(bendStart-start+arc),0);};
  const frames=path.computeFrenetFrames(100,false),pos=[],idx=[];
  for(let side=0;side<2;side++)for(let j=0;j<=100;j++){const t=j/100,c=path.getPoint(t),male=ps[0].type==='thread-male',outer=male?d*(.465+.105*Math.min(1,Math.max(0,(t-.22)/.45))):d*.57,rr=side?d*(.39+.095*Math.max(ps[0].type==='thread-female'?Math.min(1,Math.max(0,(d*.60-t*total)/(d*.15))):0,Math.min(1,Math.max(0,(d*.60-(1-t)*total)/(d*.15))))):outer;for(let k=0;k<=48;k++){const a=k/48*Math.PI*2,v=c.clone().addScaledVector(frames.normals[j],rr*Math.cos(a)).addScaledVector(frames.binormals[j],rr*Math.sin(a));pos.push(...v.toArray());}}
  const offset=101*49;for(let side=0;side<2;side++)for(let j=0;j<100;j++)for(let k=0;k<48;k++){const a=side*offset+j*49+k,b=a+49;idx.push(...(side?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));}
  for(const j of [0,100])for(let k=0;k<48;k++){const a=j*49+k,b=a+offset;idx.push(a,a+1,b,b,a+1,b+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();add(g,[0,0,0]);
 }else if(['tee','cross'].includes(e.kind)){add(fittingGeometry(e));}
 else if(e.kind==='pipe'){const r=d/2,h=Math.min(d*.45,L/3);lathe([[r*.78,0],[r*.91,0],[r*.91,h],[r,h],[r,L-h],[r*.91,L-h],[r*.91,L],[r*.78,L],[r*.78,0]]);}
 else if(part.type==='bushing'){
  const small=ps[1].diameter;lathe([[small*.39,0],[d*.465,0],[d*.465,L*.65],[d*.56,L*.65],[d*.56,L+ps[1].insertion],[small*.465,L+ps[1].insertion],[small*.39,0]]);grip(L+ps[1].insertion-d*.12,d*.24,d*.66,small*.465);
 }else if(e.kind==='cap'){
  const female=ps[0].type==='thread-female',h=ps[0].insertion;
  if(female){lathe([[d*.465,-h],[d*.59,-h],[d*.59,d*.42],[0,d*.49],[0,d*.33],[d*.40,d*.27],[d*.465,-h]]);grip(d*.35,d*.17,d*.59,0,6);}else{lathe([[0,0],[d*.465,0],[d*.465,d*.36],[0,d*.36],[0,0]]);grip(d*.43,d*.25,d*.36,0,4);}
 }else if(part.union){
  const a=-ps[0].insertion,b=L+ps[1].insertion;lathe([[d*.485,a],[d*.56,a],[d*.56,L*.65],[d*(ps[1].type==='thread-male'?.465:.56),L*.8],[d*(ps[1].type==='thread-male'?.465:.56),b],[d*(ps[1].type==='thread-male'?.39:.485),b],[d*.39,L*.65],[d*.39,L*.2],[d*.485,a]]);grip(L*.5,d*.62,d*.86,d*.4);grip(L*.13,d*.28,d*.63,d*.4);if(ps[1].type==='thread-female')grip(L*.88,d*.28,d*.63,d*.4);
  // Two shoulders make the detachable union halves visible.
  for(const x of [L*.5-d*.34,L*.5+d*.34])lathe([[d*.55,x-d*.025],[d*.70,x-d*.025],[d*.70,x+d*.025],[d*.55,x+d*.025],[d*.55,x-d*.025]]);
 }else{const ra=ps[0].diameter,rb=ps[1].diameter,a=-ps[0].insertion,b=L+ps[1].insertion,oa=ra*(part.ends[0]==='male'?.465:.57),ob=rb*(part.ends[1]==='male'?.465:.57);lathe([[ra*(part.ends[0]==='female'?.485:.39),a],[oa,a],[oa,L*.36],[ob,L*.64],[ob,b],[rb*(part.ends[1]==='female'?.485:.39),b],[rb*(part.ends[1]==='female'?.485:.39),L*.8],[rb*.39,L*.6],[ra*.39,L*.4],[ra*(part.ends[0]==='female'?.485:.39),L*.2],[ra*(part.ends[0]==='female'?.485:.39),a]]);if(part.hex)grip(L*.5,d*.26,d*.64,Math.min(ra,rb)*.39);}
 for(const p of ps){thread(p);if(p.type==='thread-female'&&!part.union&&part.type!=='bushing')rim(p);}
 group.userData.id=e.id;group.position.fromArray(e.geometry.position);group.rotation.set(...e.geometry.rotation.map(n=>n*Math.PI/180));return group;
}
