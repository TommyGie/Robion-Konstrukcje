// Generic visual library, not a manufacturer's dimensional catalogue.
export const PPR_SIZES=[20,25,32,40,50,63];
export const PPR_PARTS={
 'ppr-pipe':{kind:'pipe',name:'Rura PP-R',icon:'━'},
 'ppr-elbow':{kind:'elbow',name:'Kolanko 90° PP-R',icon:'┗'},
 'ppr-elbow45':{kind:'elbow45',name:'Kolanko 45° PP-R',icon:'╱'},
 'ppr-tee':{kind:'tee',name:'Trójnik PP-R',icon:'┳'},
 'ppr-coupling':{kind:'coupling',name:'Mufa PP-R',icon:'▰'},
 'ppr-reducer':{kind:'reducer',name:'Redukcja mufowa PP-R',icon:'▰━'},
 'ppr-cap':{kind:'cap',name:'Zaślepka PP-R',icon:'▰┃'},
 'ppr-valve':{kind:'valve',name:'Zawór kulowy PP-R',icon:'━┯━'}
};
export function pprData(key,d=25,outlet=20,shapeVersion=2){
 if(![1,2].includes(shapeVersion))throw Error('Nieobsługiwana wersja geometrii PP-R.');
 const part=PPR_PARTS[key];if(!part||!PPR_SIZES.includes(d))throw Error('Nieobsługiwany element lub rozmiar PP-R.');
 if(part.kind==='reducer'&&(!PPR_SIZES.includes(outlet)||outlet>=d))throw Error('Redukcja wymaga mniejszego rozmiaru wyjściowego.');
 return {part,geometry:{length:1000,radius:d*(shapeVersion===2?.75:1.3)},technical:{family:'ppr',shapeVersion,catalogId:key,material:'PP-R',connection:'Zgrzewanie kielichowe',outerDiameter:d,outletDiameter:part.kind==='reducer'?outlet:d,dimensionStatus:'illustrative'}};
}
// Port point = pipe end seated in the socket. Lip extends outward from it.
export function pprPorts(e){
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
