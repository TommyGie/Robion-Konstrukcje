import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {PROFILES,length,cutSlopes} from './model.js?v=0.3.2';
import {magneticTranslation} from './snap.js?v=0.3.2';
export class Viewer {
 constructor(el,onSelect,actions={}){
  this.el=el;this.onSelect=onSelect;this.actions=actions;this.mode='select';this.currentView='front';this.snap=.1;this.magnet=true;this.precision=1;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#f0f1f3');
  this.camera=new THREE.OrthographicCamera(-1300,1300,1300,-1300,.1,100000);this.camera.position.set(2800,2100,4400);
  this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.domElement.setAttribute('aria-label','Interaktywny model 3D. Przeciągnij, aby obrócić.');this.renderer.domElement.tabIndex=0;el.prepend(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.minZoom=.08;this.controls.maxZoom=20;this.controls.target.set(500,900,0);
  this.scene.add(new THREE.HemisphereLight(0xf4f7ff,0x526076,2.8));const light=new THREE.DirectionalLight(0xffffff,3.4);light.position.set(1000,3000,2500);this.scene.add(light);const fill=new THREE.DirectionalLight(0xc7ddff,2);fill.position.set(-2000,1000,-3000);this.scene.add(fill);
  this.grid=new THREE.GridHelper(20000,200,0x9aa1aa,0xb8bdc4);this.grid.material.transparent=true;this.grid.material.opacity=.4;this.scene.add(this.grid);this.group=new THREE.Group();this.scene.add(this.group);this.dimensions=new THREE.Group();this.scene.add(this.dimensions);this.draft=new THREE.Group();this.scene.add(this.draft);this.labels=[];this.showDimensions=true;
  this.ray=new THREE.Raycaster();
  this.handles=['a','move','b'].map(kind=>{
   const button=document.createElement('button');button.className='model-handle handle-'+kind;button.dataset.handle=kind;
   button.setAttribute('aria-label',kind==='move'?'Przesuń zaznaczony element':kind==='a'?'Przesuń początek osi':'Przesuń koniec osi');button.title=button.getAttribute('aria-label')+' · przeciągnij lub użyj strzałek';button.textContent=kind==='move'?'✥':kind==='a'?'A':'B';button.hidden=true;el.append(button);
   button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();this.startDrag(e,kind);});
   button.addEventListener('pointermove',e=>{if(this.drag)this.moveDrag(e);});
   button.addEventListener('pointerup',e=>this.endDrag(e));button.addEventListener('pointercancel',()=>this.cancelGesture());
   button.addEventListener('keydown',e=>{const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};if(!directions[e.key])return;e.preventDefault();const part=this.project.elements.find(p=>p.id===this.selected);if(!part)return;const [x,y]=directions[e.key],delta=new THREE.Vector3(x,y,0).applyQuaternion(this.camera.quaternion).multiplyScalar(this.snap*(e.shiftKey?10:1));this.constrainDelta(delta);const a=new THREE.Vector3(...part.a),b=new THREE.Vector3(...part.b);if(kind!=='b')a.add(delta);if(kind!=='a')b.add(delta);this.actions.onMove?.(part.id,a.toArray(),b.toArray());});return {button,kind};
  });
  this.snapMarker=document.createElement('span');this.snapMarker.className='snap-marker';this.snapMarker.hidden=true;el.append(this.snapMarker);
  const canvas=this.renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.down=[e.clientX,e.clientY];if(this.mode==='move'){const hit=this.hit(e);if(hit){onSelect?.(hit.userData.id);this.startDrag(e,'move');}}});
  canvas.addEventListener('pointermove',e=>{
   if(this.drag){this.moveDrag(e);return;}if(this.currentView!=='front')return;
   const p=this.mode==='draw'?this.drawPoint(e):this.worldPoint(e);if(this.mode!=='draw')this.showSnap(null);this.actions.onCursor?.(p);
   if(this.mode==='draw'&&this.anchor){this.clear(this.draft);this.draft.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([this.anchor,p]),new THREE.LineBasicMaterial({color:0xd79c3b,depthTest:false})));}
  });
  canvas.addEventListener('pointerup',e=>{
   if(e.button!==0)return;if(this.drag){this.endDrag(e);return;}if(!this.down)return;
   const small=Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])<5;this.down=null;if(!small)return;
   if(this.mode==='draw'){const p=this.drawPoint(e);if(this.anchor){if(p.distanceTo(this.anchor)<1)return;this.actions.onAdd?.(this.anchor.toArray(),p.toArray());this.anchor=null;this.clear(this.draft);}else this.anchor=p;this.actions.onDrawStatus?.(!!this.anchor);return;}
   if(this.mode==='select')onSelect?.(this.hit(e)?.userData.id??null);
  });
  canvas.addEventListener('pointercancel',()=>this.cancelGesture());
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(el);this.resize();
  this.renderer.setAnimationLoop(()=>{this.controls.update();this.renderer.render(this.scene,this.camera);this.positionHandles();for(const l of this.labels){const p=l.position.clone().project(this.camera);l.el.style.left=(p.x+1)/2*el.clientWidth+'px';l.el.style.top=(-p.y+1)/2*el.clientHeight+'px';l.el.hidden=!this.showDimensions||p.z>1;}});
 }
 resize(){const w=this.el.clientWidth,h=this.el.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);const k=w/h;this.camera.left=-this.span*k;this.camera.right=this.span*k;this.camera.top=this.span;this.camera.bottom=-this.span;this.camera.updateProjectionMatrix();}
 span=1250;
 clear(group){for(const c of [...group.children]){c.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});group.remove(c);}}
 update(project,selected){
  this.project=project;this.selected=selected;this.clear(this.group);
  for(const e of project.elements){const p=PROFILES[e.profile],x=p.w/2,y=p.h/2,t=p.t;const shape=new THREE.Shape();shape.moveTo(-x,-y);shape.lineTo(x,-y);shape.lineTo(x,y);shape.lineTo(-x,y);shape.closePath();const hole=new THREE.Path();hole.moveTo(-x+t,-y+t);hole.lineTo(-x+t,y-t);hole.lineTo(x-t,y-t);hole.lineTo(x-t,-y+t);hole.closePath();shape.holes.push(hole);
   const geom=new THREE.ExtrudeGeometry(shape,{depth:length(e),bevelEnabled:false,steps:1});
   const position=geom.attributes.position,sa=cutSlopes(e.cuts?.a),sb=cutSlopes(e.cuts?.b);
   for(let i=0;i<position.count;i++){const slope=position.getZ(i)<length(e)/2?sa:sb;position.setZ(i,position.getZ(i)+slope[0]*position.getX(i)+slope[1]*position.getY(i));}position.needsUpdate=true;geom.computeVertexNormals();
   const mat=new THREE.MeshStandardMaterial({color:e.id===selected?0xf5a623:0x677079,metalness:.4,roughness:.5});const mesh=new THREE.Mesh(geom,mat);mesh.position.fromArray(e.a);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3().subVectors(new THREE.Vector3(...e.b),new THREE.Vector3(...e.a)).normalize());mesh.userData.id=e.id;const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geom,25),new THREE.LineBasicMaterial({color:e.id===selected?0xa86a0c:0x38424b,transparent:true,opacity:.7}));mesh.add(edge);this.group.add(mesh);
  }
  if(project.elements.length)this.bounds=new THREE.Box3().setFromObject(this.group);else this.bounds=new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(1000,1000,0));
  this.updateDimensions();
 }
 dimension(a,b,value){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.clone().sub(av).normalize();let perp=Math.abs(dir.x)>.5?new THREE.Vector3(0,18,0):new THREE.Vector3(18,0,0);if(this.currentView==='top')perp=Math.abs(dir.x)>.5?new THREE.Vector3(0,0,18):new THREE.Vector3(18,0,0);if(this.currentView==='side')perp=Math.abs(dir.y)>.5?new THREE.Vector3(0,0,18):new THREE.Vector3(0,18,0);const pts=[av,bv,av.clone().sub(perp),av.clone().add(perp),bv.clone().sub(perp),bv.clone().add(perp)];this.dimensions.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x6d7782})));const label=document.createElement('span');label.className='dimension-label';label.textContent=value.toLocaleString('pl-PL',{minimumFractionDigits:this.precision,maximumFractionDigits:this.precision})+' mm';this.el.append(label);this.labels.push({el:label,position:av.clone().add(bv).multiplyScalar(.5)});}
 updateDimensions(){this.clear(this.dimensions);this.labels.forEach(l=>l.el.remove());this.labels=[];const b=this.bounds;if(!b||!this.project?.elements.length)return;if(this.currentView==='top'){this.dimension([b.min.x,b.max.y,b.max.z+150],[b.max.x,b.max.y,b.max.z+150],b.max.x-b.min.x);this.dimension([b.max.x+150,b.max.y,b.min.z],[b.max.x+150,b.max.y,b.max.z],b.max.z-b.min.z);}else if(this.currentView==='side'){this.dimension([b.max.x,b.min.y-150,b.min.z],[b.max.x,b.min.y-150,b.max.z],b.max.z-b.min.z);this.dimension([b.max.x,b.min.y,b.min.z-150],[b.max.x,b.max.y,b.min.z-150],b.max.y-b.min.y);}else{this.dimension([b.min.x,b.min.y-160,b.max.z],[b.max.x,b.min.y-160,b.max.z],b.max.x-b.min.x);this.dimension([b.max.x+170,b.min.y,b.max.z],[b.max.x+170,b.max.y,b.max.z],b.max.y-b.min.y);}this.dimensions.visible=this.showDimensions;}
 fit(view='front'){this.currentView=view;this.grid.rotation.set(0,0,0);this.grid.position.set(0,-40,0);if(view==='front'){this.grid.rotation.x=Math.PI/2;this.grid.position.set(0,0,-80);}else if(view==='side'){this.grid.rotation.z=Math.PI/2;this.grid.position.set(-80,0,0);}const center=this.bounds?.getCenter(new THREE.Vector3())??new THREE.Vector3(500,900,0);const size=this.bounds?.getSize(new THREE.Vector3())??new THREE.Vector3(1000,1800,40);const width=view==='side'?size.z:size.x,height=view==='top'?size.z:size.y;this.span=Math.max(height,width/(this.el.clientWidth/this.el.clientHeight),400)*.63+180;this.camera.zoom=1;this.camera.up.set(0,1,0);const dirs={'3d':[.8,.48,1.7],front:[0,0,2],top:[0,2,0],side:[2,0,0]};if(view==='top')this.camera.up.set(0,0,-1);this.camera.position.copy(center).add(new THREE.Vector3(...(dirs[view]??dirs['3d'])).multiplyScalar(4000));this.controls.target.copy(center);this.camera.lookAt(center);if(view==='3d'&&this.bounds){const inverse=this.camera.quaternion.clone().invert(),corners=[];for(const x of [this.bounds.min.x,this.bounds.max.x])for(const y of [this.bounds.min.y,this.bounds.max.y])for(const z of [this.bounds.min.z,this.bounds.max.z])corners.push(new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse));const projectedWidth=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),projectedHeight=Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));this.span=Math.max(projectedHeight,projectedWidth/(this.el.clientWidth/this.el.clientHeight),400)*.63+180;}this.controls.enableRotate=view==='3d';this.resize();this.controls.update();this.updateDimensions();}
 hit(e){this.setRay(e);return this.ray.intersectObjects(this.group.children,false)[0]?.object;}
 setRay(e){const r=this.el.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);}
 planeNormal(){const normals={front:[0,0,1],top:[0,1,0],side:[1,0,0]};return normals[this.currentView]?new THREE.Vector3(...normals[this.currentView]):this.camera.getWorldDirection(new THREE.Vector3()).normalize();}
 constrainDelta(delta){const hidden={front:2,top:1,side:0}[this.currentView];if(hidden!==undefined)delta.setComponent(hidden,0);return delta;}
 planePoint(e,anchor=new THREE.Vector3(),normal=new THREE.Vector3(0,0,1)){
  this.setRay(e);return this.ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal,anchor),new THREE.Vector3())??anchor.clone();
 }
 worldPoint(e){const p=this.planePoint(e);if(this.snap){p.x=Math.round(p.x/this.snap)*this.snap;p.y=Math.round(p.y/this.snap)*this.snap;}return p;}
 snapPoints(points,exclude,normal){
  if(!this.magnet){this.showSnap(null);return null;}const targets=[];
  for(const part of this.project.elements){if(part.id===exclude)continue;
   targets.push({point:part.a,label:part.id+' · początek osi'},{point:part.b,label:part.id+' · koniec osi'});
   const a=new THREE.Vector3(...part.a),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...part.b).sub(a).normalize()),inverse=q.clone().invert(),p=PROFILES[part.profile],L=length(part),sa=cutSlopes(part.cuts?.a),sb=cutSlopes(part.cuts?.b);
   const localNormal=normal.clone().applyQuaternion(inverse);
   for(const source of points){const local=new THREE.Vector3(...source).sub(a).applyQuaternion(inverse);
    for(const axis of [0,1])for(const sign of [-1,1]){
     const other=1-axis,half=[p.w/2,p.h/2],corners=[];
     for(const [edge,end] of [[-1,0],[1,0],[1,1],[-1,1]]){const v=new THREE.Vector3();v.setComponent(axis,sign*half[axis]);v.setComponent(other,edge*half[other]);const slope=end?sb:sa;v.z=(end?L:0)+slope[0]*v.x+slope[1]*v.y;corners.push(v);}
     const signed=corners.map(v=>localNormal.dot(v.clone().sub(local))),crossings=[];
     for(let i=0;i<4;i++){const j=(i+1)%4;if(Math.abs(signed[i])<1e-7)crossings.push(corners[i]);if(signed[i]*signed[j]<0)crossings.push(corners[i].clone().lerp(corners[j],signed[i]/(signed[i]-signed[j])));}
     let closest=null,distance=Infinity;
     if(signed.every(d=>Math.abs(d)<1e-7)){
      for(const triangle of [[0,1,2],[0,2,3]]){const candidate=new THREE.Triangle(...triangle.map(i=>corners[i])).closestPointToPoint(local,new THREE.Vector3());const d=candidate.distanceToSquared(local);if(d<distance){closest=candidate;distance=d;}}
     }else if(crossings.length===1)closest=crossings[0].clone();
     else for(let i=0;i<crossings.length;i++)for(let j=i+1;j<crossings.length;j++){const candidate=new THREE.Line3(crossings[i],crossings[j]).closestPointToPoint(local,true,new THREE.Vector3()),d=candidate.distanceToSquared(local);if(d<distance){closest=candidate;distance=d;}}
     if(closest)targets.push({point:closest.applyQuaternion(q).add(a).toArray(),label:part.id+' · ścianka'});
    }
   }
  }
  const best=magneticTranslation(points,targets,12*(this.camera.top-this.camera.bottom)/this.camera.zoom/this.el.clientHeight,normal.toArray());this.showSnap(best?.target);return best;
 }
 showSnap(target){this.snapTarget=target;this.snapMarker.hidden=!target;if(target)this.snapMarker.textContent='⌖ '+target.label;}
 drawPoint(e){let p=this.worldPoint(e);if(e.shiftKey&&this.anchor){if(Math.abs(p.x-this.anchor.x)>Math.abs(p.y-this.anchor.y))p.y=this.anchor.y;else p.x=this.anchor.x;}
  const best=this.snapPoints([p.toArray()],null,new THREE.Vector3(0,0,1));if(best){const next=new THREE.Vector3(...best.target.point);if(!e.shiftKey||!this.anchor||Math.abs(next.x-this.anchor.x)<1e-7||Math.abs(next.y-this.anchor.y)<1e-7)p=next;else this.showSnap(null);}return p;
 }
 startDrag(e,kind){
  this.actions.onGestureStart?.();
  const part=this.project.elements.find(p=>p.id===this.selected);if(!part)return;
  const anchor=kind==='a'?new THREE.Vector3(...part.a):kind==='b'?new THREE.Vector3(...part.b):new THREE.Vector3(...part.a).lerp(new THREE.Vector3(...part.b),.5),normal=this.planeNormal();
  this.drag={kind,part:structuredClone(part),base:this.project,anchor,normal,start:this.planePoint(e,anchor,normal),target:e.currentTarget,pointerId:e.pointerId,moved:false};
  e.currentTarget.setPointerCapture(e.pointerId);this.controls.enabled=false;this.el.classList.add('dragging');
 }
 moveDrag(e){
  const d=this.drag;if(!d)return;let delta=this.planePoint(e,d.anchor,d.normal).sub(d.start);
  // Quantize in the view plane, leaving its depth unchanged.
  delta.applyQuaternion(this.camera.quaternion.clone().invert());delta.x=Math.round(delta.x/this.snap)*this.snap;delta.y=Math.round(delta.y/this.snap)*this.snap;delta.z=0;delta.applyQuaternion(this.camera.quaternion);this.constrainDelta(delta);
  const a=new THREE.Vector3(...d.part.a),b=new THREE.Vector3(...d.part.b);if(d.kind!=='b')a.add(delta);if(d.kind!=='a')b.add(delta);
  const best=this.snapPoints(d.kind==='move'?[a.toArray(),b.toArray()]:[d.kind==='a'?a.toArray():b.toArray()],d.part.id,d.normal);
  if(best){const correction=new THREE.Vector3(...best.delta);if(d.kind!=='b')a.add(correction);if(d.kind!=='a')b.add(correction);}
  d.preview={...d.part,a:a.toArray(),b:b.toArray()};d.moved=Math.hypot(...a.toArray().map((v,i)=>v-d.part.a[i]),...b.toArray().map((v,i)=>v-d.part.b[i]))>1e-8;
  if(length(d.preview)<1)return;
  this.update({...d.base,elements:d.base.elements.map(p=>p.id===d.part.id?d.preview:p)},this.selected);this.actions.onCursor?.(d.kind==='b'?b:a);
 }
 endDrag(e){
  const d=this.drag;if(!d)return;if(e.button!==0)return;
  const preview=d.preview;this.drag=null;this.down=null;if(d.target.hasPointerCapture(d.pointerId))d.target.releasePointerCapture(d.pointerId);this.controls.enabled=this.mode==='select';this.el.classList.remove('dragging');this.showSnap(null);
  this.update(d.base,this.selected);if(d.moved&&preview)this.actions.onMove?.(d.part.id,preview.a,preview.b);
 }
 cancelGesture(){const d=this.drag;this.drag=null;this.down=null;this.anchor=null;this.clear(this.draft);this.showSnap(null);this.controls.enabled=this.mode==='select';this.el.classList.remove('dragging');if(d){if(d.target.hasPointerCapture(d.pointerId))d.target.releasePointerCapture(d.pointerId);this.update(d.base,this.selected);}}
 positionHandles(){
  const part=this.project?.elements.find(p=>p.id===this.selected);
  for(const {button,kind} of this.handles){button.hidden=!part||this.mode==='draw';if(!part)continue;const a=new THREE.Vector3(...part.a),b=new THREE.Vector3(...part.b),p=(kind==='a'?a:kind==='b'?b:a.lerp(b,.5)).project(this.camera);button.style.left=(p.x+1)/2*this.el.clientWidth+'px';button.style.top=(-p.y+1)/2*this.el.clientHeight+'px';button.hidden||=Math.abs(p.x)>1||Math.abs(p.y)>1||p.z>1;}
  if(this.snapTarget){const p=new THREE.Vector3(...this.snapTarget.point).project(this.camera);this.snapMarker.style.left=(p.x+1)/2*this.el.clientWidth+'px';this.snapMarker.style.top=(-p.y+1)/2*this.el.clientHeight+'px';}
 }
 setMode(mode){this.cancelGesture?.();this.mode=mode;this.anchor=null;this.clear(this.draft);this.controls.enabled=mode==='select';this.renderer.domElement.style.cursor=mode==='draw'?'crosshair':mode==='move'?'move':'default';this.actions.onDrawStatus?.(false);}
 zoom(factor){this.camera.zoom=THREE.MathUtils.clamp(this.camera.zoom*factor,.08,20);this.camera.updateProjectionMatrix();}
 toggleDimensions(value){this.showDimensions=value;this.dimensions.visible=value;}
 screenshot(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
}
