import {PRESS_PARTS} from './press.js';
import {copperPorts} from './copper.js';
export const STEEL_SIZES=[15,18,22,28,35,42,54];
export const STEEL_PARTS=Object.fromEntries(Object.entries(PRESS_PARTS).map(([key,p])=>[key.replace('press-','steel-'),{...p,name:p.name.replaceAll('Cu press','Stal press').replace('Rura miedziana · press','Rura stalowa ocynkowana')} ]));
export const steelThreads=d=>({15:['1/2'],18:['1/2','3/4'],22:['3/4'],28:['1'],35:['5/4'],42:['6/4'],54:['2']}[d]??[]);
export const steelOutlets=d=>({18:[15],22:[15,18],28:[18,22],35:[22,28],42:[28,35],54:[35,42]}[d]??[]);
export function steelData(key,d=22,outlet,thread){
 const part=STEEL_PARTS[key];if(!part||!STEEL_SIZES.includes(d))throw Error('Nieobsługiwany rozmiar stali press.');
 outlet=part.reducing?(outlet??steelOutlets(d).at(-1)):d;if(part.reducing&&!steelOutlets(d).includes(outlet))throw Error('Wybierz mniejszą średnicę stali.');
 thread=part.thread?(thread||steelThreads(d)[0]):undefined;if(part.thread&&!steelThreads(d).includes(thread))throw Error('Wybierz zgodny gwint.');
 return {part,geometry:{length:part.kind==='pipe'?1000:part.kind==='coupling'&&!part.thread?d*.5:part.kind==='reducer'?d*1.25:d*2.3,radius:['elbow','elbow45'].includes(part.kind)?d*1.15:part.kind==='tee'?d*.85:d*1.3},technical:{family:'steel',catalogId:key,shapeVersion:1,material:'Stal węglowa ocynkowana',connection:'Zaprasowywanie',application:'Ogrzewanie',outerDiameter:d,outletDiameter:outlet,threadSize:thread,threadStandard:part.thread?'BSP':undefined,wallThickness:d>=42?1.5:1.2,dimensionStatus:'illustrative'}};
}
export function steelProxy(e){return {...e,technical:{...e.technical,family:'copper',catalogId:STEEL_PARTS[e.technical.catalogId].base,shapeVersion:3,pressTail:STEEL_PARTS[e.technical.catalogId].spigot&&['elbow','elbow45'].includes(e.kind)?e.technical.outerDiameter*.95:0}};}
export function steelPorts(e){return copperPorts(steelProxy(e)).map(p=>({...p,type:p.type==='cu-socket'?'steel-press':p.type==='cu-spigot'?'steel-spigot':p.type,insertion:p.type==='cu-socket'?Math.max(18,p.diameter*.9):p.insertion}));}
