import {THREAD_DIAMETERS} from './ppr.js';
export const COPPER_SIZES=[15,18,22,28];
export const COPPER_PARTS={
 'copper-pipe':{kind:'pipe',name:'Rura miedziana'},
 'copper-elbow':{kind:'elbow',name:'Kolanko Cu 90° · kielich/kielich'},
 'copper-bend':{kind:'elbow',name:'Łuk Cu 90° · kielich/kielich',long:true},
 'copper-bend-street':{kind:'elbow',name:'Łuk Cu 90° · kielich/czop',long:true,spigot:true},
 'copper-street':{kind:'elbow',name:'Kolanko Cu 90° · kielich/czop',spigot:true},
 'copper-elbow45':{kind:'elbow45',name:'Kolanko Cu 45° · kielich/kielich'},
 'copper-street45':{kind:'elbow45',name:'Kolanko Cu 45° · kielich/czop',spigot:true},
 'copper-coupling':{kind:'coupling',name:'Mufa Cu'},
 'copper-reducer':{kind:'reducer',name:'Redukcja Cu · kielich/kielich',reducing:true},
 'copper-spigot-reducer':{kind:'reducer',name:'Redukcja Cu · czop/kielich',reducing:true,spigot:true},
 'copper-tee':{kind:'tee',name:'Trójnik Cu'},
 'copper-tee-reduced':{kind:'tee',name:'Trójnik Cu · odejście redukcyjne',reducing:true},
 'copper-cap':{kind:'cap',name:'Zaślepka Cu'},
 'copper-adapter-f':{kind:'coupling',name:'Przejście Cu / GW',thread:'female'},
 'copper-adapter-m':{kind:'coupling',name:'Przejście Cu / GZ',thread:'male'}
};
export const copperOutlets=d=>({18:[15],22:[15,18],28:[18,22]}[d]??[]);
export const copperThreads=d=>({15:['1/2'],18:['1/2','3/4'],22:['1/2','3/4'],28:['1']}[d]??[]);
export function copperData(key,d=22,outlet,thread,version=3){
 if(![1,2,3].includes(version))throw Error('Nieobsługiwana wersja modelu Cu.');
 const part=COPPER_PARTS[key];if(!part||!COPPER_SIZES.includes(d))throw Error('Nieobsługiwany rozmiar miedzi.');
 outlet=part.reducing?(outlet??copperOutlets(d).at(-1)):d;
 if(part.reducing&&!copperOutlets(d).includes(outlet))throw Error('Wybierz mniejszą średnicę miedzi.');
 thread=part.thread?(thread||copperThreads(d)[0]):undefined;
 if(part.thread&&!copperThreads(d).includes(thread))throw Error('Wybierz zgodny gwint.');
 return {part,geometry:{length:part.kind==='pipe'?1000:version>=2&&key==='copper-coupling'?d*.15:version>=3&&part.kind==='reducer'?d*(part.spigot?1.15:.65):d*2.3,radius:version>=3&&part.kind==='tee'?d*.65:version>=2&&['elbow','elbow45'].includes(part.kind)&&!part.long?d*.8:d*1.3},technical:{family:'copper',catalogId:key,shapeVersion:version,material:'Miedź',connection:'Lutowanie',outerDiameter:d,outletDiameter:outlet,threadSize:thread,threadStandard:part.thread?'BSP':undefined,wallThickness:1,dimensionStatus:'illustrative'}};
}
export function copperPorts(e){
 const p=COPPER_PARTS[e.technical.catalogId],d=e.technical.outerDiameter,r=e.geometry.radius,a=e.kind==='elbow45'?Math.PI/4:Math.PI/2,bend=['elbow','elbow45'].includes(e.kind);
 const tail=e.technical.pressTail??(e.technical.shapeVersion>=3&&e.technical.catalogId==='copper-street45'?d*.75:0);
 const points=bend?[[0,0,0],[r*Math.sin(a)+tail*Math.cos(a),r*(1-Math.cos(a))+tail*Math.sin(a),0]]:e.kind==='tee'?[[0,0,0],[2*r,0,0],[r,r,0]]:e.kind==='cap'?[[0,0,0]]:[[0,0,0],[e.geometry.length,0,0]];
 return points.map((point,i)=>{const thread=p.thread&&i===1,small=p.reducing&&i===(e.kind==='tee'?2:1),diameter=thread?THREAD_DIAMETERS[e.technical.threadSize]:small?e.technical.outletDiameter:d;
 const spigot=e.kind==='pipe'||p.spigot&&i===(e.kind==='reducer'?0:1);
 return {point,direction:i===0?[-1,0,0]:bend?[Math.cos(a),Math.sin(a),0]:i===2?[0,1,0]:[1,0,0],type:thread?'thread-'+p.thread:spigot?'cu-spigot':'cu-socket',diameter,insertion:thread?(p.thread==='female'?diameter*.3:0):spigot?0:diameter*.65,...(thread?{threadSize:e.technical.threadSize,threadStandard:'BSP'}:{})};});
}
