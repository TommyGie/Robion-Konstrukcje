import {retailAllowed} from './retail.js';
import {PEX_PARTS,PEX_SIZES,pexThreads,pexOutlets,pexMarketThreads,pexMarketOutlets,pexMarketAvailable} from './pex.js';
import {BRASS_PARTS,brassOutlets} from './brass.js';
import {PPR_PARTS,PPR_SIZES,threadSizes} from './ppr.js';
import {Vector3,Matrix4,Euler,Quaternion} from '../vendor/three.module.js';
import {clone,element,endpoints,portDirection,ports,portCompatibility,validate} from './model.js';
const vec=p=>new Vector3(...p),sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
export function occupied(p,id,port){return (p.connections??[]).some(c=>[c.a,c.b].some(r=>r.id===id&&r.port===port));}
export function attachment(p,id,port,kind,turn=0,length=1000,threadSize,outletThread){
 const source=p.elements.find(e=>e.id===id);if(!source)throw Error('Wybierz element.');if(occupied(p,id,port))throw Error('Ten koniec jest już połączony.');
 const sourcePort=ports(source)[port];let next;
 if(PEX_PARTS[kind]){const d=sourcePort.threadSize?PEX_SIZES.find(n=>pexMarketThreads(kind,n).includes(sourcePort.threadSize)):sourcePort.diameter;if(!d)throw Error('Brak zgodnego przejścia PEX.');next=element(kind,[0,0,0],d,typeof outletThread==='number'?outletThread:pexMarketOutlets(d).at(-1),sourcePort.threadSize??threadSize??pexMarketThreads(kind,d)[0]);if(!pexMarketAvailable(kind,d,next.technical.outletDiameter,next.technical.threadSize))throw Error('Wybierz inny rozmiar części.');if(next.kind==='pipe')next.geometry.length=length;}
 else if(BRASS_PARTS[kind]){if(!sourcePort.threadSize)throw Error('Mosiądz wymaga przyłącza gwintowanego.');next=element(kind,[0,0,0],sourcePort.threadSize,outletThread??brassOutlets(sourcePort.threadSize).at(-1));}
 else {let d=sourcePort.type.startsWith('thread')?source.technical.outerDiameter:sourcePort.diameter;
 if(sourcePort.threadSize&&PPR_PARTS[kind])d=PPR_SIZES.find(size=>threadSizes(kind,size).includes(sourcePort.threadSize)&&retailAllowed(kind,size,sourcePort.threadSize));
 if(d===undefined)throw Error('Brak zgodnego przejścia PP-R.');
 next=element(kind,[0,0,0],d,d>20?({25:20,32:25,40:32,50:40,63:50}[d]):20,sourcePort.threadSize??threadSize??threadSizes(kind,d).find(t=>retailAllowed(kind,d,t)));if(source.technical.family==='generic'){next.technical=clone(source.technical);next.geometry.radius=Math.max(100,next.technical.outerDiameter);}next.geometry.length=length;}

 if(!retailAllowed(kind,next.technical.family==='brass'?next.technical.threadSize:next.technical.outerDiameter,next.technical.threadSize))throw Error('Wybierz inny rozmiar części.');
 const target=ports(next).findIndex((_,i)=>!portCompatibility(source,port,next,i));if(target<0)throw Error(portCompatibility(source,port,next,0));
 const x=vec(portDirection(source,port));let y=vec(portDirection(source,port===0&&ports(source).length>1?1:0));
 if(Math.abs(x.dot(y))>.99)y=Math.abs(x.y)<.9?new Vector3(0,1,0):new Vector3(0,0,1);
 y.addScaledVector(x,-y.dot(x)).normalize().applyAxisAngle(x,turn*Math.PI/2);
 const z=x.clone().cross(y).normalize(),euler=new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z).multiply(new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(vec(portDirection(next,target)),new Vector3(-1,0,0)))),'XYZ');next.geometry.rotation=[euler.x,euler.y,euler.z].map(n=>Math.round(n*180/Math.PI*1e9)/1e9||0);
 const offset=endpoints(next)[target];next.geometry.position=endpoints(source)[port].map((n,i)=>n-offset[i]);
 const result=clone(p);result.elements.push(next);result.connections??=[];result.connections.push({a:{id,port},b:{id:next.id,port:target}});validate(result);return next;
}
export function attach(p,id,port,kind,turn,length,threadSize,outletThread){const next=attachment(p,id,port,kind,turn,length,threadSize,outletThread),result=clone(p);const source=p.elements.find(e=>e.id===id),target=ports(next).findIndex((_,i)=>!portCompatibility(source,port,next,i)&&Math.hypot(...endpoints(next)[i].map((n,j)=>n-endpoints(source)[port][j]))<1e-4);result.elements.push(next);result.connections??=[];result.connections.push({a:{id,port},b:{id:next.id,port:target}});return {project:validate(result),id:next.id};}
export function removeConnections(p){const ids=new Set(p.elements.map(e=>e.id));p.connections=(p.connections??[]).filter(c=>ids.has(c.a.id)&&ids.has(c.b.id));return p;}
export function editConnected(before,next,id){
 removeConnections(next);const old=before.elements.find(e=>e.id===id),edited=next.elements.find(e=>e.id===id);if(!old||!edited)return validate(next);
 const links=next.connections.filter(c=>c.a.id===id||c.b.id===id);
 if(JSON.stringify(old.geometry)===JSON.stringify(edited.geometry))return validate(next);
 if(old.kind==='pipe'){
  // Moving a pipe end carries its attached branch; a loop is rejected by validation.
  const moved=new Set([id]);for(const link of links){const own=link.a.id===id?link.a:link.b,other=link.a.id===id?link.b:link.a;const delta=sub(endpoints(edited)[own.port],endpoints(old)[own.port]);const queue=[other.id];while(queue.length){const current=queue.shift();if(moved.has(current))continue;moved.add(current);const e=next.elements.find(e=>e.id===current);e.geometry.position=e.geometry.position.map((n,i)=>n+delta[i]);for(const c of next.connections){if(c.a.id===current)queue.push(c.b.id);if(c.b.id===current)queue.push(c.a.id);}}}
 }else{
  for(const link of links){const own=link.a.id===id?link.a:link.b,other=link.a.id===id?link.b:link.a,pipe=next.elements.find(e=>e.id===other.id);if(pipe.kind!=='pipe')throw Error('Połączone kolanka: najpierw odłącz element.');
   const axis=portDirection(pipe,1),target=endpoints(edited)[own.port],ends=endpoints(pipe),delta=sub(target,ends[other.port]),axial=dot(delta,axis),side=delta.map((n,i)=>n-axial*axis[i]);
   if(Math.hypot(...side)>1e-4&&occupied(next,pipe.id,1-other.port))throw Error('Drugi koniec rury jest zamocowany. Przesuń kolanko wzdłuż osi albo odłącz połączenie.');
   pipe.geometry.position=pipe.geometry.position.map((n,i)=>n+side[i]+(other.port===0?axial*axis[i]:0));pipe.geometry.length+=other.port===0?-axial:axial;
  }
 }
 return validate(next);
}

