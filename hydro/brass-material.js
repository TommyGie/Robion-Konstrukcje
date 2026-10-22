import * as T from '../vendor/three.module.js';

// Shared neutral studio reflections, independent of the editor's grid/background.
// Linear HDR values preserve bright highlights without painting the metal white.
let environment;
function studioEnvironment(){
 if(environment)return environment;
 const width=256,height=128,data=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height;
  const panel=(cx,cy,sx,sy,power)=>power*Math.exp(-Math.pow((u-cx)/sx,8)-Math.pow((v-cy)/sy,8));
  const light=.12+.22*Math.sin(v*Math.PI)+panel(.2,.46,.085,.26,2.2)+panel(.69,.48,.045,.32,2.8)+panel(.48,.83,.25,.08,1.3);
  const i=(y*width+x)*4;data[i]=light;data[i+1]=light;data[i+2]=light;data[i+3]=1;
 }
 environment=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);
 environment.mapping=T.EquirectangularReflectionMapping;
 environment.colorSpace=T.LinearSRGBColorSpace;
 environment.needsUpdate=true;
 return environment;
}
export function brassMaterial(selected=false,preview=false){
 return new T.MeshStandardMaterial({
  color:preview?0x2db991:0xe7bb78,metalness:preview?.15:.95,roughness:.24,
  envMap:studioEnvironment(),envMapIntensity:1,
  emissive:selected&&!preview?0x392607:0x000000,emissiveIntensity:.12,
  side:T.DoubleSide,transparent:preview,opacity:preview?.65:1
 });
}
