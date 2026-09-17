export const PROFILES = {
  '20-1.5': {name:'20 × 20 × 1,5', w:20,h:20,t:1.5},
  '25-2': {name:'25 × 25 × 2',w:25,h:25,t:2},
  '30-2': {name:'30 × 30 × 2',w:30,h:30,t:2},
  '40-2': {name:'40 × 40 × 2',w:40,h:40,t:2},
  '50-2': {name:'50 × 50 × 2',w:50,h:50,t:2},
  '60-3': {name:'60 × 60 × 3',w:60,h:60,t:3},
  '80-3': {name:'80 × 80 × 3',w:80,h:80,t:3},
  '60x40-2': {name:'60 × 40 × 2',w:60,h:40,t:2}
};
export const DEFAULTS={template:'gate',depth:600,width:1000,height:1800,frame:'40-2',bar:'20-1.5',gap:110,infill:true};
export const length=e=>Math.hypot(...e.a.map((v,i)=>e.b[i]-v));
export const kgPerM=id=>{const p=PROFILES[id];return (p.w*p.h-(p.w-2*p.t)*(p.h-2*p.t))*.00785;};
export function checkParams(raw){
  const p={template:raw.template??'gate',depth:Number(raw.depth??600),width:Number(raw.width),height:Number(raw.height),frame:raw.frame,bar:raw.bar,gap:Number(raw.gap),infill:raw.infill!==false};
  if(!['gate','frame','railing','table'].includes(p.template))throw Error('Nieznany szablon konstrukcji.');
  if(!Number.isFinite(p.depth)||p.depth<300||p.depth>4000)throw Error('Głębokość: od 300 do 4000 mm.');
  if(['frame','table'].includes(p.template))p.infill=false;
  for(const [k,min,max] of [['width',300,6000],['height',300,4000],['gap',20,500]]) if(!Number.isFinite(p[k])||p[k]<min||p[k]>max) throw Error({width:'Szerokość: od 300 do 6000 mm.',height:'Wysokość: od 300 do 4000 mm.',gap:'Prześwit: od 20 do 500 mm.'}[k]);
  if(!['40-2','50-2','60-3','80-3'].includes(p.frame)||!['20-1.5','25-2','30-2'].includes(p.bar))throw Error('Nieobsługiwany profil generatora.');
  return p;
}
export function generate(raw=DEFAULTS){
 const p=checkParams(raw),f=PROFILES[p.frame].w,b=PROFILES[p.bar].w,W=p.width,H=p.height,iw=W-2*f,ih=H-2*f;
 const parts=[];const add=(id,name,profile,a,end)=>parts.push({id,name,profile,a,b:end,cuts:normalizeCuts()});
 if(p.template==='table'){
  let n=0;
  for(const x of [f/2,W-f/2])for(const z of [f/2,p.depth-f/2])add('N'+(++n),'Noga · '+n,p.frame,[x,0,z],[x,H,z]);
  for(const [i,z] of [f/2,p.depth-f/2].entries())add('B'+(i+1),'Belka długa · '+(i+1),p.frame,[f,H-f/2,z],[W-f,H-f/2,z]);
  for(const [i,x] of [f/2,W-f/2].entries())add('B'+(i+3),'Belka poprzeczna · '+(i+1),p.frame,[x,H-f/2,f],[x,H-f/2,p.depth-f]);
  return {version:1,name:'Stelaż stołu',params:p,custom:false,elements:parts,actualGap:0};
 }
 if(p.template==='railing'){
  const bottom=100;
  add('S1','Słupek · lewy',p.frame,[f/2,0,0],[f/2,H-f,0]);
  add('S2','Słupek · prawy',p.frame,[W-f/2,0,0],[W-f/2,H-f,0]);
  add('P1','Pochwyt',p.frame,[0,H-f/2,0],[W,H-f/2,0]);
  add('P2','Poprzeczka dolna',p.frame,[f,bottom+f/2,0],[W-f,bottom+f/2,0]);
  const n=p.infill?Math.max(0,Math.ceil((iw-p.gap)/(b+p.gap))):0,actualGap=(iw-n*b)/(n+1);
  for(let i=0;i<n;i++){const x=f+actualGap+b/2+i*(b+actualGap);add('W'+(i+1),'Szczebel · '+(i+1),p.bar,[x,bottom+f,0],[x,H-f,0]);}
  return {version:1,name:'Panel balustrady',params:p,custom:false,elements:parts,actualGap};
 }
 add('R1','Rama · lewy pion',p.frame,[f/2,0,0],[f/2,H,0]);
 add('R2','Rama · prawy pion',p.frame,[W-f/2,0,0],[W-f/2,H,0]);
 add('R3','Rama · dół',p.frame,[f,f/2,0],[W-f,f/2,0]);
 add('R4','Rama · góra',p.frame,[f,H-f/2,0],[W-f,H-f/2,0]);
 const n=p.infill?Math.max(0,Math.ceil((iw-p.gap)/(b+p.gap))):0;
 const actualGap=(iw-n*b)/(n+1);
 for(let i=0;i<n;i++){const x=f+actualGap+b/2+i*(b+actualGap);add('W'+(i+1),'Wypełnienie · '+(i+1),p.bar,[x,f,0],[x,H-f,0]);}
 return {version:1,name:p.template==='frame'?'Rama z profili':'Furtka ogrodowa',params:p,custom:false,elements:parts,actualGap};
}
// End planes are measured against the longitudinal axis: 90° is a square cut.
export function normalizeCut(raw={}){
 const angle=raw.angle??90,plane=raw.plane??'width',flipped=raw.flipped??false;
 if(typeof angle!=='number'||!Number.isFinite(angle)||angle<0.1||angle>179.9||!['width','height'].includes(plane)||typeof flipped!=='boolean')throw Error('Kąt cięcia: od 0,1° do 179,9°. Wybierz płaszczyznę szerokości lub wysokości profilu.');
 const acute=angle>90?Math.max(0.1,Number((180-angle).toFixed(10))):angle;
 return {angle:acute,plane:acute===90?'width':plane,flipped:acute===90?false:angle>90?!flipped:flipped};
}
export function normalizeCuts(raw){return {a:normalizeCut(raw?.a),b:normalizeCut(raw?.b)};}
export function cutSlopes(cut){const c=normalizeCut(cut),s=c.angle===90?0:(c.flipped?-1:1)/Math.tan(c.angle*Math.PI/180);return c.plane==='width'?[s,0]:[0,s];}
export function stockLength(e){const p=PROFILES[e.profile],c=normalizeCuts(e.cuts),a=cutSlopes(c.a),b=cutSlopes(c.b);return length(e)+(Math.abs(a[0])+Math.abs(b[0]))*p.w/2+(Math.abs(a[1])+Math.abs(b[1]))*p.h/2;}
export function bom(elements){
 const groups=new Map();
 for(const e of elements){const mm=stockLength(e),cuts=normalizeCuts(e.cuts),key=[e.profile,mm.toFixed(6),length(e).toFixed(6),JSON.stringify(cuts)].join(':');let g=groups.get(key);if(!g){g={profile:e.profile,mm,axisMm:length(e),cuts,count:0,ids:[],mass:0};groups.set(key,g);}g.count++;g.ids.push(e.id);g.mass+=length(e)/1000*kgPerM(e.profile);}
 return [...groups.values()].sort((a,b)=>a.profile.localeCompare(b.profile)||b.mm-a.mm);
}
export function totals(elements){return elements.reduce((a,e)=>({count:a.count+1,meters:a.meters+length(e)/1000,mass:a.mass+length(e)/1000*kgPerM(e.profile)}),{count:0,meters:0,mass:0});}
export function validateElement(e){
 if(!e||typeof e.id!=='string'||!e.id||e.id.length>40||typeof e.name!=='string'||e.name.length>80||!Object.hasOwn(PROFILES,e.profile))throw Error('Niepoprawny element lub profil.');
 for(const a of [e.a,e.b])if(!Array.isArray(a)||a.length!==3||a.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>20000))throw Error('Współrzędne muszą być liczbami od −20 000 do 20 000 mm.');
 if(length(e)<1||length(e)>30000)throw Error('Długość profilu musi wynosić od 1 do 30 000 mm.');
 const cuts=normalizeCuts(e.cuts),sa=cutSlopes(cuts.a),sb=cutSlopes(cuts.b),p=PROFILES[e.profile];
 if(length(e)-Math.abs(sb[0]-sa[0])*p.w/2-Math.abs(sb[1]-sa[1])*p.h/2<1)throw Error('Płaszczyzny cięcia przecinają się. Zwiększ długość lub zmień kąty.');
 return {id:e.id,name:e.name,profile:e.profile,a:[...e.a],b:[...e.b],cuts};
}
export function validateProject(raw){
 if(!raw||raw.version!==1||typeof raw.name!=='string'||raw.name.length>80||!Array.isArray(raw.elements)||raw.elements.length>2000)throw Error('To nie jest obsługiwany plik projektu Warsztat 3D.');
 const elements=raw.elements.map(validateElement),ids=new Set(elements.map(e=>e.id));
 if(ids.size!==elements.length)throw Error('Identyfikatory elementów muszą być unikalne.');
 const params=checkParams(raw.params);const expected=generate(params);
 const custom=JSON.stringify(expected.elements)!==JSON.stringify(elements);
 return {version:1,name:raw.name,params,custom,elements,actualGap:expected.actualGap};
}
