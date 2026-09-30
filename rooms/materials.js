export const MATERIALS = [
 ['unknown','Nieokreślony','#c1cbce'],['plaster','Tynk','#e8dfcf'],['brick','Cegła','#c58e77'],['block','Pustak ceramiczny','#d9aa8c'],['aerated','Beton komórkowy','#d6d9cd'],['concrete','Beton','#aab3b7'],['wool','Wełna mineralna','#d8c58c'],['eps','Styropian','#edf0e7'],['gypsum','Płyta g-k','#c3d4d1'],['facade','Elewacja','#ded0b9'],['air','Pustka / ruszt','#cbdde4']
].map(([id,name,color])=>({id,name,color}));
export const material=id=>MATERIALS.find(m=>m.id===id)||MATERIALS[0];
export const WALL_PRESETS=[
 {name:'Tynk / pustak / ocieplenie / elewacja',layers:[['plaster',1.5],['block',25],['eps',20],['facade',.5]]},
 {name:'Ściana z betonu komórkowego',layers:[['plaster',1.5],['aerated',24],['plaster',1.5]]},
 {name:'Ścianka g-k na ruszcie',layers:[['gypsum',1.25],['air',7.5],['gypsum',1.25]]}
];
export const presetLayers=i=>WALL_PRESETS[i].layers.map(([material,thickness])=>({material,thickness}));
export const layersOf=w=>w.layers||[{material:'unknown',thickness:w.thickness}];
export function validateWallLayers(w){
 if(w.layers===undefined)return;
 if(!Array.isArray(w.layers)||!w.layers.length||w.layers.length>12)throw Error('Ściana musi mieć od 1 do 12 warstw.');
 for(const layer of w.layers)if(!layer||!MATERIALS.some(m=>m.id===layer.material)||!Number.isFinite(layer.thickness)||layer.thickness<.1||layer.thickness>100)throw Error('Grubość warstwy: od 0,1 do 100 cm. Wybierz materiał z listy.');
 w.thickness=w.layers.reduce((sum,l)=>sum+l.thickness,0);
}
export function wallQuantities(p,w){
 const gross=Math.hypot(w.b.x-w.a.x,w.b.y-w.a.y)*w.height/10000;
 const openings=p.openings.filter(o=>o.wall===w.id).reduce((sum,o)=>sum+o.width*o.height/10000,0);
 const area=Math.max(0,gross-openings);
 return layersOf(w).map(l=>({...l,area,volume:area*l.thickness/100}));
}
export function materialTotals(p){const totals=new Map();for(const w of p.walls)for(const l of wallQuantities(p,w)){const row=totals.get(l.material)||{material:l.material,area:0,volume:0};row.area+=l.area;row.volume+=l.volume;totals.set(l.material,row);}return [...totals.values()];}
