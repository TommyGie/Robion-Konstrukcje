import {PROFILES,DEFAULTS,generate,bom,totals,length,validateElement,validateProject,stockLength} from './model.js?v=0.3.2';
import {Viewer} from './viewer.js?v=0.3.2';
const $=id=>document.getElementById(id);
let precision=1,liveEdit=null;
const fmt=(n,d=precision)=>(Math.abs(n)<.5*10**-d?0:n).toLocaleString('pl-PL',{minimumFractionDigits:d,maximumFractionDigits:d}),inputNumber=n=>(Math.abs(n)<.5*10**-precision?0:n).toLocaleString('en-US',{useGrouping:false,minimumFractionDigits:precision,maximumFractionDigits:precision});
const cutText=c=>fmt(c.angle)+'°'+(c.angle===90?'':(c.plane==='width'?' · S':' · W')+(c.flipped?' ↶':''));
let project=generate({...DEFAULTS,template:'table',width:1200,height:850,depth:700,infill:false}),selected=null,viewer,dirty=false;
const history=[],future=[];
const options=ids=>ids.map(id=>`<option value="${id}">${PROFILES[id].name}</option>`).join('');
$('frame').innerHTML=options(['40-2','50-2','60-3','80-3']);$('bar').innerHTML=options(['20-1.5','25-2','30-2']);
function toast(message,error=false){$('toast').textContent=message;$('toast').className='visible'+(error?' error':'');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').className='',4500);}
function render(keepEditor=false){
 const t=totals(project.elements);$('total-count').textContent=t.count;$('total-length').innerHTML=fmt(t.meters)+' <small>m</small>';$('total-mass').innerHTML=fmt(t.mass)+' <small>kg</small>';$('part-count').textContent=t.count+' elementów';$('material-status').textContent=fmt(t.meters)+' m · '+fmt(t.mass)+' kg';$('model-subtitle').textContent=project.name;
 $('gap-info').textContent=project.custom?'Model zmieniony ręcznie. Wstawienie szablonu zastąpi ręcznie zmieniony model.':project.params.infill?`Prześwit w modelu: ${fmt(project.actualGap)} mm`:project.params.template==='table'?'Cztery nogi i cztery belki. Blat dodaj poza listą profili.':'Rama bez wypełnienia.';
 $('gap-info').classList.toggle('project-mode',project.custom);
 $('bom-body').innerHTML=bom(project.elements).map(g=>`<tr><td>□ ${PROFILES[g.profile].name}</td><td>${fmt(g.mm)}</td><td>${fmt(g.axisMm)}</td><td>${g.count}</td><td>${cutText(g.cuts.a)}</td><td>${cutText(g.cuts.b)}</td><td>${fmt(g.mass)}</td></tr>`).join('');
 $('part-list').replaceChildren(...project.elements.map(e=>{const b=document.createElement('button');b.className='part-button'+(selected===e.id?' selected':'');const id=document.createElement('span');id.textContent=e.id;const name=document.createElement('span');name.textContent=e.name;const mm=document.createElement('small');mm.textContent=fmt(length(e))+' mm';b.append(id,name,mm);b.onclick=()=>select(e.id);return b;}));
 viewer?.update(project,selected);if(!keepEditor)renderEditor();else updateEditorNote();
 if($('undo')){$('undo').disabled=!history.length&&!(liveEdit&&JSON.stringify(liveEdit.before)!==JSON.stringify(project));$('redo').disabled=!future.length;}
 $('save-status').textContent=dirty?'Niezapisane zmiany':'Projekt w pamięci · pobierz plik, aby zachować';
}
function select(id){finishEdit();selected=id;if(id&&viewer?.mode==='select')document.body.classList.add('show-elements');render();}
$('generator').onsubmit=e=>{e.preventDefault();try{regenerate({template:$('template').value,depth:$('depth').value,width:$('width').value,height:$('height').value,frame:$('frame').value,bar:$('bar').value,gap:$('gap').disabled?DEFAULTS.gap:$('gap').value,infill:!$('infill').disabled&&$('infill').checked});toast('Konstrukcja i lista cięcia zostały przeliczone.');}catch(err){toast(err.message,true);}};
$('project-name').onchange=()=>commit({...project,name:$('project-name').value.trim()||'Nowa konstrukcja'});
try{viewer=new Viewer($('viewport'),select,{onGestureStart:()=>{finishEdit();if($('edit-form')?.contains(document.activeElement))document.activeElement.blur();},onAdd:(a,b)=>{try{const e=validateElement({id:nextId(),name:'Profil rysowany',profile:$('draw-profile').value,a,b});commit({...project,elements:[...project.elements,e]},e.id);toast('Dodano profil '+e.id+' · '+fmt(length(e))+' mm.');}catch(err){toast(err.message,true);}},onMove:(id,a,b)=>{try{const e=project.elements.find(e=>e.id===id);editParts([{...e,a,b}]);toast('Przesunięto element '+id+'.');}catch(err){render();toast(err.message,true);}},onCursor:p=>{$('cursor-status').textContent='X: '+fmt(p.x)+'  Y: '+fmt(p.y)+' mm';},onDrawStatus:started=>{if(viewer?.mode==='draw')$('canvas-help').textContent=started?'Kliknij koniec profilu · Shift: poziomo / pionowo · Esc: zakończ':'Kliknij początek profilu, potem jego koniec · Esc: zakończ';}});}catch(err){const p=document.createElement('p');p.className='webgl-error';p.textContent='Widok 3D wymaga obsługi WebGL. Edytor i lista materiałów są nadal dostępne.';$('viewport').append(p);console.error(err);}
function changeView(view){document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active',v.dataset.view===view));if(view!=='front')setMode('select');viewer?.fit(view);$('canvas-help').textContent=view==='3d'?'Przeciągnij: obrót · kółko: zoom · prawy przycisk: przesuń':'Kliknij profil, aby go edytować · kółko: zoom · prawy przycisk: przesuń plan';}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>changeView(b.dataset.view));
$('fit').onclick=()=>viewer?.fit(document.querySelector('[data-view].active')?.dataset.view);
$('dimensions').onchange=()=>viewer?.toggleDimensions($('dimensions').checked);
function syncForm(){for(const k of ['template','width','height','depth','frame','bar','gap']){$(k).value=['width','height','depth','gap'].includes(k)?inputNumber(project.params[k]):project.params[k];if($(k).type==='number')$(k).step=10**-precision;}$('infill').checked=project.params.infill;$('project-name').value=project.name;syncTemplateFields();}
function commit(next,selectId=selected,fit=false){
 finishEdit();const valid=validateProject(next);if(JSON.stringify(valid)===JSON.stringify(project))return;pushHistory(project);future.length=0;project=valid;selected=selectId;dirty=true;syncForm();render();if(fit)viewer?.fit(document.querySelector('[data-view].active')?.dataset.view);
}
function regenerate(params){const generated=generate(params),sameTemplate=generated.params.template===project.params.template;commit({...generated,name:sameTemplate?project.name:generated.name},null,true);if(generated.params.template==='table')changeView('3d');return {elements:project.elements.length,actualGap:project.actualGap,...totals(project.elements)};}
function undo(){finishEdit();if(!history.length)return;viewer?.cancelGesture();future.push(structuredClone(project));project=history.pop();if(!project.elements.some(e=>e.id===selected))selected=null;dirty=true;syncForm();render();}
function redo(){finishEdit();if(!future.length)return;viewer?.cancelGesture();history.push(structuredClone(project));project=future.pop();if(!project.elements.some(e=>e.id===selected))selected=null;dirty=true;syncForm();render();}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function coordinateFields(prefix,point){return `<div class="coordinate-grid">${['X','Y','Z'].map((axis,i)=>`<label>${axis}<input aria-label="${prefix==='a'?'Początek':'Koniec'} ${axis}" name="${prefix}${i}" type="number" step="${10**-precision}" min="-20000" max="20000" value="${inputNumber(point[i])}" required></label>`).join('')}</div>`;}
const templatePresets={table:{width:1200,height:850,depth:700,infill:false},frame:{width:1200,height:800,depth:600,infill:false},railing:{width:2000,height:1100,depth:600,infill:true},gate:{width:1000,height:1800,depth:600,infill:true}};
function syncTemplateFields(){
 const kind=$('template').value,hasInfill=['gate','railing'].includes(kind);
 $('depth-field').hidden=kind!=='table';$('depth').disabled=kind!=='table';
 document.querySelectorAll('.infill-field').forEach(el=>{el.hidden=!hasInfill;el.querySelectorAll('input,select').forEach(input=>input.disabled=!hasInfill);});
 $('template-description').textContent={table:'Stelaż przestrzenny z czterema nogami. Wymiary bez blatu.',frame:'Płaska rama z czterech profili, łączona na styk.',railing:'Słupki, pochwyt i szczeble. Dolna poprzeczka 100 mm nad podstawą.',gate:'Skrzydło z ramą i opcjonalnym wypełnieniem. Wymiary bez słupków i luzów.'}[kind];
}
$('template').onchange=()=>{const preset=templatePresets[$('template').value];for(const field of ['width','height','depth'])$(field).value=inputNumber(preset[field]);$('infill').checked=preset.infill;syncTemplateFields();$('gap-info').textContent='Wstaw szablon, aby utworzyć konstrukcję z tych parametrów.';};
function pushHistory(before){history.push(structuredClone(before));if(history.length>60)history.shift();}
function currentElement(){return project.elements.find(e=>e.id===selected);}
function fieldValue(element,name){if(/^[ab][012]$/.test(name))return element[name[0]][Number(name[1])];if(name.startsWith('cut')){const [,end,key]=name.split('-');return element.cuts[end][key];}return element[name];}
function finishEdit(){
 if(!liveEdit)return;const edit=liveEdit;liveEdit=null;
 if(JSON.stringify(edit.before)!==JSON.stringify(project)){pushHistory(edit.before);future.length=0;}
 const e=currentElement(),input=edit.input;
 if(e&&input?.isConnected){const value=fieldValue(e,input.name);if(input.type==='checkbox')input.checked=value;else input.value=typeof value==='number'?inputNumber(value):value;input.removeAttribute('aria-invalid');}
 if(e&&$('edit-form'))for(const end of ['a','b'])for(const key of ['angle','plane','flipped']){const control=$('edit-form').elements['cut-'+end+'-'+key];if(!control)continue;const value=e.cuts[end][key];if(control.type==='checkbox')control.checked=value;else control.value=typeof value==='number'?inputNumber(value):value;}
 if($('edit-error'))$('edit-error').textContent='';
 if($('undo')){$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
}
function cancelEdit(){if(!liveEdit)return;project=liveEdit.before;liveEdit=null;syncForm();render();toast('Przywrócono wartość sprzed edycji pola.');}
function liveInput(input){
 if(!liveEdit)liveEdit={before:structuredClone(project),input};
 try{
  const e=structuredClone(currentElement());if(!e)return;
  if(input.type==='number'&&(input.value===''||!Number.isFinite(input.valueAsNumber)))throw Error('Wpisz poprawną liczbę.');
  if(/^[ab][012]$/.test(input.name))e[input.name[0]][Number(input.name[1])]=input.valueAsNumber;
  else if(input.name.startsWith('cut')){const [,end,key]=input.name.split('-');if(key==='angle')e.cuts[end].flipped=liveEdit.before.elements.find(p=>p.id===e.id).cuts[end].flipped;e.cuts[end][key]=input.type==='checkbox'?input.checked:input.type==='number'?input.valueAsNumber:input.value;}
  else e[input.name]=input.value;
  const valid=validateElement(e);project=validateProject({...project,elements:project.elements.map(p=>p.id===e.id?valid:p)});dirty=true;input.removeAttribute('aria-invalid');$('edit-error').textContent='';render(true);
 }catch(error){input.setAttribute('aria-invalid','true');$('edit-error').textContent=error.message;}
}
function cutFields(end,cut){return `<fieldset class="cut-fields"><legend>${end==='a'?'Cięcie A · początek':'Cięcie B · koniec'}</legend><div class="cut-row"><label>Kąt [°]<input type="number" aria-label="Kąt cięcia ${end.toUpperCase()}" name="cut-${end}-angle" value="${inputNumber(cut.angle)}" step="${10**-precision}" min="0.1" max="179.9" required></label><label>Płaszczyzna<select aria-label="Płaszczyzna cięcia ${end.toUpperCase()}" name="cut-${end}-plane"><option value="width" ${cut.plane==='width'?'selected':''}>S · szerokość</option><option value="height" ${cut.plane==='height'?'selected':''}>W · wysokość</option></select></label></div><label class="check-row"><input type="checkbox" name="cut-${end}-flipped" ${cut.flipped?'checked':''}> Odwróć skos</label></fieldset>`;}
function updateEditorNote(){const e=currentElement();if(!e||!$('element-note'))return;$('element-note').textContent=`Oś: ${fmt(length(e))} mm · do cięcia: ${fmt(stockLength(e))} mm`;
 for(const end of ['a','b']){const c=e.cuts[end];const info=$('cut-result-'+end);if(info)info.textContent=cutText(c);}
}
function renderEditor(){
 const e=currentElement();
 if(!e){$('element-editor').innerHTML='<div class="empty-selection"><span class="select-symbol">⌖</span><strong>Wybierz profil</strong><p>Kliknij element, aby pokazać uchwyty i edytować jego wymiary.</p></div>';return;}
 $('element-editor').innerHTML=`<form id="edit-form" class="element-fields"><h3>${escape(e.id)} · Właściwości profilu</h3><label>Nazwa elementu<input name="name" aria-label="Nazwa elementu" value="${escape(e.name)}" maxlength="80" required></label><label>Przekrój [mm]<select name="profile" aria-label="Przekrój elementu">${options(Object.keys(PROFILES))}</select></label><div class="subheading">A · Początek osi [mm]</div>${coordinateFields('a',e.a)}<div class="subheading">B · Koniec osi [mm]</div>${coordinateFields('b',e.b)}<p id="element-note" class="note-block"></p>${cutFields('a',e.cuts.a)}${cutFields('b',e.cuts.b)}<p class="cut-summary">A: <strong id="cut-result-a"></strong> · B: <strong id="cut-result-b"></strong></p><p class="hint">90° = cięcie proste. Kąt ponad 90° przeliczamy na skos z odwróceniem materiału. S/W to lokalne boki przekroju.</p><p id="edit-error" class="error" role="status"></p><p class="live-note">Zmiany widoczne od razu · Esc anuluje edycję pola</p><button type="button" id="save-element" class="primary full">↓ Zapisz projekt</button><div class="field-actions"><button id="duplicate" type="button">Duplikuj</button><button id="delete" type="button" class="danger">Usuń</button></div></form>`;
 const form=$('edit-form');form.elements.profile.value=e.profile;updateEditorNote();
 form.addEventListener('focusin',event=>{if(!event.target.name)return;if(liveEdit?.input!==event.target)finishEdit();liveEdit={before:structuredClone(project),input:event.target};});
 form.addEventListener('input',event=>{if(event.target.name)liveInput(event.target);});
 form.addEventListener('focusout',event=>{if(liveEdit?.input===event.target)finishEdit();});
 form.onsubmit=event=>{event.preventDefault();finishEdit();};
 $('save-element').onclick=exportProject;
 $('duplicate').onclick=()=>{finishEdit();const source=currentElement(),id=nextId(),copy={...structuredClone(source),id,name:(source.name+' · kopia').slice(0,80),a:source.a.map((v,i)=>v+(i===0?100:0)),b:source.b.map((v,i)=>v+(i===0?100:0))};try{commit({...project,elements:[...project.elements,validateElement(copy)]},id);toast('Kopia przesunięta o 100 mm w osi X.');}catch(err){toast(err.message,true);}};
 $('delete').onclick=removeSelected;
}
function editParts(updates){
 if(!Array.isArray(updates)||!updates.length||updates.length>100)throw Error('Podaj od 1 do 100 elementów.');
 finishEdit();const patch=new Map(updates.map(e=>[e.id,validateElement({...e,cuts:e.cuts??project.elements.find(p=>p.id===e.id)?.cuts})]));if(patch.size!==updates.length)throw Error('Element powtórzony w aktualizacji.');
 for(const id of patch.keys())if(!project.elements.some(e=>e.id===id))throw Error('Nie znaleziono elementu '+id+'.');
 commit({...project,elements:project.elements.map(e=>patch.get(e.id)??e)});return totals(project.elements);
}
function removeSelected(){if(!selected)return;const id=selected;commit({...project,elements:project.elements.filter(e=>e.id!==id)},null);toast('Usunięto '+id+'. Możesz użyć Cofnij.');}
function nextId(){let n=1;while(project.elements.some(e=>e.id==='P'+n))n++;return 'P'+n;}
function showAdd(){
 const d=$('add-dialog');d.innerHTML=`<form id="add-form"><h2>Dodaj profil</h2><p class="hint">Określ przekrój i dwa końce osi. X: szerokość, Y: wysokość, Z: głębokość.</p><label>Nazwa<input name="name" aria-label="Nazwa nowego elementu" value="Profil dodatkowy" maxlength="80" required></label><label>Przekrój [mm]<select name="profile" aria-label="Przekrój nowego elementu">${options(Object.keys(PROFILES))}</select></label><div class="subheading">Początek osi [mm]</div>${coordinateFields('a',[0,0,0])}<div class="subheading">Koniec osi [mm]</div>${coordinateFields('b',[1000,0,0])}<p id="add-error" role="alert" class="hint error"></p><div class="field-actions"><button type="button" id="cancel-add">Anuluj</button><button type="submit" class="primary">Dodaj do modelu</button></div></form>`;
 const form=$('add-form');form.elements.profile.value='40-2';$('cancel-add').onclick=()=>d.close();form.onsubmit=ev=>{ev.preventDefault();try{const f=new FormData(form),e=validateElement({id:nextId(),name:String(f.get('name')),profile:String(f.get('profile')),a:[0,1,2].map(i=>Number(f.get('a'+i))),b:[0,1,2].map(i=>Number(f.get('b'+i)))});commit({...project,elements:[...project.elements,e]},e.id,true);d.close();toast('Dodano profil '+e.id+'.');}catch(err){$('add-error').textContent=err.message;}};d.showModal();
}
function button(id,label,handler,classes=''){const b=document.createElement('button');b.id=id;b.textContent=label;b.className=classes;b.onclick=handler;return b;}
function filename(suffix){return (project.name.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'konstrukcja')+suffix;}
function download(data,mime,name){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([data],{type:mime}));a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}
function exportProject(){finishEdit();download(JSON.stringify(project,null,2),'application/json',filename('.warsztat.json'));dirty=false;render();$('save-status').textContent='Wyeksportowano projekt · zachowaj pobrany plik';toast('Projekt przekazany do pobrania.');}
function csvCell(v){let s=String(v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function exportCsv(){finishEdit();const rows=[['Profil [mm]','Długość do cięcia [mm]','Długość osi [mm]','Sztuki','Masa orientacyjna [kg]','Kąt A [°]','Płaszczyzna A','Odwrócenie A','Kąt B [°]','Płaszczyzna B','Odwrócenie B','Elementy'],...bom(project.elements).map(g=>[PROFILES[g.profile].name,fmt(g.mm),fmt(g.axisMm),g.count,fmt(g.mass),fmt(g.cuts.a.angle),g.cuts.a.plane==='width'?'S':'W',g.cuts.a.flipped?'Tak':'Nie',fmt(g.cuts.b.angle),g.cuts.b.plane==='width'?'S':'W',g.cuts.b.flipped?'Tak':'Nie',g.ids.join(', ')])];download('\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8',filename('-lista-ciecia.csv'));toast('Lista cięcia przekazana do pobrania.');}
$('file-actions').append(button('open-project','Otwórz',()=>$('import-file').click()),button('save-project','↓ Zapisz projekt',exportProject,'primary'));
$('editor-tools').append(button('add-profile','+ Dodaj profil',showAdd,'add'));$('history-controls').append(button('undo','↶',undo),button('redo','↷',redo));$('undo').title='Cofnij (Ctrl / ⌘ Z)';$('undo').setAttribute('aria-label','Cofnij');$('redo').title='Ponów (Ctrl / ⌘ Shift Z)';$('redo').setAttribute('aria-label','Ponów');
$('bom-actions').append(button('csv','↓ CSV',exportCsv),button('print','Drukuj / PDF',()=>window.print()));
$('import-file').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>2_000_000)throw Error('Plik jest zbyt duży. Limit: 2 MB.');const next=validateProject(JSON.parse(await file.text()));commit(next,null,true);dirty=false;render();toast('Wczytano projekt. Poprzednią wersję przywrócisz przyciskiem Cofnij.');}catch(err){toast('Nie udało się wczytać: '+err.message,true);}finally{ev.target.value='';}};
window.addEventListener('keydown',e=>{
 if($('add-dialog').open)return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
 if(e.key==='Escape'){if(viewer?.drag){e.preventDefault();viewer.cancelGesture();return;}if(liveEdit){e.preventDefault();cancelEdit();}else{viewer?.cancelGesture();setMode('select');}return;}
 if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if((e.key==='Delete'||e.key==='Backspace')&&selected){e.preventDefault();removeSelected();}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
$('draw-profile').innerHTML=options(Object.keys(PROFILES));$('draw-profile').value='40-2';
function setMode(mode){if(mode!=='select'&&viewer?.currentView!=='front')changeView('front');viewer?.setMode(mode);document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('assembly-options').classList.toggle('drawing',mode==='draw');$('canvas-help').textContent=mode==='draw'?'Kliknij początek profilu, potem jego koniec · Shift: prosto · Esc: zakończ':mode==='move'?'Przeciągnij profil lub uchwyt ✥ · A / B zmieniają końce · Esc: anuluj':'Kliknij profil · ✥ przesuwa całość · A / B zmieniają końce · kółko: zoom';}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('snap').onchange=()=>{if(viewer)viewer.snap=Number($('snap').value);};
$('magnet').onclick=()=>{const on=$('magnet').getAttribute('aria-pressed')!=='true';$('magnet').setAttribute('aria-pressed',String(on));$('magnet').classList.toggle('active',on);if(viewer){viewer.magnet=on;viewer.showSnap(null);}toast(on?'Magnes włączony · końce osi i ścianki profili.':'Magnes wyłączony.');};
$('precision').onchange=()=>{finishEdit();precision=Number($('precision').value);if(viewer)viewer.precision=precision;const step=10**-precision;$('snap').options[0].value=step;$('snap').options[0].textContent=fmt(step)+' mm';if($('snap').selectedIndex===0&&viewer)viewer.snap=step;syncForm();render();toast('Dokładność wyświetlania: '+fmt(step)+' mm.');};
function panelToggle(className,force){document.body.classList.toggle(className,force);setTimeout(()=>viewer?.fit(document.querySelector('[data-view].active')?.dataset.view),0);}
$('toggle-generator').onclick=()=>panelToggle('show-generator',!document.body.classList.contains('show-generator'));
$('toggle-elements').onclick=()=>panelToggle('show-elements',!document.body.classList.contains('show-elements'));
$('toggle-bom').onclick=()=>panelToggle('show-bom',!document.body.classList.contains('show-bom'));
$('close-elements').onclick=()=>panelToggle('show-elements',false);$('close-bom').onclick=()=>panelToggle('show-bom',false);
$('zoom-in').onclick=()=>viewer?.zoom(1.25);$('zoom-out').onclick=()=>viewer?.zoom(.8);
$('empty-scene').onclick=()=>{commit({...project,name:'Nowa konstrukcja',elements:[]},null,true);document.body.classList.remove('show-generator');setMode('draw');toast('Pusta scena. Wybierz profil i wskaż dwa punkty na planie.');};

if(window.innerWidth>760)document.body.classList.add('show-generator');
const mc=document.modelContext;
if(mc?.registerTool){
 const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const cutSchema={type:'object',properties:{angle:{type:'number',minimum:0.1,maximum:179.9},plane:{type:'string',enum:['width','height']},flipped:{type:'boolean'}},required:['angle','plane','flipped'],additionalProperties:false};
 const definitions=[
 {name:'generate_metal_template',title:'Wstaw szablon konstrukcji',description:'Zastąp bieżący model ramą, balustradą, stelażem stołu albo bramą. Wszystkie wymiary zewnętrzne w mm. Można cofnąć. Szablony są punktem wyjścia do ręcznej edycji.',inputSchema:{type:'object',properties:{template:{type:'string',enum:['frame','railing','table','gate']},width:{type:'number',minimum:300,maximum:6000},height:{type:'number',minimum:300,maximum:4000},depth:{type:'number',minimum:300,maximum:4000},frame:{type:'string',enum:['40-2','50-2','60-3','80-3']},bar:{type:'string',enum:['20-1.5','25-2','30-2']},gap:{type:'number',minimum:20,maximum:500},infill:{type:'boolean'}},required:['template','width','height','frame'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>regenerate({...DEFAULTS,...input})},
 {name:'read_metal_project',title:'Odczytaj projekt metalowy',description:'Odczytaj bieżący projekt, wszystkie odcinki profili i podsumowanie materiałów.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({project:structuredClone(project),totals:totals(project.elements),cutList:bom(project.elements)})},
 {name:'regenerate_gate',title:'Przelicz furtkę z wymiarów',description:'Zastąp bieżącą konstrukcję furtką z podanych parametrów. Usuwa ręczne zmiany; można użyć Cofnij. Wymiary w mm, rama i wypełnienie: profile kwadratowe, połączenia na styk, cięcia 90°.',inputSchema:{type:'object',properties:{width:{type:'number',minimum:300,maximum:6000},height:{type:'number',minimum:300,maximum:4000},gap:{type:'number',minimum:20,maximum:500},frame:{type:'string',enum:['40-2','50-2','60-3','80-3']},bar:{type:'string',enum:['20-1.5','25-2','30-2']},infill:{type:'boolean'}},required:['width','height','gap','frame','bar','infill'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{const result=regenerate({...input,template:'gate'});toast('Konstrukcja została przeliczona.');return result;}},
 {name:'update_metal_profiles',title:'Edytuj odcinki profili',description:'Zmień istniejące elementy według ich identyfikatorów. Podaj id, name, profile, a i b (X,Y,Z w mm). Opcjonalne cuts.a i cuts.b: angle (90 = prosto), plane (width/height), flipped. Kąty ponad 90 są normalizowane z odwróceniem; pominięte cięcia pozostają bez zmian. Cała aktualizacja jest odrzucana, jeśli dowolny element jest niepoprawny.',inputSchema:{type:'object',properties:{elements:{type:'array',minItems:1,maxItems:100,items:{type:'object',properties:{id:{type:'string'},name:{type:'string',maxLength:80},profile:{type:'string',enum:Object.keys(PROFILES)},a:{type:'array',items:{type:'number'},minItems:3,maxItems:3},b:{type:'array',items:{type:'number'},minItems:3,maxItems:3},cuts:{type:'object',properties:{a:cutSchema,b:cutSchema},required:['a','b'],additionalProperties:false}},required:['id','name','profile','a','b'],additionalProperties:false}}},required:['elements'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>({totals:editParts(input?.elements)})}
 ];
 for(const definition of definitions){try{Promise.resolve(mc.registerTool(definition,{signal:lifecycle.signal})).catch(e=>console.warn('Rejestracja narzędzia:',e.message));}catch(e){console.warn('Rejestracja narzędzia:',e.message);}}
}
syncForm();render();setMode('select');changeView('3d');
