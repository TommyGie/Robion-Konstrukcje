// Generic visual library, not a manufacturer's dimensional catalogue.
export const PPR_SIZES=[20,25,32,40,50,63];
export const PPR_PARTS={
 'ppr-street90':{kind:'elbow',name:'Kolanko nyplowe 90° PP-R · kielich–czop',spigot:true,sizes:[20,25,32,40]},
 'ppr-street45':{kind:'elbow45',name:'Kolanko nyplowe 45° PP-R · kielich–czop',spigot:true,sizes:[20,25,32,40]},
 'ppr-adapter-f':{kind:'coupling',name:'Złączka PP-R · GW',thread:'female'},
 'ppr-adapter-m':{kind:'coupling',name:'Złączka PP-R · GZ',thread:'male'},
 'ppr-elbow-f':{kind:'elbow',name:'Kolanko PP-R · GW',thread:'female',sizes:[20,25,32]},
 'ppr-elbow-m':{kind:'elbow',name:'Kolanko PP-R · GZ',thread:'male',sizes:[20,25,32]},
 'ppr-tee-f':{kind:'tee',name:'Trójnik PP-R · GW',thread:'female',sizes:[20,25,32,40]},
 'ppr-tee-m':{kind:'tee',name:'Trójnik PP-R · GZ',thread:'male',sizes:[20,25,32]},
 'ppr-pipe':{kind:'pipe',name:'Rura PP-R',icon:'━'},
 'ppr-elbow':{kind:'elbow',name:'Kolanko 90° PP-R',icon:'┗'},
 'ppr-elbow45':{kind:'elbow45',name:'Kolanko 45° PP-R',icon:'╱'},
 'ppr-tee':{kind:'tee',name:'Trójnik PP-R',icon:'┳'},
 'ppr-coupling':{kind:'coupling',name:'Mufa PP-R',icon:'▰'},
 'ppr-reducer':{kind:'reducer',name:'Redukcja mufowa PP-R',icon:'▰━'},
 'ppr-cap':{kind:'cap',name:'Zaślepka PP-R',icon:'▰┃'},
 'ppr-valve':{kind:'valve',name:'Zawór kulowy PP-R',icon:'━┯━'}
};
export const THREAD_DIAMETERS={'1/2':20.955,'3/4':26.441,'1':33.249,'5/4':41.91,'6/4':47.803,'2':59.614};
export function threadSizes(key,d){
 const part=PPR_PARTS[key];if(!part?.thread||!supportsSize(key,d))return [];
 if(part.kind==='tee')return d===32?['1/2','3/4','1']:['1/2','3/4'];
 if(part.kind==='elbow')return d===32?['3/4','1']:['1/2','3/4'];
 return ({20:['1/2','3/4'],25:['1/2','3/4','1'],32:['3/4','1'],40:['1','5/4'],50:['6/4'],63:['2']})[d]??[];
}
export function supportsSize(key,d){return (PPR_PARTS[key]?.sizes??PPR_SIZES).includes(d);}
export function pprData(key,d=25,outlet=20,shapeVersion=2,threadSize){
 if(![1,2].includes(shapeVersion))throw Error('Nieobsługiwana wersja geometrii PP-R.');
 const part=PPR_PARTS[key];if(!part||!PPR_SIZES.includes(d)||!supportsSize(key,d))throw Error('Nieobsługiwany element lub rozmiar PP-R.');
 if(part.kind==='reducer'&&(!PPR_SIZES.includes(outlet)||outlet>=d))throw Error('Redukcja wymaga mniejszego rozmiaru wyjściowego.');
 const threads=threadSizes(key,d);threadSize??=threads[0];if(part.thread&&!threads.includes(threadSize))throw Error('Nieobsługiwany rozmiar gwintu tej kształtki.');
 return {part,geometry:{length:1000,radius:d*(shapeVersion===2?.75:1.3)},technical:{...(part.thread?{threadSize,threadGender:part.thread,threadStandard:'BSP'}:{}),family:'ppr',shapeVersion,catalogId:key,material:'PP-R',connection:'Zgrzewanie kielichowe',outerDiameter:d,outletDiameter:part.kind==='reducer'?outlet:d,dimensionStatus:'illustrative'}};
}
// Port point = pipe end seated in the socket. Lip extends outward from it.
function basePorts(e){
 const d=e.technical.outerDiameter,r=e.geometry.radius,modern=e.technical.shapeVersion===2,L=d*(modern?(e.kind==='reducer'?.45:.18):1.4);
 const port=(point,direction,diameter=d)=>({point,direction,diameter,type:e.kind==='pipe'?'spigot':'socket',insertion:e.kind==='pipe'?0:diameter*.6});
 const a=port([0,0,0],[-1,0,0]);
 if(e.kind==='pipe')return [a,port([e.geometry.length,0,0],[1,0,0])];
 if(e.kind==='cap')return [a];
 if(e.kind==='elbow')return [a,port([r,r,0],[0,1,0])];
 if(e.kind==='elbow45'){const t=Math.PI/4;return [a,port([r*Math.sin(t),r*(1-Math.cos(t)),0],[Math.cos(t),Math.sin(t),0])];}
 if(e.kind==='tee')return [a,port([2*r,0,0],[1,0,0]),port([r,r,0],[0,1,0])];
 return [a,port([e.kind==='valve'?d*(modern?2.2:3):L,0,0],[1,0,0],e.technical.outletDiameter)];
}

export function pprPorts(e){
 const ps=basePorts(e),part=PPR_PARTS[e.technical.catalogId],d=e.technical.outerDiameter;
 if(part?.spigot){const p=ps[1];p.point=p.point.map((n,i)=>n+p.direction[i]*d*.85);p.type='spigot';p.insertion=0;}
 if(part?.thread){const p=ps[ps.length-1];p.point=p.point.map((n,i)=>n+p.direction[i]*d*.65);p.type='thread-'+part.thread;p.insertion=0;p.threadSize=e.technical.threadSize;p.threadStandard='BSP';p.diameter=THREAD_DIAMETERS[p.threadSize];}
 return ps;
}
