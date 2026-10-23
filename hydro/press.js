import {COPPER_PARTS,COPPER_SIZES,copperData,copperPorts,copperThreads,copperOutlets} from './copper.js';
export const PRESS_SIZES=COPPER_SIZES;
export const PRESS_PARTS=Object.fromEntries(Object.entries(COPPER_PARTS).filter(([key])=>!['copper-bend','copper-bend-street'].includes(key)).map(([key,p])=>[key.replace('copper-','press-'),{...p,base:key,name:p.name.replace('Cu','Cu press').replace('Rura miedziana','Rura miedziana · press').replaceAll('kielich','zacisk')}]));
export const pressThreads=copperThreads;
export const pressOutlets=copperOutlets;
export function pressData(key,d=22,outlet,thread){
 const part=PRESS_PARTS[key];if(!part)throw Error('Nieobsługiwana część Cu press.');
 const data=copperData(part.base,d,outlet,thread,3);
 return {...data,part,geometry:{...data.geometry,length:part.kind==='pipe'?1000:part.kind==='coupling'&&!part.thread?d*.5:part.kind==='reducer'?d*1.25:data.geometry.length,radius:['elbow','elbow45'].includes(part.kind)?d*1.15:part.kind==='tee'?d*.85:data.geometry.radius},technical:{...data.technical,family:'press',catalogId:key,shapeVersion:1,connection:'Zaprasowywanie',application:'Woda'}};
}
export function pressProxy(e){return {...e,technical:{...e.technical,family:'copper',catalogId:PRESS_PARTS[e.technical.catalogId].base,shapeVersion:3,pressTail:PRESS_PARTS[e.technical.catalogId].spigot&&['elbow','elbow45'].includes(e.kind)?e.technical.outerDiameter*.95:0}};}
export function pressPorts(e){return copperPorts(pressProxy(e)).map(p=>({...p,type:p.type==='cu-socket'?'cu-press':p.type,insertion:p.type==='cu-socket'?Math.max(18,p.diameter*.9):p.insertion}));}
