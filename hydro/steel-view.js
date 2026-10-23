import {copperMesh} from './copper-view.js';
import {steelProxy,steelPorts} from './steel.js';
export function steelMesh(e,selected=false,preview=false){
 const ps=steelPorts(e).map(p=>({...p,type:p.type==='steel-press'?'cu-press':p.type==='steel-spigot'?'cu-spigot':p.type}));
 const mesh=copperMesh(steelProxy(e),selected,preview,{press:true,ports:ps});
 if(!preview)mesh.traverse(o=>{if(o.material?.metalness>.5){o.material.color.set(0xc9d0d5);o.material.roughness=.3;o.material.envMapIntensity=.8;o.material.emissive.set(selected?0x252b30:0);}});
 return mesh;
}
