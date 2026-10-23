import {BRASS_SIZES,brassOutlets} from './brass.js';
import {THREAD_DIAMETERS} from './ppr.js';
export const IRON_SIZES=BRASS_SIZES;
export const ironOutlets=brassOutlets;
const types={
 pipe:{kind:'pipe',name:'Rura stalowa gwintowana',ends:['male','male']},
 coupling:{kind:'coupling',name:'Mufa · GW/GW',ends:['female','female']},
 nipple:{kind:'coupling',name:'Nypel · GZ/GZ',ends:['male','male'],hex:true},
 'elbow-ff':{kind:'elbow',name:'Kolanko 90° · GW/GW',ends:['female','female']},
 'elbow-mf':{kind:'elbow',name:'Kolanko nyplowe 90° · GZ/GW',ends:['male','female']},
 tee:{kind:'tee',name:'Trójnik · GW/GW/GW',ends:['female','female','female']},
 cross:{kind:'cross',name:'Czwórnik · 4 × GW',ends:['female','female','female','female']},
 'reducer-ff':{kind:'reducer',name:'Mufa redukcyjna · GW/GW',ends:['female','female'],reducing:true},
 'reducer-mm':{kind:'reducer',name:'Nypel redukcyjny · GZ/GZ',ends:['male','male'],reducing:true,hex:true},
 bushing:{kind:'reducer',name:'Redukcja · GZ/GW',ends:['male','female'],reducing:true,hex:true},
 'union-ff':{kind:'coupling',name:'Śrubunek prosty · GW/GW',ends:['female','female'],union:true},
 'union-mf':{kind:'coupling',name:'Śrubunek nyplowy · GW/GZ',ends:['female','male'],union:true},
 cap:{kind:'cap',name:'Zaślepka · GW',ends:['female'],hex:true},
 plug:{kind:'cap',name:'Korek · GZ',ends:['male'],hex:true}
};
export const IRON_PARTS=Object.fromEntries(['galvanized','black'].flatMap(finish=>Object.entries(types).map(([type,part])=>['iron-'+finish+'-'+type,{...part,finish,type}])));
const pipeOD={'1/2':21.3,'3/4':26.9,'1':33.7,'5/4':42.4,'6/4':48.3,'2':60.3};
export function ironData(key,size='3/4',outlet,shapeVersion=2){
 if(![1,2].includes(shapeVersion))throw Error('Nieobsługiwana wersja kształtki stalowej.');
 const part=IRON_PARTS[key];if(!part||!IRON_SIZES.includes(size))throw Error('Nieobsługiwana część stalowa lub gwint.');
 outlet=part.reducing?(outlet??ironOutlets(size).at(-1)):size;
 if(part.reducing&&!ironOutlets(size).includes(outlet))throw Error('Wybierz mniejszy gwint redukcji.');
 const d=THREAD_DIAMETERS[size],pipe=part.kind==='pipe';
 return {part,geometry:{length:pipe?1000:d*(part.type==='bushing'?.65:part.union?2.5:1.6),radius:d*(shapeVersion>=2&&part.kind==='tee'?.72:.95)},technical:{family:'iron',catalogId:key,shapeVersion,material:pipe?'Stal węglowa':'Żeliwo ciągliwe',finish:part.finish,connection:'Gwint',threadStandard:'BSP',threadSize:size,outletThreadSize:outlet,outerDiameter:pipe?(pipeOD[size]??d):d,outletDiameter:THREAD_DIAMETERS[outlet],dimensionStatus:'illustrative'}};
}
export function ironPorts(e){
 const part=IRON_PARTS[e.technical.catalogId],r=e.geometry.radius,L=e.geometry.length;
 const extension=(e.technical.shapeVersion??1)>=2&&part.type==='elbow-mf'?e.technical.outerDiameter*.35:0;
 const points=e.kind==='cap'?[[0,0,0]]:e.kind==='elbow'?[[-extension,0,0],[r,r,0]]:['tee','cross'].includes(e.kind)?[[0,0,0],[2*r,0,0],[r,r,0],...(e.kind==='cross'?[[r,-r,0]]:[])]:[[0,0,0],[L,0,0]];
 return points.map((point,i)=>{const size=part.reducing&&i===1?e.technical.outletThreadSize:e.technical.threadSize,d=THREAD_DIAMETERS[size];return {point,direction:i===0?[-1,0,0]:i===3?[0,-1,0]:(e.kind==='elbow'||i===2)?[0,1,0]:[1,0,0],type:'thread-'+part.ends[i],threadSize:size,threadStandard:'BSP',diameter:d,insertion:part.ends[i]==='female'?d*.3:0};});
}