export function connectedIds(p,id){
 const ids=new Set([id]),queue=[id];
 while(queue.length){const current=queue.shift();for(const c of p.connections??[]){const other=c.a.id===current?c.b.id:c.b.id===current?c.a.id:null;if(other&&!ids.has(other)){ids.add(other);queue.push(other);}}}
 return ids;
}
export function joinProblem(p,a,b){
 const x=p.elements.find(e=>e.id===a.id),y=p.elements.find(e=>e.id===b.id);
 if(!x||!y||!ports(x)[a.port]||!ports(y)[b.port])return 'Wybierz dwa końce elementów.';
 if(occupied(p,a.id,a.port)||occupied(p,b.id,b.port))return 'Wybrany koniec jest już połączony.';
 if(connectedIds(p,a.id).has(b.id))return 'Te elementy należą już do jednego układu. Zamykanie pętli nie jest jeszcze obsługiwane.';
 const problem=portCompatibility(x,a.port,y,b.port);if(problem)return problem;
 if(x.technical.family!=='pex'&&!ports(x)[a.port].type.startsWith('thread')&&(x.technical.material!==y.technical.material||x.technical.connection!==y.technical.connection))return 'Końce mają różne materiały lub technologie przyłączenia.';
 if(Math.hypot(...portDirection(x,a.port).map((n,i)=>n+portDirection(y,b.port)[i]))>1e-4)return 'Końce nie są skierowane przeciwnie. Obróć element przed połączeniem.';
 return null;
}
// Translate the entire source component, preserving its lengths and internal joints.
export function joinExisting(p,a,b){
 const problem=joinProblem(p,a,b);if(problem)throw Error(problem);
 const source=p.elements.find(e=>e.id===a.id),target=p.elements.find(e=>e.id===b.id),delta=sub(endpoints(target)[b.port],endpoints(source)[a.port]);
 const result=clone(p),ids=connectedIds(p,a.id);
 for(const e of result.elements)if(ids.has(e.id))e.geometry.position=e.geometry.position.map((n,i)=>n+delta[i]);
 result.connections??=[];result.connections.push({a:clone(a),b:clone(b)});
 return {project:validate(result),delta,count:ids.size};
}
export function nearbyJoin(p,id,maxDistance=150){
 const source=p.elements.find(e=>e.id===id);if(!source)return null;
 let best=null;
 for(const port of ports(source).keys())for(const target of p.elements)for(const targetPort of ports(target).keys()){
  const a={id,port},b={id:target.id,port:targetPort};
  const distance=Math.hypot(...sub(endpoints(source)[port],endpoints(target)[targetPort]));
  if(distance>maxDistance||(best&&distance>=best.distance)||joinProblem(p,a,b))continue;
  try{joinExisting(p,a,b);best={a,b,distance};}catch{/* Outside the supported coordinate range. */}
 }
 return best;
}

export function attachmentTurns(p,id,port,kind,plane=null,length=1000){
 const axis={XY:2,XZ:1,YZ:0}[plane],source=p.elements.find(e=>e.id===id);
 if(!source)return [];
 const level=endpoints(source)[port]?.[axis];
 return [0,1,2,3].filter(turn=>{try{
  const next=attachment(p,id,port,kind,turn,length);
  return axis===undefined||endpoints(next).every(point=>Math.abs(point[axis]-level)<1e-5);
 }catch{return false;}});
}
