// Conservative restrictions for less common combinations checked against shops.
// Keep decoding outside this policy so saved projects remain readable.
export function retailAllowed(key,size,thread){
 if(key==='brass-elbow-mm')return ['1/2','3/4','1'].includes(size);
 if(key==='brass-extension')return ['1/2','3/4','1','5/4','6/4'].includes(size);
 if(key==='ppr-tee-m')return (size===25&&thread==='3/4')||(size===32&&thread==='1');
 return true;
}
