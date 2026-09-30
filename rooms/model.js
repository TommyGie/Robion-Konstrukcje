import {validateWallLayers,layersOf} from './materials.js?v=2026-09-30';
// Plan geometry uses centimetres. x/y are floor coordinates; z is elevation.
export const CATALOG = [
 {kind:'wardrobe',name:'Szafa',group:'Pokój',w:120,d:60,h:220,clear:90,color:'#c6b59c'},
 {kind:'sofa',name:'Sofa',group:'Pokój',w:220,d:90,h:85,clear:60,color:'#8daaa1'},
 {kind:'bed',name:'Łóżko',group:'Pokój',w:160,d:200,h:55,clear:70,color:'#c5b7a9'},
 {kind:'table',name:'Stół',group:'Pokój',w:140,d:80,h:75,clear:80,color:'#d7b88a'},
 {kind:'chair',name:'Krzesło',group:'Pokój',w:45,d:50,h:85,clear:60,color:'#bda581'},
 {kind:'desk',name:'Biurko',group:'Pokój',w:120,d:60,h:75,clear:90,color:'#c7b69b'},
 {kind:'shelf',name:'Regał',group:'Pokój',w:80,d:35,h:180,clear:60,color:'#cbb99d'},
 {kind:'cabinet',name:'Szafka dolna',group:'Kuchnia',w:60,d:60,h:90,clear:100,color:'#d7c5a5'},
 {kind:'sink',name:'Zlew',group:'Kuchnia',w:80,d:60,h:90,clear:100,color:'#bdd0cd'},
 {kind:'hob',name:'Płyta / piekarnik',group:'Kuchnia',w:60,d:60,h:90,clear:100,color:'#bcc5ca'},
 {kind:'fridge',name:'Lodówka',group:'Kuchnia',w:60,d:65,h:200,clear:100,color:'#cad5d7'},
 {kind:'dishwasher',name:'Zmywarka',group:'Kuchnia',w:60,d:60,h:85,clear:100,color:'#bfcbd3'},
 {kind:'island',name:'Wyspa kuchenna',group:'Kuchnia',w:160,d:80,h:90,clear:110,color:'#c0b495'},
 {kind:'upper',name:'Szafka wisząca',group:'Kuchnia',w:60,d:35,h:70,z:145,clear:0,color:'#d7c5a5'},
 {kind:'wc',name:'WC',group:'Łazienka',w:38,d:68,h:80,clear:80,color:'#d4e0e3'},
 {kind:'basin',name:'Umywalka',group:'Łazienka',w:60,d:45,h:85,clear:80,color:'#c3d5d7'},
 {kind:'shower',name:'Prysznic',group:'Łazienka',w:90,d:90,h:205,clear:70,color:'#b0d1d7'},
 {kind:'bath',name:'Wanna',group:'Łazienka',w:170,d:75,h:60,clear:70,color:'#c9dce0'},
 {kind:'washer',name:'Pralka',group:'Łazienka',w:60,d:60,h:85,clear:90,color:'#d0d8dd'},
 {kind:'custom',name:'Własny element',group:'Inne',w:100,d:60,h:100,clear:80,color:'#acbacc'}
];
export const uid=()=>globalThis.crypto?.randomUUID?.()||`id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const rad=a=>a*Math.PI/180;
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function wallLength(w){return dist(w.a,w.b);}
export function wallPoint(w,t){return {x:w.a.x+(w.b.x-w.a.x)*t,y:w.a.y+(w.b.y-w.a.y)*t};}
export function wallFrame(w){const l=wallLength(w),u={x:(w.b.x-w.a.x)/l,y:(w.b.y-w.a.y)/l};return {l,u,n:{x:-u.y,y:u.x}};}
export function projectOnWall(p,w){const {l,u}=wallFrame(w);const t=Math.max(0,Math.min(1,((p.x-w.a.x)*u.x+(p.y-w.a.y)*u.y)/l));return {t,p:wallPoint(w,t),distance:dist(p,wallPoint(w,t))};}
export function rect(x,y,w,d,angle=0){const c=Math.cos(rad(angle)),s=Math.sin(rad(angle));return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>({x:x+a*c-b*s,y:y+a*s+b*c}));}
export const bodyPolygon=f=>rect(f.x,f.y,f.w,f.d,f.angle);
export function frontZone(f){const shift=f.d/2+f.clear/2;return rect(f.x-Math.sin(rad(f.angle))*shift,f.y+Math.cos(rad(f.angle))*shift,f.w,f.clear,f.angle);}
export function polygonsOverlap(a,b,tolerance=.1){
 for(const poly of [a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],len=dist(p,q);if(len<1e-9)continue;
  const nx=-(q.y-p.y)/len,ny=(q.x-p.x)/len;
  const aa=a.map(v=>v.x*nx+v.y*ny),bb=b.map(v=>v.x*nx+v.y*ny);
  if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=tolerance)return false;
 }return true;
}
export function pointInside(p,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }return hit;}
// Join offset faces at a shared endpoint; axis lengths and opening positions stay unchanged.
function wallCorner(p,w,atStart,side){
 const {u,n}=wallFrame(w),origin=atStart?w.a:w.b;
 const base={x:origin.x+n.x*side*w.thickness/2,y:origin.y+n.y*side*w.thickness/2};
 if(!p)return base;
 const neighbours=p.walls.filter(v=>v.id!==w.id&&(dist(origin,v.a)<.001||dist(origin,v.b)<.001));
 if(neighbours.length!==1)return base;
 const v=neighbours[0],vf=wallFrame(v),forward=dist(origin,v.a)<.001?1:-1;
 const vu={x:vf.u.x*forward,y:vf.u.y*forward},vn={x:-vu.y,y:vu.x};
 const otherSide=side*(atStart?-1:1),q={x:origin.x+vn.x*otherSide*v.thickness/2,y:origin.y+vn.y*otherSide*v.thickness/2};
 const cross=u.x*vu.y-u.y*vu.x;if(Math.abs(cross)<1e-6)return base;
 const t=((q.x-base.x)*vu.y-(q.y-base.y)*vu.x)/cross;
 const result={x:base.x+t*u.x,y:base.y+t*u.y};
 // Very acute junctions must not produce unbounded spikes.
 return dist(result,origin)<=4*Math.max(w.thickness,v.thickness)?result:base;
}
export function wallPolygon(w,start=0,end=wallLength(w),p=null){
 const {l,n}=wallFrame(w),a=wallPoint(w,start/l),b=wallPoint(w,end/l),half=w.thickness/2;
 const corner=(point,side,isStart)=>Math.abs(isStart?start:end-l)<.001?wallCorner(p,w,isStart,side):{x:point.x+n.x*side*half,y:point.y+n.y*side*half};
 return [corner(a,-1,true),corner(b,-1,false),corner(b,1,false),corner(a,1,true)];
}
export function openingsFor(p,w){return p.openings.filter(o=>o.wall===w.id).sort((a,b)=>a.t-b.t);}
export function wallPieces(p,w){
 const l=wallLength(w),parts=[];let cursor=0;
 for(const o of openingsFor(p,w)){
  const start=o.t*l-o.width/2,end=o.t*l+o.width/2;
  if(start>cursor)parts.push({start:cursor,end:start,z:0,h:w.height});
  if(o.sill>0)parts.push({start,end,z:0,h:o.sill});
  if(o.sill+o.height<w.height)parts.push({start,end,z:o.sill+o.height,h:w.height-o.sill-o.height});
  cursor=end;
 }if(cursor<l)parts.push({start:cursor,end:l,z:0,h:w.height});return parts;
}
export function doorGeometry(p,o){
 const w=p.walls.find(v=>v.id===o.wall),{u,n,l}=wallFrame(w),side=o.side||1,hinge=o.hinge||1;
 const t=o.t-hinge*o.width/2/l,base=wallPoint(w,t);
 const h={x:base.x+n.x*w.thickness/2*side,y:base.y+n.y*w.thickness/2*side};
 const poly=[h];for(let i=0;i<=24;i++){const a=i/24*Math.PI/2;poly.push({x:h.x+u.x*hinge*o.width*Math.cos(a)+n.x*side*o.width*Math.sin(a),y:h.y+u.y*hinge*o.width*Math.cos(a)+n.y*side*o.width*Math.sin(a)});}
 return {hinge:h,closed:poly[1],open:poly.at(-1),polygon:poly};
}
export function makeFurniture(kind,x,y){const c=CATALOG.find(f=>f.kind===kind)||CATALOG[0];return {id:uid(),kind:c.kind,name:c.name,x,y,w:c.w,d:c.d,h:c.h,z:c.z||0,angle:0,clear:c.clear,color:c.color};}
export function makeWall(a,b,thickness=12,height=270){return {id:uid(),name:'Ściana',a:{...a},b:{...b},thickness,height};}
export function blankPlan(){return {format:'robion-rooms',version:1,name:'Mój plan',floor:{width:800,depth:600},walls:[],openings:[],furniture:[],labels:[],measurements:[]};}
export function rectangularPlan(width=800,depth=600){const p=blankPlan();p.floor={width,depth};const pts=[{x:0,y:0},{x:width,y:0},{x:width,y:depth},{x:0,y:depth}];p.walls=pts.map((a,i)=>({...makeWall(a,pts[(i+1)%4],20),name:'Ściana zewnętrzna'}));return p;}
export function demoPlan(){
 const p=rectangularPlan();p.name='Mieszkanie · sprawdź przejście';
 const divider=makeWall({x:520,y:0},{x:520,y:600}),bath=makeWall({x:520,y:300},{x:800,y:300});p.walls.push(divider,bath);
 p.openings=[{id:uid(),kind:'door',name:'Drzwi łazienki',wall:bath.id,t:170/280,width:80,height:205,sill:0,side:1,hinge:1},{id:uid(),kind:'door',name:'Wejście do salonu',wall:divider.id,t:470/600,width:90,height:205,sill:0,side:1,hinge:-1},{id:uid(),kind:'window',name:'Okno kuchni',wall:p.walls[0].id,t:.30,width:140,height:140,sill:90,side:1,hinge:1},{id:uid(),kind:'window',name:'Okno salonu',wall:p.walls[3].id,t:.35,width:160,height:140,sill:90,side:1,hinge:1}];
 const add=(kind,x,y,props={})=>{const f={...makeFurniture(kind,x,y),...props};p.furniture.push(f);return f;};
 add('fridge',50,50);add('cabinet',110,45);add('sink',180,45);add('cabinet',250,45);add('hob',310,45);add('dishwasher',370,45);
 add('table',260,250);add('sofa',240,535,{angle:180});add('shelf',455,475,{angle:90});
 add('wc',730,65);add('basin',565,65);add('shower',740,235,{angle:180});add('washer',565,215,{angle:0});
 add('wardrobe',680,405,{name:'Szafa przy drzwiach',w:130,angle:180});
 p.labels=[{id:uid(),name:'KUCHNIA',x:255,y:170},{id:uid(),name:'SALON',x:250,y:405},{id:uid(),name:'ŁAZIENKA',x:675,y:165},{id:uid(),name:'PRZEDPOKÓJ',x:675,y:525}];return p;
}
function number(v,name,min,max){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${name}: wpisz wartość od ${min} do ${max}.`);return v;}
function text(v,fallback){return typeof v==='string'?v.slice(0,100):fallback;}
export function validatePlan(input){
 if(!input||input.format!=='robion-rooms'||input.version!==1)throw Error('To nie jest projekt ROBION Pomieszczenia (wersja 1).');
 const p=structuredClone(input);p.measurements??=[];p.name=text(p.name,'Mój plan');
 if(!p.floor)throw Error('Brakuje wymiarów obszaru.');number(p.floor.width,'Szerokość planu',100,10000);number(p.floor.depth,'Głębokość planu',100,10000);
 for(const key of ['walls','openings','furniture','labels','measurements'])if(!Array.isArray(p[key])||p[key].length>300)throw Error('Nieprawidłowa lista elementów (maks. 300).');
 const ids=new Set();for(const obj of [...p.walls,...p.openings,...p.furniture,...p.labels,...p.measurements]){if(!obj||typeof obj.id!=='string'||obj.id.length>100||ids.has(obj.id))throw Error('Identyfikatory elementów muszą być unikalne.');ids.add(obj.id);obj.name=text(obj.name,'Element');}
 const point=p=>{if(!p)throw Error('Brakuje współrzędnych.');number(p.x,'X',-10000,20000);number(p.y,'Y',-10000,20000);};
 for(const w of p.walls){validateWallLayers(w);point(w.a);point(w.b);number(wallLength(w),'Długość ściany',10,15000);number(w.thickness,'Grubość ściany',5,100);number(w.height,'Wysokość ściany',50,600);}
 for(const f of p.furniture){point(f);number(f.w,'Szerokość',5,2000);number(f.d,'Głębokość',5,2000);number(f.h,'Wysokość',5,600);number(f.z,'Poziom spodu',0,600);number(f.angle,'Obrót',-3600,3600);f.angle=(f.angle%360+360)%360;number(f.clear,'Miejsce z przodu',0,500);if(!CATALOG.some(c=>c.kind===f.kind))throw Error('Nieznany rodzaj wyposażenia.');if(!/^#[0-9a-f]{6}$/i.test(f.color))throw Error('Nieprawidłowy kolor.');}
 for(const o of p.openings){const w=p.walls.find(w=>w.id===o.wall);if(!w)throw Error('Otwór nie jest przypisany do ściany.');if(!['door','window'].includes(o.kind))throw Error('Nieznany typ otworu.');number(o.t,'Położenie otworu',0,1);number(o.width,'Szerokość otworu',20,600);number(o.height,'Wysokość otworu',20,600);number(o.sill,'Parapet',0,500);if(o.kind==='door'&&o.sill!==0)throw Error('Drzwi muszą zaczynać się od podłogi.');if(![1,-1].includes(o.side)||![1,-1].includes(o.hinge))throw Error('Nieprawidłowy kierunek otwierania.');const l=wallLength(w);if(o.t*l-o.width/2<-.001||o.t*l+o.width/2>l+.001)throw Error('Otwór nie mieści się na tej ścianie.');if(o.height+o.sill>w.height+.001)throw Error('Otwór jest wyższy od ściany.');}
 for(const w of p.walls){let edge=-1;for(const o of openingsFor(p,w)){const start=o.t*wallLength(w)-o.width/2;if(start<edge-.001)throw Error('Otwory w ścianie zachodzą na siebie.');edge=start+o.width;}}
 for(const l of p.labels)point(l);for(const m of p.measurements){point(m.a);point(m.b);number(dist(m.a,m.b),'Długość pomiaru',.1,20000);}return p;
}
export function analyse(p){
 const issues=[],bodies=new Map(p.furniture.map(f=>[f.id,bodyPolygon(f)]));
 const solid=p.walls.flatMap(w=>wallPieces(p,w).map(piece=>({...piece,id:w.id,poly:wallPolygon(w,piece.start,piece.end,p)})));
 const vertical=(a,z,h)=>Math.min(a.z+a.h,z+h)-Math.max(a.z,z)>.1;
 const add=(level,type,ids,message)=>issues.push({level,type,ids,message});
 for(let i=0;i<p.furniture.length;i++){
  const f=p.furniture[i],poly=bodies.get(f.id);
  if(poly.some(v=>v.x<0||v.y<0||v.x>p.floor.width||v.y>p.floor.depth))add('error','outside',[f.id],`${f.name}: element wychodzi poza obszar planu.`);
  for(let j=i+1;j<p.furniture.length;j++){const g=p.furniture[j];if(vertical(f,g.z,g.h)&&polygonsOverlap(poly,bodies.get(g.id)))add('error','collision',[f.id,g.id],`${f.name} i ${g.name}: bryły nachodzą na siebie.`);}
  const ws=[...new Set(solid.filter(w=>vertical(f,w.z,w.h)&&polygonsOverlap(poly,w.poly)).map(w=>w.id))];
  if(ws.length)add('error','wall',[f.id,...ws],`${f.name}: kolizja ze ścianą.`);
  if(f.clear>0){const zone=frontZone(f),blockers=p.furniture.filter(g=>g.id!==f.id&&vertical(g,0,190)&&polygonsOverlap(zone,bodies.get(g.id)));
   const walls=solid.filter(w=>w.z<190&&polygonsOverlap(zone,w.poly));
   const outside=zone.some(v=>v.x<0||v.y<0||v.x>p.floor.width||v.y>p.floor.depth);
   if(blockers.length||walls.length||outside)add('warning','clearance',[f.id,...blockers.map(g=>g.id),...new Set(walls.map(w=>w.id))],`${f.name}: strefa ${f.clear.toLocaleString('pl-PL')} cm z przodu jest zajęta${blockers.length?' przez '+blockers.map(g=>g.name).join(', '):walls.length?' przez ścianę':' poza planem'}.`);
  }
 }
 for(const o of p.openings.filter(o=>o.kind==='door')){
  const poly=doorGeometry(p,o).polygon;
  const furniture=p.furniture.filter(f=>f.z<o.height&&polygonsOverlap(poly,bodies.get(f.id)));
  const walls=[...new Set(solid.filter(w=>w.id!==o.wall&&w.z<o.height&&polygonsOverlap(poly,w.poly)).map(w=>w.id))];
  if(furniture.length||walls.length)add('error','door',[o.id,...furniture.map(f=>f.id),...walls],`${o.name}: skrzydło przy otwieraniu do 90° uderza w ${furniture.length?furniture.map(f=>f.name).join(', '):'ścianę'}.`);
 }
 return issues;
}
export function nearestFrontGap(p,f,max=500){
 // First obstacle intersecting the full front width, excluding objects above walking height.
 const test=d=>{const z=frontZone({...f,clear:d});return p.furniture.some(g=>g.id!==f.id&&g.z<190&&polygonsOverlap(z,bodyPolygon(g),0))||p.walls.some(w=>wallPieces(p,w).some(s=>s.z<190&&polygonsOverlap(z,wallPolygon(w,s.start,s.end,p),0)))||z.some(v=>v.x<0||v.y<0||v.x>p.floor.width||v.y>p.floor.depth);};
 if(!test(max))return max;let lo=0,hi=max;for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(test(mid))hi=mid;else lo=mid;}return lo;
}
export function snapFurniture(p,f,step=1,tolerance=8,magnet=true){
 let x=Math.round(f.x/step)*step,y=Math.round(f.y/step)*step;
 if(magnet){const poly=bodyPolygon({...f,x,y}),xs=poly.map(v=>v.x),ys=poly.map(v=>v.y),fx=[Math.min(...xs),Math.max(...xs)],fy=[Math.min(...ys),Math.max(...ys)];
  const tx=[],ty=[];
  for(const w of p.walls){if(Math.abs(w.a.x-w.b.x)<.01)tx.push(w.a.x-w.thickness/2,w.a.x+w.thickness/2);if(Math.abs(w.a.y-w.b.y)<.01)ty.push(w.a.y-w.thickness/2,w.a.y+w.thickness/2);}
  for(const g of p.furniture)if(g.id!==f.id){const a=bodyPolygon(g);tx.push(Math.min(...a.map(v=>v.x)),Math.max(...a.map(v=>v.x)));ty.push(Math.min(...a.map(v=>v.y)),Math.max(...a.map(v=>v.y)));}
  const best=(edges,targets)=>{let shift=0,best=tolerance;for(const a of edges)for(const b of targets)if(Math.abs(b-a)<best){shift=b-a;best=Math.abs(shift);}return shift;};x+=best(fx,tx);y+=best(fy,ty);
 }return {...f,x,y};
}

// Split the joined wall polygon into bands from the left face of A→B to the right.
export function wallLayerPolygons(p,w,start=0,end=wallLength(w)){
 const poly=wallPolygon(w,start,end,p),blend=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});let offset=0;
 return layersOf(w).map(layer=>{const a=offset/w.thickness;offset+=layer.thickness;const b=offset/w.thickness;return {...layer,polygon:[blend(poly[3],poly[0],a),blend(poly[2],poly[1],a),blend(poly[2],poly[1],b),blend(poly[3],poly[0],b)]};});
}
