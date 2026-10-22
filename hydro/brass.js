import {THREAD_DIAMETERS} from './ppr.js';
export const BRASS_SIZES=Object.keys(THREAD_DIAMETERS).sort((a,b)=>THREAD_DIAMETERS[a]-THREAD_DIAMETERS[b]);
export const BRASS_PARTS={
 'brass-coupling':{kind:'coupling',name:'Mufa mosiężna · GW/GW',ends:['female','female']},
 'brass-nipple':{kind:'coupling',name:'Nypel mosiężny · GZ/GZ',ends:['male','male'],hex:true},
 'brass-extension':{kind:'coupling',name:'Przedłużka mosiężna · GW/GZ',ends:['female','male'],long:true},
 'brass-reducer-ff':{kind:'reducer',name:'Mufa redukcyjna · GW/GW',ends:['female','female'],reducing:true},
 'brass-reducer-mm':{kind:'reducer',name:'Nypel redukcyjny · GZ/GZ',ends:['male','male'],reducing:true,hex:true},
 'brass-bushing':{kind:'reducer',name:'Redukcja mosiężna · GZ/GW',ends:['male','female'],reducing:true,hex:true},
 'brass-elbow-ff':{kind:'elbow',name:'Kolanko mosiężne 90° · GW/GW',ends:['female','female']},
 'brass-elbow-mf':{kind:'elbow',name:'Kolanko mosiężne 90° · GZ/GW',ends:['male','female']},
 'brass-elbow-mm':{kind:'elbow',name:'Kolanko mosiężne 90° · GZ/GZ',ends:['male','male']},
 'brass-tee':{kind:'tee',name:'Trójnik mosiężny · GW/GW/GW',ends:['female','female','female']},
 'brass-cap':{kind:'cap',name:'Zaślepka mosiężna · GW',ends:['female'],hex:true},
 'brass-plug':{kind:'cap',name:'Korek mosiężny · GZ',ends:['male'],hex:true}
};
export function brassOutlets(size){return BRASS_SIZES.filter(s=>THREAD_DIAMETERS[s]<THREAD_DIAMETERS[size]);}
export function brassData(key,size='1/2',outlet){
 const part=BRASS_PARTS[key];if(!part||!BRASS_SIZES.includes(size))throw Error('Nieobsługiwany element lub gwint mosiężny.');
 outlet=part.reducing?(outlet??brassOutlets(size).at(-1)):size;
 if(part.reducing&&!brassOutlets(size).includes(outlet))throw Error('Wybierz mniejszy gwint redukcji.');
 const d=THREAD_DIAMETERS[size];
 return {part,geometry:{length:d*(key==='brass-bushing'?.6:part.long?2.6:1.6),radius:d*.95},technical:{family:'brass',catalogId:key,shapeVersion:1,material:'Mosiądz',connection:'Gwint',threadStandard:'BSP',threadSize:size,outletThreadSize:outlet,outerDiameter:d,outletDiameter:THREAD_DIAMETERS[outlet],dimensionStatus:'illustrative'}};
}
export function brassPorts(e){
 const part=BRASS_PARTS[e.technical.catalogId],r=e.geometry.radius,L=e.geometry.length;
 const points=e.kind==='cap'?[[0,0,0]]:e.kind==='elbow'?[[0,0,0],[r,r,0]]:e.kind==='tee'?[[0,0,0],[2*r,0,0],[r,r,0]]:[[0,0,0],[L,0,0]];
 return points.map((point,i)=>{const size=part.reducing&&i===1?e.technical.outletThreadSize:e.technical.threadSize,d=THREAD_DIAMETERS[size];return {point,direction:i===0?[-1,0,0]:(e.kind==='elbow'||i===2)?[0,1,0]:[1,0,0],type:'thread-'+part.ends[i],threadSize:size,threadStandard:'BSP',diameter:d,insertion:part.ends[i]==='female'?d*.3:0};});
}
