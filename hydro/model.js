import {PPR_PARTS,PPR_SIZES,pprData,pprPorts} from './ppr.js?v=2026-10-21';
// Pure project model. Millimetres, Y up; no renderer or hydraulic solver dependency.
export const FORMAT = 'robion-hydro';
export const clone = value => JSON.parse(JSON.stringify(value));
export function project() { return {format:FORMAT,version:1,units:'mm',name:'Nowa instalacja',elements:[],connections:[]}; }
export function element(kind, position=[0,500,0],diameter=25,outlet=20) {
 if(PPR_PARTS[kind]){const data=pprData(kind,diameter,outlet);return {id:crypto.randomUUID(),kind:data.part.kind,name:data.part.name,geometry:{position:[...position],rotation:[0,0,0],...data.geometry},technical:data.technical,visual:{symbol:data.part.kind}};}
 return {id:crypto.randomUUID(),kind,name:kind==='pipe'?'Rura':'Kolanko 90°',geometry:{position:[...position],rotation:[0,0,0],length:1000,radius:100},technical:{family:'generic',material:'Nieokreślony',connection:'Nieokreślone',outerDiameter:32},visual:{symbol:kind}};
}
function number(n,min,max){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Wartość liczbowa poza dopuszczalnym zakresem.');return n;}
function vector(v,limit){if(!Array.isArray(v)||v.length!==3)throw Error('Nieprawidłowe współrzędne.');return v.map(n=>number(n,-limit,limit));}
function label(s){if(typeof s!=='string'||s.length>100)throw Error('Nazwa może mieć do 100 znaków.');return s;}
export function validate(raw){
 if(!raw||raw.format!==FORMAT||raw.version!==1||raw.units!=='mm')throw Error('Wybierz projekt ROBION Hydro w wersji 1 (mm).');
 if(!Array.isArray(raw.elements)||raw.elements.length>1000)throw Error('Projekt może zawierać do 1000 elementów.');
 const ids=new Set();const result=project();result.name=label(raw.name);
 result.elements=raw.elements.map(e=>{
  if(!e||!['pipe','elbow','elbow45','tee','coupling','reducer','cap','valve'].includes(e.kind)||typeof e.id!=='string'||!e.id||e.id.length>100||ids.has(e.id))throw Error('Nieprawidłowy lub powtórzony identyfikator elementu.');ids.add(e.id);
  const g=e.geometry,t=e.technical;if(!g||!t||!['generic','ppr'].includes(t.family))throw Error('Nieobsługiwana rodzina elementu.');
  const diameter=number(t.outerDiameter,1,1000),radius=number(g.radius,1,10000);
  if(e.kind==='elbow'&&radius<=diameter/2)throw Error('Promień osi kolanka musi być większy od połowy średnicy.');
  let technical={family:'generic',material:label(t.material),connection:label(t.connection),outerDiameter:diameter};
  if(t.family==='ppr'){const data=pprData(t.catalogId,diameter,t.outletDiameter,t.shapeVersion??1);if(data.part.kind!==e.kind||radius!==data.geometry.radius||t.material!==data.technical.material||t.connection!==data.technical.connection)throw Error('Niespójne dane biblioteki PP-R.');technical=data.technical;}else if(!['pipe','elbow'].includes(e.kind))throw Error('Nieobsługiwany symbol ogólny.');
  return {id:e.id,kind:e.kind,name:label(e.name),geometry:{position:vector(g.position,100000),rotation:vector(g.rotation,360),length:number(g.length,1,100000),radius},technical,visual:{symbol:e.kind}};
 });
 const links=raw.connections??[];if(!Array.isArray(links)||links.length>1000)throw Error('Nieprawidłowa lista połączeń.');
 const used=new Set();result.connections=links.map(link=>{
  const read=r=>{if(!r||!ids.has(r.id)||!Number.isInteger(r.port)||r.port<0||r.port>=endpoints(result.elements.find(e=>e.id===r.id)).length)throw Error('Nieprawidłowe przyłącze.');const key=r.id+':'+r.port;if(used.has(key))throw Error('Przyłącze jest już zajęte.');used.add(key);return {id:r.id,port:r.port};};
  const a=read(link.a),b=read(link.b);if(a.id===b.id)throw Error('Nie można połączyć elementu z nim samym.');
  const x=result.elements.find(e=>e.id===a.id),y=result.elements.find(e=>e.id===b.id);
  const problem=portCompatibility(x,a.port,y,b.port);if(problem)throw Error(problem);
  if(x.technical.material!==y.technical.material||x.technical.connection!==y.technical.connection)throw Error('Różne materiały lub technologie przyłączenia.');
  const p=endpoints(x)[a.port],q=endpoints(y)[b.port],u=portDirection(x,a.port),v=portDirection(y,b.port);
  if(Math.hypot(...p.map((n,i)=>n-q[i]))>1e-4||Math.hypot(...u.map((n,i)=>n+v[i]))>1e-4)throw Error('Zmiana rozrywa połączenie lub zmienia jego kierunek. Odłącz element albo zmień położenie wzdłuż osi rury.');
  return {a,b};
 });return result;
}
export const serialize=p=>JSON.stringify(validate(p),null,2);
export const parse=text=>validate(JSON.parse(text));
export function rotate(point,degrees){
 // Same XYZ Euler convention as Three.js: apply Z, then Y, then X.
 let [x,y,z]=point;const [a,b,c]=degrees.map(n=>n*Math.PI/180);
 [x,y]=[x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c)];
 [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
 [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];return [x,y,z];
}
export function endpoints(e){const g=e.geometry;const points=e.technical.family==='ppr'?pprPorts(e).map(p=>p.point):e.kind==='pipe'?[[0,0,0],[g.length,0,0]]:[[0,0,0],[g.radius,g.radius,0]];return points.map(p=>rotate(p,g.rotation).map((n,i)=>n+g.position[i]));}
export function axisLength(e){if(e.technical.family==='ppr'&&e.kind!=='pipe'){const ps=pprPorts(e);return e.kind==='elbow'?Math.PI*e.geometry.radius/2:e.kind==='elbow45'?Math.PI*e.geometry.radius/4:ps.length>1?Math.hypot(...ps[1].point):0;}return e.kind==='pipe'?e.geometry.length:Math.PI*e.geometry.radius/2;}
export function moved(e,delta,step=1){const copy=clone(e);copy.geometry.position=copy.geometry.position.map((n,i)=>Math.round((n+delta[i])/step)*step);return copy;}

// Grid cells are spatial volumes; the editing plane selects a layer, not its edge.
export function cellCenter(point,size){return point.map(n=>(Math.floor(n/size)+.5)*size);}
export function cellPlacement(kind,point,size,diameter=25,outlet=20){
 if(PPR_PARTS[kind]){const ps=pprPorts(element(kind,[0,0,0],diameter,outlet));const offset=[0,1,2].map(i=>(Math.min(...ps.map(p=>p.point[i]))+Math.max(...ps.map(p=>p.point[i])))/2);return cellCenter(point,size).map((n,i)=>n-offset[i]);}
 const center=cellCenter(point,size);
 // Centre the element's axial bounding box inside the indicated cell.
 const offset=kind==='pipe'?[500,0,0]:[50,50,0];
 return center.map((n,i)=>n-offset[i]);
}

export function portDirection(e,port){return rotate(e.technical.family==='ppr'?pprPorts(e)[port].direction:port===0?[-1,0,0]:e.kind==='pipe'?[1,0,0]:[0,1,0],e.geometry.rotation);}

export function ports(e){return endpoints(e).map((point,index)=>({point,direction:portDirection(e,index),diameter:e.technical.family==='ppr'?pprPorts(e)[index].diameter:e.technical.outerDiameter,type:e.technical.family==='ppr'?pprPorts(e)[index].type:'generic'}));}
export const portName=index=>'ABC'[index]??String(index+1);
export function portCompatibility(x,a,y,b){
 const u=ports(x)[a],v=ports(y)[b];if(!u||!v)return 'Nieprawidłowy koniec.';
 if(x.technical.family!==y.technical.family)return 'Nie łącz symbolu ogólnego z częścią PP-R.';
 if(u.diameter!==v.diameter)return 'Końce mają różne średnice.';
 if(x.technical.family==='ppr'&&u.type===v.type)return u.type==='socket'?'Dwa kielichy wymagają odcinka rury.':'Dwie rury wymagają mufy lub innej kształtki.';
 return null;
}
