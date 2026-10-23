import {copperMesh} from './copper-view.js';
import {pressProxy,pressPorts} from './press.js';
export function pressMesh(e,selected=false,preview=false){return copperMesh(pressProxy(e),selected,preview,{press:true,ports:pressPorts(e)});}
