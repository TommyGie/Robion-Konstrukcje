import {MATERIALS} from './materials.js?v=2026-09-30';
// Schematic material symbols, not a declaration of drafting-standard compliance.
const symbols={
 unknown:'<path d="M0 8H16"/>',
 plaster:'<path d="M-4 16L16-4M4 20L20 4"/>',
 brick:'<path d="M0 0H16M0 8H16M8 0V8M0 8V16M16 8V16"/>',
 block:'<path d="M1 2H15V14H1Z M5 2V14M11 2V14"/>',
 aerated:'<circle cx="4" cy="4" r="1.4"/><circle cx="12" cy="12" r="2"/>',
 concrete:'<path d="M2 2L6 3 3 7Z M10 9L14 13 9 14Z"/><circle cx="12" cy="3" r=".7"/>',
 wool:'<path d="M0 8Q4-5 8 8T16 8"/>',
 eps:'<circle cx="4" cy="4" r="2.6"/><circle cx="12" cy="12" r="2.6"/>',
 gypsum:'<path d="M3 0V16M6 0V16"/>',
 facade:'<path d="M0 0L16 16M0 16L16 0"/>',
 air:'<path d="M0 8H4M10 8H14"/>'
};
export function materialPatterns(){return MATERIALS.map(m=>`<pattern id="mat-${m.id}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${m.color}"/><g fill="none" stroke="#52616b" stroke-width=".7" opacity=".7">${symbols[m.id]}</g></pattern>`).join('');}
export function materialKey(){return `<details class="material-key"><summary>Legenda materiałów</summary><p>Wzory umowne · warstwy w rzeczywistej proporcji grubości</p><svg width="0" height="0" aria-hidden="true"><defs>${materialPatterns().replaceAll('id="mat-','id="key-')}</defs></svg>${MATERIALS.map(m=>`<span><svg width="34" height="22" aria-hidden="true"><rect width="34" height="22" fill="url(#key-${m.id})"/></svg>${m.name}</span>`).join('')}</details>`;}
