import {layoutCallouts} from './callouts.js';
import {PEX_PARTS} from './pex.js';
import {pexMesh} from './pex-view.js';
import {BRASS_PARTS} from './brass.js';
import {brassMesh} from './brass-view.js';
import {PPR_PARTS} from './ppr.js';
import {pprMesh} from './ppr-view.js';
import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {endpoints,axisLength,cellCenter,cellPlacement,planarPlacement,element,portName} from './model.js';
const catalogMesh=(e,...args)=>e.technical.family==='pex'?pexMesh(e,...args):e.technical.family==='brass'?brassMesh(e,...args):pprMesh(e,...args);
const V=p=>new T.Vector3(...p);
function dispose(group){for(const child of [...group.children]){child.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});group.remove(child);}}
export class HydroView{
 constructor(host,labels,callbacks){
  this.host=host;this.labels=labels;this.cb=callbacks;this.settings={plane:'XZ',level:500,step:100,grid:250,mode:'mist',opacity:.45,dimensions:true};
  this.scene=new T.Scene();this.scene.background=new T.Color('#edf2f4');this.camera=new T.PerspectiveCamera(40,1,1,500000);
  this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minDistance=10;this.controls.maxDistance=200000;
  this.scene.add(new T.HemisphereLight(0xffffff,0x809197,2.5));const light=new T.DirectionalLight(0xfff5df,3);light.position.set(1500,3500,2000);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-4000,right:4000,top:4000,bottom:-4000,near:10,far:12000});light.shadow.normalBias=2;this.scene.add(light);
  const floor=new T.Mesh(new T.PlaneGeometry(20000,20000),new T.MeshStandardMaterial({color:0xe0e8eb,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-2;floor.receiveShadow=true;this.scene.add(floor);const ground=new T.GridHelper(10000,40,0x8eabb6,0xb5c8cf);ground.position.y=-1;this.scene.add(ground);this.floor=floor;this.ground=ground;
  this.joinPreview=new T.Group();this.scene.add(this.joinPreview);this.attachmentPreview=new T.Group();this.scene.add(this.attachmentPreview);this.parts=new T.Group();this.grid=new T.Group();this.measure=new T.Group();this.selection=new T.Group();this.objectHover=new T.Group();this.enclosures=[];this.scene.add(this.parts,this.grid,this.measure,this.selection,this.objectHover);
  this.hover=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1,1,1)),new T.LineBasicMaterial({color:0xc38a32,depthTest:true}));this.hover.add(new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0xe5b65f,transparent:true,opacity:.18,depthWrite:false})));this.preview=new T.Group();this.scene.add(this.preview);this.hover.visible=false;this.scene.add(this.hover);
  this.ray=new T.Raycaster();this.pointer=new T.Vector2();const canvas=this.renderer.domElement;
  // Capture before OrbitControls so element dragging cannot rotate the camera.
  canvas.addEventListener('pointerdown',e=>this.down(e),true);canvas.addEventListener('pointermove',e=>this.move(e),true);canvas.addEventListener('pointerup',e=>this.up(e),true);canvas.addEventListener('pointercancel',()=>this.cancel(),true);canvas.addEventListener('pointerleave',()=>{if(!this.drag){this.hover.visible=false;this.preview.visible=false;this.clearObjectHover();}});
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.makeGrid();this.fit('iso');
  this.renderer.setAnimationLoop(()=>{this.controls.update();this.renderer.render(this.scene,this.camera);this.layoutLabels();});
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
 cast(e){const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);this.ray.setFromCamera(this.pointer,this.camera);}
 placement(point){
  if(this.viewMode&&this.viewMode!=='iso')return planarPlacement(this.tool,point,this.settings.grid,this.settings.plane,this.settings.level,BRASS_PARTS[this.tool]?this.libraryBrassSize:PEX_PARTS[this.tool]?this.libraryPexSize:this.libraryDiameter,BRASS_PARTS[this.tool]?this.libraryBrassOutlet:PEX_PARTS[this.tool]?this.libraryPexOutlet:this.libraryOutlet);
  return {position:cellPlacement(this.tool,point,this.settings.grid,BRASS_PARTS[this.tool]?this.libraryBrassSize:PEX_PARTS[this.tool]?this.libraryPexSize:this.libraryDiameter,BRASS_PARTS[this.tool]?this.libraryBrassOutlet:PEX_PARTS[this.tool]?this.libraryPexOutlet:this.libraryOutlet),rotation:[0,0,0],center:cellCenter(point,this.settings.grid)};
 }
 planePoint(level=this.settings.level){const axis={XZ:1,XY:2,YZ:0}[this.settings.plane],normal=new T.Vector3().setComponent(axis,1);const point=this.ray.ray.intersectPlane(new T.Plane(normal,-level),new T.Vector3());if(point)point.setComponent(axis,level);return point;}
 hit(){
  const direct=this.ray.intersectObjects(this.parts.children,true)[0];if(direct)return direct.object.userData.id;
  const hits=this.enclosures.map(item=>{const point=this.ray.ray.intersectBox(item.box,new T.Vector3());return point?{...item,distance:point.distanceTo(this.ray.ray.origin)}:null;}).filter(Boolean);
  // The visible selected cube wins over overlapping invisible editing volumes.
  return (hits.find(h=>h.id===this.selected)||hits.sort((a,b)=>a.distance-b.distance)[0])?.id;
 }
 hoverElement(id){
  this.hover.visible=false;this.preview.visible=false;
  if(this.hoveredId!==id){dispose(this.objectHover);const mesh=this.parts.children.find(m=>m.userData.id===id);if(mesh)this.enclose(mesh,this.objectHover);this.hoveredId=id;}
  this.objectHover.visible=true;
  // Only one box is drawn when the hovered and selected element are the same.
  this.selection.visible=id!==this.selected;
 }
 clearObjectHover(){this.objectHover.visible=false;this.hoveredId=null;this.selection.visible=true;}

 down(e){if(e.button!==0||this.drag)return;this.cast(e);this.press={x:e.clientX,y:e.clientY,pointer:e.pointerId,moved:false,empty:false};this.hover.visible=false;this.clearObjectHover();if(this.tool){this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);return;}
  const id=this.hit();if(!id){this.press.empty=true;return;}this.cb.select(id);const el=this.project.elements.find(e=>e.id===id),axis={XZ:1,XY:2,YZ:0}[this.settings.plane];const level=el.geometry.position[axis],start=this.planePoint(level);if(!start)return;
  this.drag={id,start,level,origin:[...el.geometry.position],pointer:e.pointerId};this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);this.cb.start();
 }
 move(e){if(this.press&&e.pointerId===this.press.pointer&&Math.hypot(e.clientX-this.press.x,e.clientY-this.press.y)>=6)this.press.moved=true;this.cast(e);if(this.drag){if(e.pointerId!==this.drag.pointer||Math.hypot(e.clientX-this.press.x,e.clientY-this.press.y)<3)return;const p=this.planePoint(this.drag.level);if(p){const delta=p.sub(this.drag.start).toArray();const axis={XZ:1,XY:2,YZ:0}[this.settings.plane];const pos=this.drag.origin.map((n,i)=>i===axis?n:Math.round((n+delta[i])/this.settings.step)*this.settings.step);this.cb.move(this.drag.id,pos);}return;}
  const id=this.hit();if(id){this.hoverElement(id);this.cb.cursor(this.enclosures.find(x=>x.id===id).box.getCenter(new T.Vector3()).toArray());return;}this.clearObjectHover();
  const p=this.planePoint();this.hover.visible=!!p&&this.settings.mode!=='hidden';this.preview.visible=!!p&&!!this.tool;if(p){const size=this.settings.grid,placement=this.placement(p.toArray()),center=placement.center;this.hover.scale.setScalar(size);this.hover.position.fromArray(center);this.preview.position.fromArray(placement.position);this.preview.rotation.set(...placement.rotation.map(n=>n*Math.PI/180));this.cb.cursor(center);}

 }
 up(e){if(!this.press||e.pointerId!==this.press.pointer)return;if(Math.hypot(e.clientX-this.press.x,e.clientY-this.press.y)>=6)this.press.moved=true;if(this.drag){this.drag=null;this.cb.end();}else if(this.tool&&!this.press.moved){this.cast(e);const id=this.hit();if(id){this.cb.select(id);this.cb.endTool?.();}else{const p=this.planePoint();if(p){const placement=this.placement(p.toArray());this.cb.add(this.tool,placement.position,placement.rotation);}}}
  else if(this.press.empty&&!this.press.moved){this.cast(e);if(!this.hit()){this.cb.select(null);this.clearObjectHover();}}
  this.press=null;this.controls.enabled=true;if(this.renderer.domElement.hasPointerCapture(e.pointerId))this.renderer.domElement.releasePointerCapture(e.pointerId);
 }
 cancel(){if(this.drag){this.drag=null;this.cb.cancel();}this.press=null;this.controls.enabled=true;}
 setTool(tool){this.tool=tool;dispose(this.preview);this.preview.visible=false;if(tool&&(PPR_PARTS[tool]||BRASS_PARTS[tool]||PEX_PARTS[tool])){const e=element(tool,[0,0,0],BRASS_PARTS[this.tool]?this.libraryBrassSize:PEX_PARTS[this.tool]?this.libraryPexSize:this.libraryDiameter,BRASS_PARTS[this.tool]?this.libraryBrassOutlet:PEX_PARTS[this.tool]?this.libraryPexOutlet:this.libraryOutlet,PEX_PARTS[this.tool]?this.libraryPexThread:this.libraryThread);this.preview.add(catalogMesh(e,false,true));this.renderer.domElement.style.cursor='crosshair';return;}if(tool){let curve;if(tool==='pipe')curve=new T.LineCurve3(new T.Vector3(),new T.Vector3(1000,0,0));else{curve=new T.Curve();curve.getPoint=t=>new T.Vector3(100*Math.sin(t*Math.PI/2),100*(1-Math.cos(t*Math.PI/2)),0);}const mesh=new T.Mesh(new T.TubeGeometry(curve,tool==='pipe'?1:32,16,16,false),new T.MeshStandardMaterial({color:0xb87c20,transparent:true,opacity:.65,depthWrite:false}));this.preview.add(mesh);}this.renderer.domElement.style.cursor=tool?'crosshair':'auto';}
 makeGrid(){dispose(this.grid);const {grid:s,mode,opacity}=this.settings;this.grid.visible=mode!=='hidden';this.floor.visible=this.ground.visible=mode!=='hidden';const points=[];const half=1000;for(let a=-half;a<=half;a+=s)for(let b=-half;b<=half;b+=s){points.push(-half,a+half,b,half,a+half,b,a,0,b,a,2*half,b,a,b+half,-half,a,b+half,half);}
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(points,3));this.grid.add(new T.LineSegments(geom,new T.LineBasicMaterial({color:0x849ba8,transparent:true,opacity:opacity*(mode==='edit'?.10:.025),depthWrite:false})));this.hover.visible=false;
  // A clearly readable layer of translucent cells gives a front/back reference.
  const axis={XZ:1,XY:2,YZ:0}[this.settings.plane],layer=(Math.floor(this.settings.level/s)+.5)*s;
  const geometry=new T.BoxGeometry(s*.98,s*.98,s*.98),material=new T.MeshStandardMaterial({color:0x86b2c3,transparent:true,opacity:opacity*(mode==='edit'?.055:.012),depthWrite:false,roughness:1});
  const count=Math.round(2000/s),cells=new T.InstancedMesh(geometry,material,count*count),matrix=new T.Matrix4();let index=0;const edges=[];
  const other=[0,1,2].filter(i=>i!==axis);
  for(let a=0;a<count;a++)for(let b=0;b<count;b++){const c=[0,0,0];c[axis]=layer;c[other[0]]=-1000+(a+.5)*s+(other[0]===1?1000:0);c[other[1]]=-1000+(b+.5)*s+(other[1]===1?1000:0);cells.setMatrixAt(index++,matrix.makeTranslation(...c));
   const h=s/2;for(let d=0;d<3;d++){const rest=[0,1,2].filter(i=>i!==d);for(const u of [-h,h])for(const v of [-h,h]){const p=[...c],q=[...c];p[d]-=h;q[d]+=h;p[rest[0]]+=u;q[rest[0]]+=u;p[rest[1]]+=v;q[rest[1]]+=v;edges.push(...p,...q);}}}
  this.grid.add(cells);const edgeGeo=new T.BufferGeometry();edgeGeo.setAttribute('position',new T.Float32BufferAttribute(edges,3));this.grid.add(new T.LineSegments(edgeGeo,new T.LineBasicMaterial({color:0x7295a4,transparent:true,opacity:opacity*(mode==='edit'?.5:.10),depthWrite:false})));
 }
 update(project,selected){this.project=project;this.selected=selected;dispose(this.parts);dispose(this.measure);dispose(this.selection);dispose(this.objectHover);this.enclosures=[];this.clearObjectHover();this.labels.replaceChildren();this.labelPoints=[];this.labelObstacles=[];
  for(const e of project.elements){if(e.technical.family!=='generic'){this.addPpr(e,project,selected);continue;}const g=e.geometry;let curve;if(e.kind==='pipe')curve=new T.LineCurve3(new T.Vector3(),new T.Vector3(g.length,0,0));else{curve=new T.Curve();curve.getPoint=t=>new T.Vector3(g.radius*Math.sin(t*Math.PI/2),g.radius*(1-Math.cos(t*Math.PI/2)),0);}
   const mesh=new T.Mesh(new T.TubeGeometry(curve,e.kind==='pipe'?1:32,e.technical.outerDiameter/2,16,false),new T.MeshStandardMaterial({color:e.id===selected?0xd49a45:e.kind==='elbow'?0x9cbcc5:0x6d97a5,metalness:.3,roughness:.35,side:T.DoubleSide}));mesh.position.fromArray(g.position);mesh.rotation.set(...g.rotation.map(n=>n*Math.PI/180));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.id=e.id;this.parts.add(mesh);
   // Neutral end seams distinguish separate parts without inventing a fitting technology.
   // Local curve tangents orient each ring, including both ends of a bent elbow.
   for(const t of [0,1]){
    const radius=e.technical.outerDiameter/2;
    const rim=new T.Mesh(new T.TorusGeometry(radius,Math.max(.45,Math.min(1.5,radius*.055)),8,32),new T.MeshBasicMaterial({color:e.id===selected?0x79531d:0x345866}));
    rim.position.copy(curve.getPoint(t));rim.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangent(t).normalize());rim.userData.id=e.id;mesh.add(rim);
   }
   mesh.updateMatrixWorld(true);for(let t=0;t<=24;t++)this.labelObstacles.push(mesh.localToWorld(curve.getPoint(t/24)));
   const box=this.enclosureBox(mesh);this.enclosures.push({id:e.id,box});
   if(e.id===selected){this.enclose(mesh);
    endpoints(e).forEach((p,port)=>{const node=document.createElement('button');node.className='port-label';const used=(project.connections??[]).some(c=>[c.a,c.b].some(r=>r.id===e.id&&r.port===port));node.textContent=(port?'B':'A')+(used?' ●':' ＋');node.disabled=used;node.title=used?'Koniec połączony':'Połącz nową lub istniejącą część';node.onclick=()=>this.cb.port?.(e.id,port);this.addCallout(node,V(p),port===0?-1:1);});
   }
   if(e.id===selected&&this.settings.dimensions){    const node=document.createElement('div');node.className='dimension';node.textContent=e.technical.family==='brass'?`${e.name} · ${e.technical.threadSize}″${e.kind==='reducer'?' / '+e.technical.outletThreadSize+'″':''}`:e.kind==='pipe'?`Oś: ${axisLength(e).toFixed(0)} mm · Ø ${e.technical.outerDiameter} mm`:`R osi: ${g.radius} mm · łuk: ${axisLength(e).toFixed(1)} mm`;this.addCallout(node,mesh.localToWorld(curve.getPoint(.5)),0);
   }
  }
 }
 partThumbnail(key){
  if(!this.thumbRenderer){this.thumbRenderer=new T.WebGLRenderer({antialias:true,alpha:true});this.thumbRenderer.setSize(160,100);this.thumbRenderer.setPixelRatio(1);}
  const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0x667777,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-60,100,100);scene.add(light);
  const e=element(key,[0,0,0],32,20);if(e.kind==='pipe')e.geometry.length=130;
  const mesh=catalogMesh(e);scene.add(mesh);const bounds=new T.Box3().setFromObject(mesh),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()).length();
  const camera=new T.PerspectiveCamera(34,1.6,.1,10000);camera.position.copy(center).add(new T.Vector3(-1,.8,1.5).normalize().multiplyScalar(size*2));camera.lookAt(center);this.thumbRenderer.render(scene,camera);const url=this.thumbRenderer.domElement.toDataURL('image/png');dispose(mesh);return url;
 }
 addPpr(e,project,selected){
  const mesh=catalogMesh(e,e.id===selected);this.parts.add(mesh);const box=this.enclosureBox(mesh);this.enclosures.push({id:e.id,box});
  const points=endpoints(e);const obstacle=p=>{p.clearance=e.technical.outerDiameter*.85;this.labelObstacles.push(p);};points.forEach(p=>obstacle(V(p)));for(let i=1;i<points.length;i++)for(let t=1;t<24;t++)obstacle(V(points[0]).lerp(V(points[i]),t/24));
  if(e.id!==selected)return;this.enclose(mesh);
  points.forEach((p,port)=>{const node=document.createElement('button');node.className='port-label';const used=(project.connections??[]).some(c=>[c.a,c.b].some(r=>r.id===e.id&&r.port===port));node.textContent=portName(port)+(used?' ●':' ＋');node.disabled=used;node.title=used?'Koniec połączony':'Dołącz część do króćca';node.onclick=()=>this.cb.port?.(e.id,port);this.addCallout(node,V(p),port===0?-1:1);});
  if(this.settings.dimensions){const node=document.createElement('div');node.className='dimension';node.textContent=e.technical.family==='brass'?`${e.name} · ${e.technical.threadSize}″${e.kind==='reducer'?' / '+e.technical.outletThreadSize+'″':''}`:e.kind==='pipe'?`${e.technical.family==='pex'?'PEX':'PP-R'} Ø ${e.technical.outerDiameter} · ${e.geometry.length} mm`:`${e.name} · ${e.technical.outerDiameter}${e.kind==='reducer'?' / '+e.technical.outletDiameter:''} mm`;
   this.addCallout(node,box.getCenter(new T.Vector3()),0);}
 }
 // Callouts live in screen space: keep text clear of projected parts while orbiting.
 addCallout(node,point,side){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),line=document.createElementNS(ns,'line'),dot=document.createElementNS(ns,'circle');
  svg.classList.add('callout-leader');svg.setAttribute('aria-hidden','true');dot.setAttribute('r','2.5');svg.append(line,dot);this.labels.append(svg,node);this.labelPoints.push({node,point,side,svg,line,dot});
 }
 layoutLabels(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
  const screen=v=>{const p=v.clone().project(this.camera);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2,visible:Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&Math.abs(p.z)<=1};};
  const visible=[];
  for(const l of this.labelPoints||[]){
   const anchor=screen(l.point),show=!!this.selected&&anchor.visible;
   l.node.hidden=!show;l.svg.style.display=show?'':'none';
   if(show)visible.push({label:l,anchor,width:l.node.offsetWidth,height:l.node.offsetHeight});
  }
  const layout=layoutCallouts(visible,w,h,visible.map(p=>p.label.lastLayout));
  visible.forEach((item,i)=>{const l=item.label,pos=layout[i];l.lastLayout=pos;
   l.node.style.left=`${pos.x}px`;l.node.style.top=`${pos.y}px`;
   l.line.setAttribute('x1',item.anchor.x);l.line.setAttribute('y1',item.anchor.y);
   l.line.setAttribute('x2',pos.end.x);l.line.setAttribute('y2',pos.end.y);
   l.dot.setAttribute('cx',item.anchor.x);l.dot.setAttribute('cy',item.anchor.y);
  });
 }
 showJoin(from,to){
  dispose(this.joinPreview);if(!from||!to)return;
  const line=new T.Line(new T.BufferGeometry().setFromPoints([V(from),V(to)]),new T.LineBasicMaterial({color:0x159e72,depthTest:false}));line.renderOrder=20;this.joinPreview.add(line);
  const ring=new T.Mesh(new T.SphereGeometry(22,16,12),new T.MeshBasicMaterial({color:0x20ce99,transparent:true,opacity:.65,depthTest:false}));ring.position.fromArray(to);ring.renderOrder=21;this.joinPreview.add(ring);
 }
 showAttachment(e){
  dispose(this.attachmentPreview);if(!e)return;if(e.technical.family!=='generic'){this.attachmentPreview.add(catalogMesh(e,false,true));return;}const g=e.geometry;let curve;
  if(e.kind==='pipe')curve=new T.LineCurve3(new T.Vector3(),new T.Vector3(g.length,0,0));else{curve=new T.Curve();curve.getPoint=t=>new T.Vector3(g.radius*Math.sin(t*Math.PI/2),g.radius*(1-Math.cos(t*Math.PI/2)),0);}
  const mesh=new T.Mesh(new T.TubeGeometry(curve,e.kind==='pipe'?1:32,e.technical.outerDiameter/2,16,false),new T.MeshStandardMaterial({color:0x20b98a,transparent:true,opacity:.75,depthWrite:false}));mesh.position.fromArray(g.position);mesh.rotation.set(...g.rotation.map(n=>n*Math.PI/180));this.attachmentPreview.add(mesh);
 }
 // Selection is its own persistent volume, independent of the cursor/layer/grid.
 // Bounds include the rendered tube diameter and rotation, including old projects.
 enclosureBox(mesh){
  mesh.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(mesh),center=bounds.getCenter(new T.Vector3()),extent=bounds.getSize(new T.Vector3());
  const side=Math.max(this.settings.grid,extent.x,extent.y,extent.z)+Math.max(40,this.settings.grid*.2);
  return new T.Box3().setFromCenterAndSize(center,new T.Vector3(side,side,side));
 }
 enclose(mesh,target=this.selection){
  const box=this.enclosureBox(mesh),center=box.getCenter(new T.Vector3()),side=box.max.x-box.min.x;
  target.position.copy(center);
  const face=new T.Mesh(new T.BoxGeometry(side,side,side),new T.MeshBasicMaterial({color:0x109cff,transparent:true,opacity:.10,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
  target.add(face);
  // Layered luminous edge tubes work in WebGL without an external bloom pass.
  const h=side/2,core=Math.max(.8,side*.0018);
  for(let axis=0;axis<3;axis++){
   const other=[0,1,2].filter(i=>i!==axis);
   for(const u of [-h,h])for(const v of [-h,h]){
    const a=new T.Vector3(),b=new T.Vector3();a.setComponent(axis,-h);b.setComponent(axis,h);
    a.setComponent(other[0],u);b.setComponent(other[0],u);a.setComponent(other[1],v);b.setComponent(other[1],v);
    for(const [radius,opacity,color] of [[core*5,.045,0x008dff],[core*2.5,.14,0x00baff],[core,1,0x52dfff]]){
     const edge=new T.Mesh(new T.CylinderGeometry(radius,radius,side,8),new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,toneMapped:false}));
     edge.position.copy(a).add(b).multiplyScalar(.5);edge.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());target.add(edge);
    }
   }
  }
 }
 setView(mode){this.viewMode=mode;this.controls.enableRotate=mode==='iso';this.fit(mode);}
 fit(view=this.viewMode??'iso',selectedOnly=false){const target=selectedOnly?this.parts.children.find(m=>m.userData.id===this.selected):this.parts;if(!target)return;const box=new T.Box3().setFromObject(target);if(!selectedOnly&&this.selection.children.length)box.union(new T.Box3().setFromObject(this.selection));const center=box.isEmpty()?new T.Vector3(0,500,0):box.getCenter(new T.Vector3()),size=box.isEmpty()?1200:Math.max(selectedOnly?100:300,box.getSize(new T.Vector3()).length());const distance=size/Math.sin(T.MathUtils.degToRad(20))*Math.max(1,1/this.camera.aspect)*.65;const direction={iso:[1,.8,1],front:[0,0,1],top:[0,1,.0001],side:[1,0,0]}[view];const damping=this.controls.enableDamping;this.controls.enableDamping=false;this.controls.update();this.controls.target.copy(center);this.camera.position.copy(center).add(V(direction).normalize().multiplyScalar(distance));this.camera.lookAt(center);this.controls.update();this.controls.enableDamping=damping;}
}
