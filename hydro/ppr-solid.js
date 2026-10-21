import * as T from '../vendor/three.module.js?v=2026-10-21';
import {pprPorts} from './ppr.js?v=2026-10-21';
const smoothMin=(a,b,k=.08)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
function cylinder(a,b,r,round=.025){
 const v=b.map((n,i)=>n-a[i]),length=Math.hypot(...v),u=v.map(n=>n/length),c=a.map((n,i)=>(n+b[i])/2);
 return (x,y,z)=>{const p=[x-c[0],y-c[1],z-c[2]],along=p[0]*u[0]+p[1]*u[1]+p[2]*u[2],radial=Math.sqrt(Math.max(0,p[0]**2+p[1]**2+p[2]**2-along**2));const q=radial-r+round,t=Math.abs(along)-length/2+round;return Math.min(Math.max(q,t),0)+Math.hypot(Math.max(q,0),Math.max(t,0))-round;};
}
export function fittingField(e){
 const d=e.technical.outerDiameter,ps=pprPorts(e).map(p=>({...p,point:p.point.map(n=>n/d),diameter:p.diameter/d,insertion:p.insertion/d}));
 const r=e.geometry.radius/d,last=ps.at(-1);let joint;
 if(e.kind==='elbow')joint=[r,0,0];else if(e.kind==='elbow45')joint=[r*Math.tan(Math.PI/8),0,0];else if(e.kind==='tee')joint=[r,0,0];else if(e.kind==='cap')joint=[.24,0,0];else joint=ps[1].point.map(n=>n/2);
 const outer=[],inner=[];
 for(const p of ps){const lip=p.point.map((n,i)=>n+p.direction[i]*p.insertion);outer.push(cylinder(joint,lip,.72*p.diameter,e.kind==='cap'?.09:.025));
  if(e.kind!=='cap')inner.push(cylinder(joint,p.point.map((n,i)=>n+p.direction[i]*.1),.34*p.diameter,.015));
  inner.push(cylinder(p.point.map((n,i)=>n-p.direction[i]*.015),lip.map((n,i)=>n+p.direction[i]*.12),.5*p.diameter,.008));
 }
 if(['elbow','elbow45'].includes(e.kind)){outer.push((x,y,z)=>Math.hypot(x-joint[0],y-joint[1],z)-.72);inner.push((x,y,z)=>Math.hypot(x-joint[0],y-joint[1],z)-.34);}
 if(e.kind==='valve'){const c=joint;outer.push((x,y,z)=>Math.hypot((x-c[0])*.9,(y-c[1]),z)-.88);}
 const field=(x,y,z)=>{let body=Infinity,hole=Infinity;for(const f of outer)body=smoothMin(body,f(x,y,z));for(const f of inner)hole=smoothMin(hole,f(x,y,z),.035);return Math.max(body,-hole);};
 const points=ps.map(p=>p.point.map((n,i)=>n+p.direction[i]*p.insertion));points.push(joint);
 const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))-1.05),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))+1.05);
 return {field,min,max};
}
const cache=new Map();
// Polygonize a hollow union, so branch intersections have no internal end caps.
export function fittingGeometry(e){
 const key=[e.kind,e.geometry.radius/e.technical.outerDiameter,e.technical.outletDiameter/e.technical.outerDiameter,e.technical.shapeVersion??1].join(':');
 if(cache.has(key))return cache.get(key).clone().scale(e.technical.outerDiameter,e.technical.outerDiameter,e.technical.outerDiameter);
 const data=fittingField(e),min=data.min,max=data.max,ps=pprPorts(e).map(p=>({...p,point:p.point.map(n=>n/e.technical.outerDiameter),insertion:p.insertion/e.technical.outerDiameter})),field=(x,y,z)=>{let value=data.field(x,y,z);for(const p of ps)value=Math.max(value,(x-p.point[0])*p.direction[0]+(y-p.point[1])*p.direction[1]+z*p.direction[2]-p.insertion+.16);return value;},step=.065,n=min.map((v,i)=>Math.ceil((max[i]-v)/step)),nx=n[0]+1,ny=n[1]+1;
 const idx=(x,y,z)=>x+nx*(y+ny*z),values=new Float32Array(nx*ny*(n[2]+1));
 for(let z=0;z<=n[2];z++)for(let y=0;y<=n[1];y++)for(let x=0;x<=n[0];x++)values[idx(x,y,z)]=field(min[0]+x*step,min[1]+y*step,min[2]+z*step);
 const offsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],positions=[],normals=[];
 const normal=p=>{const h=.003;return new T.Vector3(field(p.x+h,p.y,p.z)-field(p.x-h,p.y,p.z),field(p.x,p.y+h,p.z)-field(p.x,p.y-h,p.z),field(p.x,p.y,p.z+h)-field(p.x,p.y,p.z-h)).normalize();};
 for(let z=0;z<n[2];z++)for(let y=0;y<n[1];y++)for(let x=0;x<n[0];x++){
  const vs=offsets.map(o=>values[idx(x+o[0],y+o[1],z+o[2])]);if(vs.every(v=>v>0)||vs.every(v=>v<=0))continue;
  const points=offsets.map(o=>new T.Vector3(min[0]+(x+o[0])*step,min[1]+(y+o[1])*step,min[2]+(z+o[2])*step));
  for(const tet of tets){const cut=[];for(const [i,j] of edges){const a=tet[i],b=tet[j];if((vs[a]>0)===(vs[b]>0))continue;cut.push(points[a].clone().lerp(points[b],vs[a]/(vs[a]-vs[b])));}if(cut.length<3)continue;
   const center=cut.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(1/cut.length),up=normal(center),u=cut[0].clone().sub(center).normalize(),v=up.clone().cross(u);cut.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));
   for(let i=1;i<cut.length-1;i++)for(const p of [cut[0],cut[i],cut[i+1]]){positions.push(p.x,p.y,p.z);const q=normal(p);normals.push(q.x,q.y,q.z);}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));cache.set(key,geometry);return geometry.clone().scale(e.technical.outerDiameter,e.technical.outerDiameter,e.technical.outerDiameter);
}
