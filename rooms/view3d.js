import {material} from './materials.js?v=2026-09-30';
import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js?v=2026-09-30';
import {wallFrame,wallPoint,wallPieces,wallPolygon,wallLayerPolygons,doorGeometry,rad} from './model.js?v=2026-09-30';
export class RoomView3D{
 constructor(host,onSelect){
  this.host=host;this.scene=new T.Scene();this.scene.background=new T.Color('#edf2f4');
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;host.append(this.renderer.domElement);
  this.camera=new T.PerspectiveCamera(38,1,1,20000);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI/2-.025;this.controls.minDistance=50;this.controls.maxDistance=12000;
  this.scene.add(new T.HemisphereLight(0xffffff,0x82978c,2.3));const sun=new T.DirectionalLight(0xfff8ed,2.8);sun.position.set(400,1200,600);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-1300,right:1300,top:1300,bottom:-1300,near:1,far:4000});sun.shadow.normalBias=1;this.scene.add(sun);
  this.group=new T.Group();this.scene.add(this.group);this.ray=new T.Raycaster();this.mouse=new T.Vector2();let down;
  this.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  this.renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const b=this.host.getBoundingClientRect();this.mouse.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);for(const hit of this.ray.intersectObjects(this.group.children,true)){let obj=hit.object;while(obj&&!obj.userData.id)obj=obj.parent;if(obj?.userData.id){onSelect(obj.userData.id);break;}}});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
  this.renderer.setAnimationLoop(()=>{if(host.hidden)return;this.controls.update();this.renderer.render(this.scene,this.camera);});this.resize();
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
 clear(){while(this.group.children.length){const obj=this.group.children[0];obj.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.group.remove(obj);}}
 material(color,opacity=1){return new T.MeshStandardMaterial({color,roughness:.8,metalness:.02,transparent:opacity<1,opacity,depthWrite:opacity===1});}
 box(parent,w,h,d,x,y,z,color,opacity=1){if(w<=0||h<=0||d<=0)return;const m=new T.Mesh(new T.BoxGeometry(w,h,d),this.material(color,opacity));m.position.set(x,y,z);m.castShadow=opacity===1;m.receiveShadow=true;parent.add(m);return m;}
 cylinder(parent,r,h,x,y,z,color,sx=1,sz=1){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,32),this.material(color));m.position.set(x,y,z);m.scale.set(sx,1,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 line(parent,pts,color){const geo=new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(...p)));const line=new T.Line(geo,new T.LineBasicMaterial({color}));parent.add(line);return line;}
 polygon(points,color,opacity,y=.5){const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();const mesh=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;this.group.add(mesh);return mesh;}
 update(plan,selected,issues,{lowWalls=true,zones=true}={}){
  this.plan=plan;this.clear();const bad=new Set(issues.filter(i=>i.level==='error').flatMap(i=>i.ids));
  this.box(this.group,plan.floor.width,8,plan.floor.depth,plan.floor.width/2,-4.3,plan.floor.depth/2,'#e1d5bd');
  // Soft plank joints keep the scale legible without external textures.
  for(let y=0;y<=plan.floor.depth;y+=25)this.line(this.group,[[0,.05,y],[plan.floor.width,.05,y]],'#d0c5b0');
  for(const w of plan.walls){const g=new T.Group();g.userData.id=w.id;this.group.add(g);const {l}=wallFrame(w),angle=Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x);
   for(const s of wallPieces(plan,w)){const cap=lowWalls?Math.min(w.height,105):w.height;const h=Math.min(s.h,cap-s.z);if(h<=0)continue;for(const layer of wallLayerPolygons(plan,w,s.start,s.end)){const shape=new T.Shape();layer.polygon.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false}),this.material(material(layer.material).color));m.rotation.x=-Math.PI/2;m.position.y=s.z;m.castShadow=true;m.receiveShadow=true;if(w.id===selected)m.material.emissive.set('#241600');g.add(m);}}
  }
  for(const o of plan.openings){const w=plan.walls.find(w=>w.id===o.wall),{l}=wallFrame(w),c=wallPoint(w,o.t),a=Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x),g=new T.Group();g.userData.id=o.id;this.group.add(g);
   if(o.kind==='door'){
    const d=doorGeometry(plan,o),height=lowWalls?Math.min(o.height,95):o.height,dx=d.open.x-d.hinge.x,dy=d.open.y-d.hinge.y;
    const leaf=this.box(g,o.width,height,3,(d.hinge.x+d.open.x)/2,height/2,(d.hinge.y+d.open.y)/2,bad.has(o.id)?'#d9927a':o.id===selected?'#e9bf7d':'#c8b69c');leaf.rotation.y=-Math.atan2(dy,dx);
    if(zones)this.polygon(d.polygon,bad.has(o.id)?'#cf7863':'#8bafa2',.16,1);
   }else{
    const h=lowWalls?Math.max(0,Math.min(o.height,105-o.sill)):o.height;
    if(h>0){const glass=this.box(g,o.width,h,2,c.x,o.sill+h/2,c.y,'#a4cbd4',.4);glass.rotation.y=-a;}
    const sill=this.box(g,o.width+4,3,w.thickness+5,c.x,o.sill,c.y,'#cad8dc');sill.rotation.y=-a;
   }
  }
  for(const f of plan.furniture){const g=new T.Group();g.position.set(f.x,f.z,f.y);g.rotation.y=-rad(f.angle);g.userData.id=f.id;this.group.add(g);const {w,d,h}=f,col=bad.has(f.id)?'#dca28d':f.color;
   const box=(ww,hh,dd,x,y,z,c=col,opacity=1)=>this.box(g,ww,hh,dd,x,y,z,c,opacity);
   const feet=(height)=>{for(const x of [-w/2+7,w/2-7])for(const z of [-d/2+7,d/2-7])box(5,height,5,x,height/2,z,'#8b8070');};
   switch(f.kind){
    case 'table':case 'desk':feet(h-4);box(w,4,d,0,h-2,0);break;
    case 'chair':feet(h*.48);box(w,5,d,0,h*.48,0);box(w,h*.48,5,0,h*.76,-d/2+2.5);break;
    case 'sofa':box(w,h*.44,d,0,h*.3,0);box(w,h*.58,16,0,h*.71,-d/2+8);for(const x of [-w/2+7,w/2-7])box(14,h*.8,d,x,h*.45,0);box(w-30,8,d-20,0,h*.56,7,'#b9cbc3');break;
    case 'bed':box(w,h*.55,d,0,h*.275,0);box(w-3,h*.45,d-4,0,h*.775,0,'#ece9df');box(w+4,Math.min(100,h+35),5,0,Math.min(100,h+35)/2,-d/2,'#b3a18b');for(const x of [-w/4,w/4])box(w*.4,9,35,x,h+4,-d/2+25,'#f9f6ed');break;
    case 'wc':box(w*.78,h*.45,d*.28,0,h*.72,-d*.36,'#eff3f0');this.cylinder(g,w*.43,h*.42,0,h*.21,d*.08,'#e9edec',1,1.45);this.cylinder(g,w*.45,5,0,h*.45,d*.08,'#f6f8f5',1,1.45);break;
    case 'shower':box(w,5,d,0,2.5,0,'#e0e9e9');box(2,h,d,-w/2+1,h/2,0,'#a9d4db',.28);box(w,h,2,0,h/2,-d/2+1,'#a9d4db',.28);this.cylinder(g,4,1,0,5.2,0,'#718b93');break;
    case 'bath':box(w,h,d,0,h/2,0,'#e9f0ed');box(w-16,2,d-15,0,h+1,0,'#adc8ca');break;
    case 'basin':case 'sink':box(w,h-3,d,0,(h-3)/2,0);box(w+2,3,d+2,0,h-1.5,0,'#e7ece6');box(w*.65,1,d*.65,0,h+.5,0,'#9dbac0');box(3,18,3,0,h+9,-d/2+5,'#82959b');break;
    case 'hob':box(w,h,d,0,h/2,0);box(w-4,2,d-4,0,h+1,0,'#52616a');for(const x of [-w*.22,w*.22])for(const z of [-d*.22,d*.22])this.cylinder(g,Math.min(w,d)*.14,1,x,h+2,z,'#929d9f');break;
    case 'washer':box(w,h,d,0,h/2,0,'#e4e9e9');{const circle=new T.Mesh(new T.CylinderGeometry(w*.3,w*.3,3,32),this.material('#697f8c'));circle.rotation.x=Math.PI/2;circle.position.set(0,h*.42,d/2+1);g.add(circle);}break;
    case 'shelf':box(w,4,d,0,2,0);box(4,h,d,-w/2+2,h/2,0);box(4,h,d,w/2-2,h/2,0);box(w,h,3,0,h/2,-d/2+1.5);for(let y=h/4;y<=h;y+=h/4)box(w,3,d,0,y,0);break;
    default:box(w,h,d,0,h/2,0);if(f.kind!=='custom'){for(let x=-w/2+Math.min(60,w);x<w/2;x+=60)this.line(g,[[x,2,d/2+.2],[x,h-2,d/2+.2]],'#a49680');box(Math.min(w*.3,18),2,2,0,h*.7,d/2+1,'#87949a');}
   }
   if(zones&&f.clear>0){const zm=new T.Mesh(new T.PlaneGeometry(w,f.clear),new T.MeshBasicMaterial({color:issues.some(i=>i.type==='clearance'&&i.ids[0]===f.id)?'#ddb871':'#9fbeab',transparent:true,opacity:.19,side:T.DoubleSide,depthWrite:false}));zm.rotation.x=-Math.PI/2;zm.position.set(0,1-f.z,d/2+f.clear/2);g.add(zm);}
   if(f.id===selected){const outline=new T.BoxHelper(g,0xc8953a);this.group.add(outline);}
  }
 }
 fit(){if(!this.plan)return;this.resize();const bounds=new T.Box3().setFromObject(this.group),sphere=bounds.getBoundingSphere(new T.Sphere());const vfov=T.MathUtils.degToRad(this.camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*this.camera.aspect),distance=sphere.radius/Math.sin(Math.min(vfov,hfov)/2)*1.08;this.controls.target.copy(sphere.center);this.camera.position.copy(sphere.center).add(new T.Vector3(.95,1.15,1.12).normalize().multiplyScalar(distance));this.controls.update();}
 zoom(factor){this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();}
}
