import {THREAD_DIAMETERS} from './ppr.js';
export const PEX_SIZES=[16,20,25,26,32];
export const PEX_PARTS={
 'pex-pipe':{kind:'pipe',name:'Rura PEX/Al/PEX'},
 'pex-coupling':{kind:'coupling',name:'Mufa PEX · zaprasowywana'},
 'pex-reducer':{kind:'reducer',name:'Redukcja PEX · zaprasowywana',reducing:true},
 'pex-elbow':{kind:'elbow',name:'Kolanko PEX 90° · zaprasowywane'},
 'pex-tee':{kind:'tee',name:'Trójnik PEX · zaprasowywany'},
 'pex-adapter-f':{kind:'coupling',name:'Przejście PEX · zacisk / GW',thread:'female'},
 'pex-adapter-m':{kind:'coupling',name:'Przejście PEX · zacisk / GZ',thread:'male'},
 'pex-elbow-f':{kind:'elbow',name:'Kolanko PEX · zacisk / GW',thread:'female'},
 'pex-elbow-m':{kind:'elbow',name:'Kolanko PEX · zacisk / GZ',thread:'male'},
 'pex-compression-f':{kind:'coupling',name:'Złączka PEX skręcana · GW',thread:'female',compression:true},
 'pex-compression-m':{kind:'coupling',name:'Złączka PEX skręcana · GZ',thread:'male',compression:true}
};
export const pexThreads=d=>({16:['1/2','3/4'],20:['1/2','3/4'],25:['3/4','1'],26:['3/4','1'],32:['1','5/4']}[d]??[]);
export const pexOutlets=d=>PEX_SIZES.filter(n=>n<d);
export function pexData(key,d=20,outlet,thread){
 const part=PEX_PARTS[key];if(!part||!PEX_SIZES.includes(d))throw Error('Nieobsługiwany element lub rozmiar PEX.');
 outlet=part.reducing?(outlet??pexOutlets(d).at(-1)):d;
 if(part.reducing&&!pexOutlets(d).includes(outlet))throw Error('Wybierz mniejszą średnicę PEX.');
 thread=part.thread?(thread??pexThreads(d)[0]):undefined;
 if(part.thread&&!pexThreads(d).includes(thread))throw Error('Niedostępny gwint dla tej średnicy PEX.');
 return {part,geometry:{length:part.kind==='pipe'?1000:d*2.2,radius:d*1.25},technical:{family:'pex',catalogId:key,shapeVersion:1,material:part.kind==='pipe'?'PEX/Al/PEX':'Mosiądz',connection:part.kind==='pipe'?'PEX':part.compression?'Skręcane':'Zaprasowywane',outerDiameter:d,outletDiameter:outlet,threadSize:thread,threadStandard:part.thread?'BSP':undefined,wallThickness:({16:2,20:2,25:2.5,26:3,32:3}[d]),dimensionStatus:'illustrative'}};
}
export function pexPorts(e){
 const part=PEX_PARTS[e.technical.catalogId],d=e.technical.outerDiameter,r=e.geometry.radius;
 const points=e.kind==='elbow'?[[0,0,0],[r,r,0]]:e.kind==='tee'?[[0,0,0],[2*r,0,0],[r,r,0]]:[[0,0,0],[e.geometry.length,0,0]];
 return points.map((point,i)=>{const thread=part.thread&&i===1,diameter=thread?THREAD_DIAMETERS[e.technical.threadSize]:part.reducing&&i===1?e.technical.outletDiameter:d;return {point,direction:i===0?[-1,0,0]:(e.kind==='elbow'||i===2)?[0,1,0]:[1,0,0],type:thread?'thread-'+part.thread:e.kind==='pipe'?'pex-pipe':part.compression?'pex-compression':'pex-press',diameter,insertion:thread?(part.thread==='female'?diameter*.3:0):e.kind==='pipe'?0:diameter*1.1,...(thread?{threadSize:e.technical.threadSize,threadStandard:'BSP'}:{wallThickness:({16:2,20:2,25:2.5,26:3,32:3}[diameter])})};});
}

// Retail selection, independent of the legacy decoder above. No automatic
// Cartesian product of pipe sizes and threads. Evidence: MARKET_AUDIT.md.
export function pexMarketThreads(key,d){
 if(!PEX_PARTS[key]?.thread)return [];
 if(d===26)return ['pex-compression-f','pex-compression-m','pex-adapter-m'].includes(key)?['1']:[];
 if(d===32)return key==='pex-compression-m'?['1','5/4']:['1'];
 if(d===25)return ['3/4','1'];
 return [16,20].includes(d)?['1/2','3/4']:[];
}
export const pexMarketOutlets=d=>({20:[16],25:[20],26:[16,20],32:[16,20,26]}[d]??[]);
export function pexMarketAvailable(key,d,outlet,thread){
 const part=PEX_PARTS[key];if(!part||!PEX_SIZES.includes(d))return false;
 if(part.thread)return pexMarketThreads(key,d).includes(thread);
 if(part.reducing)return pexMarketOutlets(d).includes(outlet);
 return true;
}
