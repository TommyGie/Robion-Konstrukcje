// Joint assignment: labels are never positioned independently of their leaders.
export function crosses(a,b,c,d){
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 return cross(a,b,c)*cross(a,b,d)<-1e-6&&cross(c,d,a)*cross(c,d,b)<-1e-6;
}
function permutations(xs){if(!xs.length)return [[]];return xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(rest=>[x,...rest]));}
export function layoutCallouts(items,w,h,previous){
 if(!items.length)return [];
 const pad=12,gap=10,maxW=Math.max(...items.map(p=>p.width)),maxH=Math.max(...items.map(p=>p.height)),n=items.length;
 let best=null;
 for(const side of ['right','left','bottom','top'])for(const order of permutations(items.map((_,i)=>i))){
  const vertical=side==='right'||side==='left',space=vertical?h-104:w-24;
  const total=order.reduce((sum,i)=>sum+(vertical?items[i].height:items[i].width),0)+gap*(n-1);
  if(total>space)continue;
  let cursor=vertical?Math.max(36,(h-48-total)/2):Math.max(pad,(w-total)/2);
  const result=[];
  for(const i of order){const item=items[i];let x,y,end;
   if(vertical){y=cursor+item.height/2;cursor+=item.height+gap;
    x=side==='right'?w-pad-maxW+item.width/2:pad+maxW-item.width/2;
    end={x:side==='right'?w-pad-maxW:pad+maxW,y};
   }else{x=cursor+item.width/2;cursor+=item.width+gap;
    y=side==='bottom'?h-60-maxH+item.height/2:36+maxH-item.height/2;
    end={x,y:side==='bottom'?h-60-maxH:36+maxH};
   }
   result[i]={x,y,end,side,width:item.width,height:item.height};
  }
  let cost=0;
  for(let i=0;i<n;i++){
   const a=items[i].anchor,b=result[i].end;cost+=Math.hypot(a.x-b.x,a.y-b.y);
   if(previous?.[i])cost+=.25*Math.hypot(result[i].x-previous[i].x,result[i].y-previous[i].y);
   for(let j=0;j<n;j++){
    if(j>i&&crosses(a,b,items[j].anchor,result[j].end))cost+=1e7;
    const r=result[j],l=r.x-r.width/2-3,t=r.y-r.height/2-3,rr=r.x+r.width/2+3,bb=r.y+r.height/2+3;
    if(a.x>l&&a.x<rr&&a.y>t&&a.y<bb)cost+=1e6;
    if(i!==j&&[[{x:l,y:t},{x:rr,y:t}],[{x:rr,y:t},{x:rr,y:bb}],[{x:rr,y:bb},{x:l,y:bb}],[{x:l,y:bb},{x:l,y:t}]].some(([c,d])=>crosses(a,b,c,d)))cost+=1e6;
   }
  }
  if(!best||cost<best.cost)best={cost,result};
 }
 return best?.result??items.map((p,i)=>({x:w/2,y:36+i*40,end:{x:w/2,y:36+i*40},width:p.width,height:p.height}));
}
