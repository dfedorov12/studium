'use strict';
/* ════════════════ State ════════════════ */
const KEY = 'mba-tracker-v1';
const THEME_KEY = 'mba-theme';

function defaultState(){
  const s = {v:2, savedAt:'', start:'', maEcts:'', lastBackup:'',
    wahl:{BWM1:true, BWM2:false}, modules:{}, miles:{}, topics:{}, notes:{}, projects:{}, cards:[],
    lit:{}, peer:{contacts:[], meetings:[], tasks:[]}, log:{}, ectsLog:[]};
  MODULES.forEach(m=>{
    s.modules[m.id] = {status:'offen', grade:'', date:'', examDate:'', notes:''};
    s.topics[m.id] = {};
    s.projects[m.id] = [];
    s.lit[m.id] = {read:{}, own:[]};
  });
  // Standard-Projekte vorbefüllen
  Object.entries(DEFAULT_PROJECTS).forEach(([mid,p])=>{
    s.projects[mid] = [{id:uid(), title:p.title, status:'Idee', deadline:'', todos:p.todos.map(t=>({t, done:false}))}];
  });
  MODULES.filter(m=>m.projektarbeit).forEach(m=>{
    s.projects[m.id] = [{id:uid(), title:'Modulprojektarbeit: '+m.name, status:'Idee', deadline:'', todos:[
      {t:'Thema festlegen', done:false},
      {t:'Literatur sammeln (Zitierweise beachten!)', done:false},
      {t:'Gliederung erstellen', done:false},
      {t:'Schreiben', done:false},
      {t:'Review: Zitation / gendergerechte Sprache prüfen', done:false},
      {t:'Abgeben', done:false}
    ]}];
  });
  return s;
}
function uid(){ return Math.random().toString(36).slice(2,10); }
let state = load();

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    return migrate(JSON.parse(raw));
  }catch(e){ return defaultState(); }
}
function migrate(data){
  const def = defaultState();
  const s = Object.assign(def, data);
  ['modules','topics','projects','notes','lit'].forEach(k=>{ s[k] = Object.assign({}, def[k], data[k]||{}); });
  s.peer = Object.assign({contacts:[], meetings:[], tasks:[]}, data.peer||{});
  s.log = data.log || {};
  s.ectsLog = Array.isArray(data.ectsLog) ? data.ectsLog : [];
  // v1 → v2: LV-Checkboxen entfallen (ersetzt durch Themenbaum); fehlende Modul-Felder auffüllen
  MODULES.forEach(m=>{
    s.modules[m.id] = Object.assign({status:'offen',grade:'',date:'',examDate:'',notes:''}, s.modules[m.id]||{});
    delete s.modules[m.id].lv;
    if(!s.topics[m.id]) s.topics[m.id] = {};
    if(!s.projects[m.id]) s.projects[m.id] = def.projects[m.id]||[];
    if(!s.lit[m.id]) s.lit[m.id] = {read:{}, own:[]};
  });
  s.cards = Array.isArray(data.cards) ? data.cards : [];
  s.v = 2;
  return s;
}
/* Aktivität fürs Statistik-Log: t=Thema, c=Karte, p=Projekt-Schritt */
function logEvent(kind){
  const d = today();
  if(!state.log[d]) state.log[d] = {};
  state.log[d][kind] = (state.log[d][kind]||0)+1;
}
/* ECTS-Verlauf: Punkt anhängen, wenn sich der Bestanden-Stand ändert */
function recordEcts(){
  const done = MODULES.filter(m=>isActive(m) && state.modules[m.id].status==='bestanden')
    .reduce((a,m)=>a+ectsOf(m),0);
  const last = state.ectsLog[state.ectsLog.length-1];
  if(!last || last.e !== done) state.ectsLog.push({d:today(), e:done});
}
let saveTimer = null;
function save(rerender=true){
  recordEcts();
  state.savedAt = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(state));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>fsWriteState().catch(()=>{}), 900);
  if(rerender) render();
}

/* ════════════════ File System Access (lokaler Studienordner) ════════════════ */
let dirHandle = null;
const hasFS = 'showDirectoryPicker' in window;

function idb(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open('mba-fs',1);
    r.onupgradeneeded = ()=>r.result.createObjectStore('kv');
    r.onsuccess = ()=>res(r.result); r.onerror = ()=>rej(r.error);
  });
}
async function idbSet(k,v){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function idbGet(k){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction('kv','readonly'); const q=tx.objectStore('kv').get(k); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); }); }

async function connectFolder(){
  try{
    dirHandle = await window.showDirectoryPicker({mode:'readwrite'});
    await idbSet('dir', dirHandle);
    await fsLoadOrSeed();
    await scanNotes();
    renderFsBar(); render();
    toast('Ordner „'+dirHandle.name+'“ verbunden — Autosave aktiv.');
  }catch(e){ if(e.name!=='AbortError') toast('Ordner-Zugriff fehlgeschlagen: '+e.message); }
}
/* Notizen-Cache für die Volltextsuche */
let notesCache = {};
async function scanNotes(){
  if(!dirHandle) return;
  for(const m of MODULES){
    try{
      const t = await fsReadNote(m.id);
      if(t!==null) notesCache[m.id] = t;
    }catch(e){}
  }
}
async function restoreFolder(){
  if(!hasFS) return;
  try{
    const h = await idbGet('dir');
    if(!h) return;
    if(await h.queryPermission({mode:'readwrite'}) === 'granted'){ dirHandle = h; await fsLoadOrSeed(); await scanNotes(); }
    else {
      // Berechtigung braucht eine User-Geste → Reconnect-Button anbieten
      const bar = document.getElementById('fsbar-note');
      bar.textContent = 'Ordner „'+h.name+'“ gemerkt — klicke „Verbinden“, um den Zugriff zu erneuern.';
      document.getElementById('btn-folder').onclick = async ()=>{
        if(await h.requestPermission({mode:'readwrite'}) === 'granted'){ dirHandle = h; await fsLoadOrSeed(); await scanNotes(); renderFsBar(); render(); toast('Ordner wieder verbunden.'); }
        else connectFolder();
      };
    }
  }catch(e){ /* IndexedDB/Handle nicht verfügbar → ignorieren */ }
  renderFsBar();
}
let fileSavedAt = ''; // savedAt der zuletzt von uns gelesenen/geschriebenen Datei
async function fsLoadOrSeed(){
  try{
    const fh = await dirHandle.getFileHandle('fortschritt.json');
    const txt = await (await fh.getFile()).text();
    const data = JSON.parse(txt);
    fileSavedAt = data.savedAt || '';
    if(data.modules && (!state.savedAt || (data.savedAt||'') > state.savedAt)){
      state = migrate(data);
      localStorage.setItem(KEY, JSON.stringify(state));
    } else if(data.modules && (data.savedAt||'') < state.savedAt){
      await fsWriteState();
    }
  }catch(e){ await fsWriteState(); } // Datei existiert noch nicht → anlegen
}
async function fsWriteState(){
  if(!dirHandle) return;
  const fh = await dirHandle.getFileHandle('fortschritt.json', {create:true});
  // Schreibkonflikt-Schutz: hat ein anderes Gerät (z. B. via OneDrive) inzwischen geschrieben?
  try{
    const onDisk = JSON.parse(await (await fh.getFile()).text());
    if(onDisk.savedAt && fileSavedAt && onDisk.savedAt > fileSavedAt && onDisk.savedAt !== state.savedAt){
      const useDisk = confirm(
        'Achtung: fortschritt.json wurde zwischenzeitlich von einem anderen Gerät geändert ('
        + new Date(onDisk.savedAt).toLocaleString('de-DE') + ').\n\n'
        + 'OK = Stand aus dem Ordner übernehmen (empfohlen)\n'
        + 'Abbrechen = mit dem Stand dieses Geräts überschreiben');
      if(useDisk){
        state = migrate(onDisk);
        fileSavedAt = onDisk.savedAt;
        localStorage.setItem(KEY, JSON.stringify(state));
        render();
        toast('Stand vom anderen Gerät übernommen.');
        return;
      }
    }
  }catch(e){ /* Datei leer/neu */ }
  const w = await fh.createWritable();
  await w.write(JSON.stringify(state, null, 2));
  await w.close();
  fileSavedAt = state.savedAt;
  await rotateBackups();
  const el = document.getElementById('fsbar-note');
  if(el) el.textContent = 'Autosave: '+new Date().toLocaleTimeString('de-DE')+' → fortschritt.json';
}
/* Täglicher Sicherungspunkt in backups/ (beim ersten Speichern des Tages), max. 10 behalten */
async function rotateBackups(){
  try{
    const bdir = await dirHandle.getDirectoryHandle('backups', {create:true});
    const name = 'fortschritt-'+today()+'.json';
    let exists = true;
    try{ await bdir.getFileHandle(name); }catch(e){ exists = false; }
    if(!exists){
      const fh = await bdir.getFileHandle(name, {create:true});
      const w = await fh.createWritable();
      await w.write(JSON.stringify(state, null, 2));
      await w.close();
    }
    const names = [];
    for await (const [n,h] of bdir.entries())
      if(h.kind==='file' && /^fortschritt-\d{4}-\d{2}-\d{2}\.json$/.test(n)) names.push(n);
    names.sort();
    while(names.length > 10) await bdir.removeEntry(names.shift());
  }catch(e){ /* Backups sind best effort */ }
}
async function modDir(mid, create=false){
  if(!dirHandle) return null;
  try{ return await dirHandle.getDirectoryHandle(mid, {create}); }
  catch(e){ return null; }
}
async function fsReadNote(mid){
  const d = await modDir(mid);
  if(!d) return null;
  try{ return await (await (await d.getFileHandle('notizen.md')).getFile()).text(); }
  catch(e){ return null; }
}
async function fsWriteNote(mid, text){
  const d = await modDir(mid, true);
  if(!d) return false;
  const fh = await d.getFileHandle('notizen.md', {create:true});
  const w = await fh.createWritable();
  await w.write(text); await w.close();
  return true;
}
async function fsListFiles(mid){
  const d = await modDir(mid);
  if(!d) return [];
  const out = [];
  for await (const [name, h] of d.entries()){
    if(h.kind==='file' && name!=='notizen.md'){
      const f = await h.getFile();
      out.push({name, size:f.size, handle:h});
    }
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name,'de'));
}
async function fsAddFiles(mid, files){
  const d = await modDir(mid, true);
  if(!d) return 0;
  let n = 0;
  for(const f of files){
    const fh = await d.getFileHandle(f.name, {create:true});
    const w = await fh.createWritable();
    await w.write(f); await w.close(); n++;
  }
  return n;
}
function renderFsBar(){
  const bar = document.getElementById('fsbar');
  const note = document.getElementById('fsbar-note');
  if(!hasFS){
    bar.classList.remove('on');
    document.getElementById('fsbar-path').textContent = 'Dieser Browser kann keine lokalen Ordner (File System Access) — Fallback: localStorage + JSON-Backup.';
    document.getElementById('btn-folder').style.display = 'none';
    return;
  }
  if(dirHandle){
    bar.classList.add('on');
    document.getElementById('fsbar-path').textContent = '📁 '+dirHandle.name+' (verbunden)';
    if(!note.textContent) note.textContent = 'Notizen, Materialien & fortschritt.json liegen in diesem Ordner.';
  } else {
    bar.classList.remove('on');
    document.getElementById('fsbar-path').textContent = 'Kein Studienordner verbunden — Daten nur im Browser.';
    if(!note.textContent) note.textContent = 'Tipp: Ordner in OneDrive anlegen → Sync auf alle Geräte gratis.';
  }
}

/* ════════════════ Mini-Markdown ════════════════ */
function esc(t){ return String(t??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function mdInline(t){
  return t
    .replace(/`([^`]+)`/g, (_,c)=>'<code>'+c+'</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function mdRender(src){
  const lines = esc(src).split(/\r?\n/);
  let html = '', list = null, code = false;
  const closeList = ()=>{ if(list){ html += '</'+list+'>'; list = null; } };
  for(const raw of lines){
    if(raw.startsWith('```')){ closeList(); code = !code; html += code ? '<pre><code>' : '</code></pre>'; continue; }
    if(code){ html += raw+'\n'; continue; }
    const l = raw.trimEnd();
    let m;
    if((m = l.match(/^(#{1,3})\s+(.*)/))){ closeList(); html += `<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`; }
    else if((m = l.match(/^[-*]\s+(.*)/))){ if(list!=='ul'){ closeList(); html+='<ul>'; list='ul'; } html += '<li>'+mdInline(m[1])+'</li>'; }
    else if((m = l.match(/^\d+\.\s+(.*)/))){ if(list!=='ol'){ closeList(); html+='<ol>'; list='ol'; } html += '<li>'+mdInline(m[1])+'</li>'; }
    else if((m = l.match(/^>\s?(.*)/))){ closeList(); html += '<blockquote>'+mdInline(m[1])+'</blockquote>'; }
    else if(l===''){ closeList(); }
    else { closeList(); html += '<p>'+mdInline(l)+'</p>'; }
  }
  closeList(); if(code) html += '</code></pre>';
  return html;
}

/* ════════════════ Helfer ════════════════ */
function isActive(m){ return m.wahl ? !!state.wahl[m.id] : true; }
function autoMaEcts(){
  const others = MODULES.filter(m=>m.id!=='MA' && isActive(m)).reduce((a,m)=>a+m.ects,0);
  return Math.max(0, PROGRAM_ECTS - others);
}
function ectsOf(m){ return m.id==='MA' ? (parseInt(state.maEcts)||autoMaEcts()) : m.ects; }
function unmetDeps(m){ return (m.deps||[]).filter(d => state.modules[d].status!=='bestanden'); }
function topicList(m){ return (m.topics||[]).flatMap((g,gi)=>g.items.map((t,ti)=>({key:gi+'.'+ti, t, g:g.g}))); }
function topicStat(m){
  const all = topicList(m);
  const st = state.topics[m.id]||{};
  return {total:all.length, t1:all.filter(x=>st[x.key]===1).length, t2:all.filter(x=>st[x.key]===2).length};
}
function fmtMonth(off){
  if(!state.start) return '';
  const [y,mo] = state.start.split('-').map(Number);
  const d = new Date(y, mo-1+off-1, 1);
  return MONTHS_DE[d.getMonth()]+' '+d.getFullYear();
}
function today(){ return new Date().toISOString().slice(0,10); }
function monthsElapsed(){
  if(!state.start) return 0;
  const [y,mo] = state.start.split('-').map(Number);
  const now = new Date();
  return Math.max(0,(now.getFullYear()-y)*12 + (now.getMonth()+1-mo));
}
function fmtDate(iso){ return new Date(iso).toLocaleDateString('de-DE'); }
function dueCards(){ const t = today(); return state.cards.filter(c=>(c.due||t)<=t); }
function fmtSize(b){ return b>1048576 ? (b/1048576).toFixed(1)+' MB' : Math.max(1,Math.round(b/1024))+' KB'; }
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 2400);
}

/* ════════════════ Rendering: Übersicht ════════════════ */
let searchTerm = '';
function render(){
  document.getElementById('start').value = state.start;

  const active = MODULES.filter(isActive);
  const total = active.reduce((a,m)=>a+ectsOf(m),0);
  const done  = active.filter(m=>state.modules[m.id].status==='bestanden').reduce((a,m)=>a+ectsOf(m),0);
  const doneCount = active.filter(m=>state.modules[m.id].status==='bestanden').length;
  const runCount  = active.filter(m=>state.modules[m.id].status==='laufend').length;
  const graded = active.filter(m=>state.modules[m.id].status==='bestanden' && state.modules[m.id].grade);
  const avg = graded.length ? (graded.reduce((a,m)=>a+Number(state.modules[m.id].grade)*ectsOf(m),0)/graded.reduce((a,m)=>a+ectsOf(m),0)) : null;
  document.getElementById('stats').innerHTML = `
    <div class="stat"><div class="k">ECTS bestanden</div><div class="v">${done} <small>/ ${total}</small></div></div>
    <div class="stat"><div class="k">Module bestanden</div><div class="v">${doneCount} <small>/ ${active.length}</small></div></div>
    <div class="stat"><div class="k">Aktuell laufend</div><div class="v">${runCount}</div></div>
    <div class="stat"><div class="k">Ø Note (ECTS-gew.)</div><div class="v">${avg?avg.toFixed(2):'–'}</div></div>
    <div class="stat"><div class="k">Lernkarten fällig</div><div class="v">${dueCards().length} <small>/ ${state.cards.length}</small></div></div>`;
  const pct = total ? Math.round(done/total*100) : 0;
  document.getElementById('p-label').textContent = `${done} / ${total} ECTS (${pct} %)`;
  document.getElementById('p-bar').style.width = pct+'%';

  // Bin ich im Plan?
  const chip = document.getElementById('plan-chip');
  if(state.start){
    const [y,mo] = state.start.split('-').map(Number);
    const now = new Date();
    const elapsed = Math.max(0,(now.getFullYear()-y)*12 + (now.getMonth()+1-mo));
    const soll = Math.min(total, Math.round(total*elapsed/PLAN_MONTHS));
    const diff = done - soll;
    chip.style.display = '';
    chip.className = 'plan-chip '+(diff>=0?'ok':'warn');
    chip.textContent = diff>=0 ? `✓ Im Plan (Monat ${elapsed||1}, ${diff>0?'+'+diff+' ECTS':'punktgenau'})` : `△ ${-diff} ECTS hinter Plan (Monat ${elapsed})`;
  } else chip.style.display = 'none';

  // Lernkarten-Widget
  const lb = document.getElementById('learnbox');
  const due = dueCards().length;
  if(due>0){ lb.style.display=''; document.getElementById('learnbox-n').textContent = due; }
  else lb.style.display = 'none';

  // Backup-Hinweis
  const bn = document.getElementById('backup-note');
  if(dirHandle){ bn.textContent = ''; }
  else if(!state.lastBackup){ bn.textContent = '· Noch kein Backup gezogen.'; bn.className='note warn'; }
  else{
    const days = Math.floor((Date.now()-new Date(state.lastBackup).getTime())/86400000);
    bn.textContent = `· Letztes Backup: ${new Date(state.lastBackup).toLocaleDateString('de-DE')}${days>14?' — über 2 Wochen!':''}`;
    bn.className = 'note'+(days>14?' warn':'');
  }

  // Module
  const root = document.getElementById('sections');
  root.innerHTML = '';
  PHASES.forEach(ph=>{
    const mods = MODULES.filter(m=>m.phase===ph.id).filter(matchesSearch);
    if(!mods.length) return;
    const sec = document.createElement('div');
    sec.className = 'section';
    sec.innerHTML = `<h2>${esc(ph.name)}</h2><div class="desc">${esc(ph.desc)}</div><div class="grid"></div>`;
    const grid = sec.querySelector('.grid');
    mods.forEach(m=>grid.appendChild(card(m)));
    root.appendChild(sec);
  });

  // Meilensteine
  const ml = document.getElementById('miles');
  ml.innerHTML = '';
  MILESTONES.forEach((ms,i)=>{
    const row = document.createElement('div');
    const checked = !!state.miles[i];
    row.className = 'mile'+(checked?' done':'');
    row.innerHTML = `<input type="checkbox" ${checked?'checked':''}/><span class="m">${esc(ms.m)}</span><span class="t">${esc(ms.t)}</span><span class="d">${fmtMonth(ms.mm)}</span>`;
    row.querySelector('input').addEventListener('change', e=>{ state.miles[i]=e.target.checked; save(); });
    ml.appendChild(row);
  });

  renderWeek();
  renderStats();
}

/* ── Statistik: Lern-Heatmap + ECTS-Kurve ── */
function renderStats(){
  // Heatmap: letzte 26 Wochen, Spalten = Wochen, Zeilen = Mo–So
  const heat = document.getElementById('heatmap');
  const now = new Date(); now.setHours(12,0,0,0);
  const dow = (now.getDay()+6)%7;            // 0 = Montag
  const end = new Date(now); end.setDate(end.getDate()+(6-dow)); // Sonntag dieser Woche
  const start = new Date(end); start.setDate(start.getDate()-26*7+1);
  let cells = '', total = 0, days = 0;
  for(let w=0; w<26; w++){
    for(let d=0; d<7; d++){
      const dt = new Date(start); dt.setDate(start.getDate()+w*7+d);
      if(dt>now){ cells += '<i style="visibility:hidden"></i>'; continue; }
      const iso = dt.toISOString().slice(0,10);
      const e = state.log[iso];
      const n = e ? Object.values(e).reduce((a,b)=>a+b,0) : 0;
      if(n){ total += n; days++; }
      const lv = n===0?0 : n<=2?1 : n<=5?2 : n<=10?3 : 4;
      cells += `<i class="h${lv}" title="${dt.toLocaleDateString('de-DE')}: ${n} Aktivität${n===1?'':'en'}"></i>`;
    }
  }
  heat.innerHTML = cells;
  document.getElementById('heat-sum').textContent = total
    ? `${total} Aktivitäten an ${days} Tagen (26 Wochen) — Themen, Karten, Projektschritte`
    : 'Noch keine Aktivität erfasst — Themen abhaken, Karten lernen und Projektschritte erledigen füllt die Karte.';

  // ECTS-Kurve: Plan-Linie (linear bis PLAN_MONTHS) vs. Ist (ectsLog)
  const svg = document.getElementById('ectschart');
  if(!state.start){ svg.style.display='none'; document.getElementById('ects-hint').textContent='Studienstart setzen → ECTS-Kurve gegen den Plan.'; return; }
  svg.style.display='';
  document.getElementById('ects-hint').textContent='';
  const totalE = MODULES.filter(isActive).reduce((a,m)=>a+ectsOf(m),0);
  const W=600, H=150, P=26;
  const x = mon=>P+(W-2*P)*Math.min(mon,PLAN_MONTHS)/PLAN_MONTHS;
  const y = e=>H-P+ (P*2-H)*Math.min(e,totalE)/totalE;
  const [sy,sm] = state.start.split('-').map(Number);
  const startMs = new Date(sy, sm-1, 1).getTime();
  const monOf = iso=>Math.max(0,(new Date(iso).getTime()-startMs)/(30.44*86400000));
  // Ist-Stufenlinie
  let pts = `${x(0)},${y(0)}`, lastE = 0;
  state.ectsLog.forEach(p=>{
    const mx = x(monOf(p.d));
    pts += ` ${mx},${y(lastE)} ${mx},${y(p.e)}`;
    lastE = p.e;
  });
  pts += ` ${x(monOf(today()))},${y(lastE)}`;
  const gridM = [6,12,18,24];
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.innerHTML = `
    ${gridM.map(m=>`<line x1="${x(m)}" y1="${y(0)}" x2="${x(m)}" y2="${y(totalE)}" stroke="var(--line)" stroke-dasharray="2 4"/>
      <text x="${x(m)}" y="${H-7}" font-size="9" fill="var(--mut)" text-anchor="middle">M${m}</text>`).join('')}
    <line x1="${x(0)}" y1="${y(0)}" x2="${W-P}" y2="${y(0)}" stroke="var(--line)"/>
    <line x1="${x(0)}" y1="${y(0)}" x2="${x(PLAN_MONTHS)}" y2="${y(totalE)}" stroke="var(--mut)" stroke-dasharray="5 4" stroke-width="1.4"/>
    <polyline points="${pts}" fill="none" stroke="var(--blue)" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="${x(monOf(today()))}" cy="${y(lastE)}" r="3.5" fill="var(--blue)"/>
    <text x="${P}" y="${y(totalE)+4}" font-size="9" fill="var(--mut)">${totalE} ECTS</text>
    <text x="${W-P}" y="${H-7}" font-size="9" fill="var(--mut)" text-anchor="end">M${PLAN_MONTHS}</text>`;
}

/* ── Wochenplaner: „Diese Woche dran“ ── */
function renderWeek(){
  const el = document.getElementById('week');
  const items = [];
  const soon = addDays(today(), 14);

  // Überfällige + nächster Meilenstein
  if(state.start){
    const month = monthsElapsed()+1; // aktueller Studienmonat (1-basiert)
    MILESTONES.forEach((ms,i)=>{
      if(!state.miles[i] && ms.mm < month) items.push({i:'⚠️', t:`Überfällig (${ms.m}): ${ms.t}`});
    });
    const ni = MILESTONES.findIndex((ms,i)=>!state.miles[i] && ms.mm >= month);
    if(ni>=0){
      const ms = MILESTONES[ni];
      const open = (ms.mods||[]).filter(id=>{
        const m = MODULES.find(x=>x.id===id);
        return m && isActive(m) && state.modules[id].status!=='bestanden';
      });
      items.push({i:'🎯', t:`Nächster Meilenstein ${ms.m} (${fmtMonth(ms.mm)}): ${ms.t}`+(open.length?` — dran: ${open.join(', ')}`:''), mod:open[0]});
    }
  } else {
    items.push({i:'💡', t:'Studienstart setzen — dann plane ich dir die Woche.'});
  }

  // Laufende Module mit offenen Themen
  MODULES.filter(m=>isActive(m) && state.modules[m.id].status==='laufend').forEach(m=>{
    const ts = topicStat(m);
    const open = ts.total - ts.t2;
    items.push({i:'📖', t:`Weiter an ${m.id} — ${ts.total ? open+' Themen noch nicht „sitzt“' : 'in Arbeit'}`, mod:m.id});
  });

  // Fällige Lernkarten
  const due = dueCards().length;
  if(due) items.push({i:'🃏', t:`${due} Lernkarte(n) fällig`, learn:true});

  // Prüfungen & Abgaben in den nächsten 14 Tagen
  MODULES.forEach(m=>{
    const ed = state.modules[m.id].examDate;
    if(ed && ed>=today() && ed<=soon) items.push({i:'📝', t:`Prüfung ${m.id} am ${fmtDate(ed)}`, mod:m.id});
    (state.projects[m.id]||[]).forEach(p=>{
      if(p.deadline && p.deadline>=today() && p.deadline<=soon && p.status!=='Abgegeben' && p.status!=='Bewertet')
        items.push({i:'📋', t:`Abgabe „${p.title}“ am ${fmtDate(p.deadline)}`, mod:m.id, tab:'projekte'});
    });
  });

  // PeerGroup-Termine
  (state.peer.meetings||[]).forEach(mt=>{
    if(mt.date && mt.date>=today() && mt.date<=soon) items.push({i:'👥', t:`PeerGroup: ${mt.topic||'Termin'} am ${fmtDate(mt.date)}`, peer:true});
  });

  el.innerHTML = items.length ? '' : '<div class="mile"><span class="t" style="color:var(--mut)">Nichts Dringendes — gönn dir was. 🎉</span></div>';
  items.slice(0,8).forEach(it=>{
    const row = document.createElement('div');
    row.className = 'mile';
    if(it.mod || it.learn || it.peer) row.style.cursor = 'pointer';
    row.innerHTML = `<span style="flex:none">${it.i}</span><span class="t">${esc(it.t)}</span>`;
    row.onclick = ()=>{
      if(it.learn) startLearning(null);
      else if(it.peer) openPeer();
      else if(it.mod) openModal(it.mod, it.tab);
    };
    el.appendChild(row);
  });
}
function matchesSearch(m){
  if(!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  if((m.id+' '+m.name).toLowerCase().includes(q)) return true;
  if(topicList(m).some(x=>x.t.toLowerCase().includes(q))) return true;
  // Volltextsuche in Notizen (Studienordner-Cache bzw. Browser-Kopie)
  const note = notesCache[m.id] ?? state.notes[m.id] ?? '';
  if(note.toLowerCase().includes(q)) return true;
  // Literatur
  const lit = (m.lit||[]).concat((state.lit[m.id]?.own||[]).map(o=>o.t));
  return lit.some(l=>l.toLowerCase().includes(q));
}

function card(m){
  const st = state.modules[m.id];
  const active = isActive(m);
  const deps = unmetDeps(m);
  const ts = topicStat(m);
  const projs = state.projects[m.id]||[];
  const cards = state.cards.filter(c=>c.mod===m.id);
  const noteLen = (state.notes[m.id]||'').length;
  const el = document.createElement('div');
  el.className = 'mod'+(st.status==='bestanden'?' done':'')+(active?'':' inactive');
  const stDef = STATI.find(s=>s.k===st.status);

  const tbar = ts.total ? `<div class="tbar">${topicBarHtml(m, ts)}<span>${ts.t2}/${ts.total}</span></div>` : '';
  const badges = [];
  if(projs.length) badges.push(`📋 ${projs.length} Projekt${projs.length>1?'e':''}`);
  if(cards.length) badges.push(`🃏 ${cards.length} Karten`);
  if(noteLen) badges.push('📝 Notizen');
  if(st.examDate) badges.push('📅 '+new Date(st.examDate).toLocaleDateString('de-DE'));

  el.innerHTML = `
    <div class="head">
      <span class="chip">${esc(m.id)}</span>
      <span class="name">${esc(m.name)}</span>
      <span class="ects">${m.id==='MA' ? ectsOf(m)+' ECTS'+(state.maEcts?'':' (auto)') : m.ects+' ECTS'}</span>
    </div>
    <div class="meta"><b>Prüfung:</b> ${esc(m.exam)}${m.deps.length?` · <b>setzt voraus:</b> ${m.deps.join(', ')}`:''}</div>
    ${m.tip?`<div class="hint">💡 ${esc(m.tip)}</div>`:''}
    ${deps.length && st.status!=='bestanden' && active?`<div class="lock">🔒 wartet auf: ${deps.join(', ')}</div>`:''}
    ${tbar}
    ${badges.length?`<div class="badges">${badges.map(b=>'<span>'+b+'</span>').join('')}</div>`:''}
    <div class="foot">
      <button class="status ${stDef.cls}" title="Status wechseln">${stDef.label}</button>
      ${st.grade?`<span class="grade">Note ${esc(st.grade)}</span>`:''}
      ${m.wahl?`<label class="wahl"><input type="checkbox" ${active?'checked':''}/>gewählt</label>`:''}
    </div>`;

  el.addEventListener('click', e=>{
    if(e.target.closest('.status')||e.target.closest('.wahl')) return;
    openModal(m.id);
  });
  el.querySelector('.status').addEventListener('click', ()=>{
    const i = STATI.findIndex(s=>s.k===st.status);
    st.status = STATI[(i+1)%STATI.length].k;
    save();
  });
  if(m.wahl) el.querySelector('.wahl input').addEventListener('change', e=>{ state.wahl[m.id]=e.target.checked; save(); });
  return el;
}
function topicBarHtml(m, ts){
  const segs = Math.min(ts.total, 12);
  const t2segs = Math.round(ts.t2/ts.total*segs);
  const t1segs = Math.round((ts.t1+ts.t2)/ts.total*segs) - t2segs;
  let h = '';
  for(let i=0;i<segs;i++) h += `<i class="${i<t2segs?'t2':(i<t2segs+t1segs?'t1':'')}"></i>`;
  return h;
}

/* ════════════════ Modul-Detail (Modal) ════════════════ */
let modalMod = null, modalTab = 'themen';
const overlay = document.getElementById('overlay');

function openModal(mid, tab){
  modalMod = mid;
  modalTab = tab || ((MODULES.find(m=>m.id===mid).topics)?'themen':'projekte');
  overlay.classList.add('open');
  renderModal();
}
function closeModal(){ overlay.classList.remove('open'); modalMod = null; render(); }
overlay.addEventListener('click', e=>{ if(e.target===overlay) closeModal(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && overlay.classList.contains('open')) closeModal(); });

function renderModal(){
  const m = MODULES.find(x=>x.id===modalMod);
  const st = state.modules[m.id];
  const tabs = [];
  if(m.topics) tabs.push(['themen','Themen']);
  tabs.push(['notizen','Notizen'],['material','Material'],['literatur','Literatur'],['projekte','Projekte'],['karten','Lernkarten']);
  if(!tabs.some(t=>t[0]===modalTab)) modalTab = tabs[0][0];

  document.getElementById('modal').innerHTML = `
    <div class="mhead">
      <span class="chip" style="margin-top:4px">${esc(m.id)}</span>
      <h3>${esc(m.name)}</h3>
      <button class="x" title="Schließen">✕</button>
    </div>
    <div class="mctl">
      <button class="status ${STATI.find(s=>s.k===st.status).cls}" id="m-status">${STATI.find(s=>s.k===st.status).label}</button>
      <select id="m-grade" title="Note">
        <option value="">Note –</option>${[1,2,3,4,5].map(n=>`<option ${String(n)===st.grade?'selected':''}>${n}</option>`).join('')}
      </select>
      <label style="font-size:.7rem;color:var(--mut);font-weight:600">Abschluss <input type="month" id="m-date" value="${esc(st.date)}"/></label>
      <label style="font-size:.7rem;color:var(--mut);font-weight:600">Prüfungstermin <input type="date" id="m-exam" value="${esc(st.examDate)}"/></label>
      ${m.id==='MA'?`<label style="font-size:.7rem;color:var(--mut);font-weight:600">ECTS <input type="number" id="m-maects" min="1" max="40" value="${esc(state.maEcts)}" placeholder="${autoMaEcts()}" title="leer = automatisch Rest auf ${PROGRAM_ECTS}" style="width:58px;padding:4px 6px"/></label>`:''}
    </div>
    <div class="tabs">${tabs.map(t=>`<button class="tab ${t[0]===modalTab?'active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="tabbody" id="tabbody"></div>`;

  const M = document.getElementById('modal');
  M.querySelector('.x').onclick = closeModal;
  M.querySelector('#m-status').onclick = ()=>{
    const i = STATI.findIndex(s=>s.k===st.status);
    st.status = STATI[(i+1)%STATI.length].k;
    save(false); renderModal();
  };
  M.querySelector('#m-grade').onchange = e=>{ st.grade = e.target.value; save(false); };
  M.querySelector('#m-date').onchange = e=>{ st.date = e.target.value; save(false); };
  M.querySelector('#m-exam').onchange = e=>{ st.examDate = e.target.value; save(false); };
  const ma = M.querySelector('#m-maects'); if(ma) ma.onchange = e=>{ state.maEcts = e.target.value; save(false); };
  M.querySelectorAll('.tab').forEach(b=>b.onclick = ()=>{ modalTab = b.dataset.tab; renderModal(); });

  const body = document.getElementById('tabbody');
  if(modalTab==='themen') renderTopics(m, body);
  if(modalTab==='notizen') renderNotes(m, body);
  if(modalTab==='material') renderMaterial(m, body);
  if(modalTab==='literatur') renderLit(m, body);
  if(modalTab==='projekte') renderProjects(m, body);
  if(modalTab==='karten') renderCards(m, body);
}

/* ── Tab: Literatur ── */
function renderLit(m, body){
  const L = state.lit[m.id];
  body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'ptodos';
  if(m.lit){
    m.lit.forEach((t,i)=>{
      const read = !!L.read[i];
      const lab = document.createElement('label');
      lab.className = read?'c':'';
      lab.innerHTML = `<input type="checkbox" ${read?'checked':''}/><span>📚 ${esc(t)}</span>`;
      lab.querySelector('input').onchange = e=>{ L.read[i] = e.target.checked; save(false); renderLit(m, body); };
      wrap.appendChild(lab);
    });
  } else {
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.textContent = 'Lt. Handbuch: „Festlegung der Literatur im laufenden Lehrbetrieb“ — eigene Quellen unten ergänzen.';
    body.appendChild(ph);
  }
  L.own.forEach((o,i)=>{
    const lab = document.createElement('label');
    lab.className = o.done?'c':'';
    lab.innerHTML = `<input type="checkbox" ${o.done?'checked':''}/><span>✏️ ${esc(o.t)}</span><button class="del" title="entfernen">✕</button>`;
    lab.querySelector('input').onchange = e=>{ o.done = e.target.checked; save(false); renderLit(m, body); };
    lab.querySelector('.del').onclick = e=>{ e.preventDefault(); L.own.splice(i,1); save(false); renderLit(m, body); };
    wrap.appendChild(lab);
  });
  body.appendChild(wrap);
  const addrow = document.createElement('div');
  addrow.className = 'paddrow';
  addrow.innerHTML = `<input placeholder="Eigene Quelle (Autor: Titel / Link) …"/><button class="btn small">+ hinzufügen</button>`;
  const inp = addrow.querySelector('input');
  const add = ()=>{
    if(!inp.value.trim()) return;
    L.own.push({t:inp.value.trim(), done:false});
    save(false); renderLit(m, body);
  };
  addrow.querySelector('button').onclick = add;
  inp.addEventListener('keydown', e=>{ if(e.key==='Enter') add(); });
  body.appendChild(addrow);
}

/* ── Tab: Themen ── */
function renderTopics(m, body){
  body.innerHTML = '';
  (m.topics||[]).forEach((g,gi)=>{
    const grp = document.createElement('div');
    grp.className = 'topicgrp';
    grp.innerHTML = `<h4>${esc(g.g)}</h4>`;
    g.items.forEach((t,ti)=>{
      const key = gi+'.'+ti;
      const v = state.topics[m.id][key]||0;
      const row = document.createElement('div');
      row.className = 'topic t'+v;
      row.innerHTML = `<button class="tdot ${TOPIC_STATI[v].cls}" title="${TOPIC_STATI[v].title} — klicken zum Wechseln">${TOPIC_STATI[v].label}</button><span class="tt">${esc(t)}</span>`;
      row.querySelector('button').onclick = ()=>{
        const nv = ((state.topics[m.id][key]||0)+1)%3;
        state.topics[m.id][key] = nv;
        if(nv>0) logEvent('t');
        save(false); renderTopics(m, body);
      };
      grp.appendChild(row);
    });
    body.appendChild(grp);
  });
  const legend = document.createElement('div');
  legend.className = 'placeholder';
  legend.textContent = '○ offen → ◐ gelernt → ● sitzt (klicken zum Durchschalten)';
  body.appendChild(legend);
}

/* ── Tab: Notizen (Markdown) ── */
async function renderNotes(m, body){
  let text = state.notes[m.id] ?? '';
  if(dirHandle){
    const fsText = await fsReadNote(m.id);
    if(fsText !== null) text = fsText;
  }
  let preview = !!text;
  const draw = ()=>{
    body.innerHTML = `
      <div class="notetools">
        <button class="btn small" id="n-toggle">${preview?'✏️ Bearbeiten':'👁 Vorschau'}</button>
        <span class="state" id="n-state">${dirHandle?'→ '+m.id+'/notizen.md':'→ Browser (kein Ordner verbunden)'}</span>
      </div>
      ${preview
        ? `<div class="md">${text.trim()?mdRender(text):'<span class="placeholder">Noch keine Notizen.</span>'}</div>`
        : `<textarea class="notes-area" id="n-area" placeholder="# Notizen zu ${esc(m.id)}\n\nMarkdown: **fett**, *kursiv*, \`code\`, Listen mit -, Links [Text](https://…)">${esc(text)}</textarea>`}
    `;
    body.querySelector('#n-toggle').onclick = ()=>{ preview = !preview; draw(); };
    const area = body.querySelector('#n-area');
    if(area){
      area.focus();
      let t = null;
      area.addEventListener('input', ()=>{
        text = area.value;
        clearTimeout(t);
        t = setTimeout(async ()=>{
          state.notes[m.id] = text; notesCache[m.id] = text; save(false);
          if(dirHandle){ await fsWriteNote(m.id, text); body.querySelector('#n-state').textContent = '✓ gespeichert '+new Date().toLocaleTimeString('de-DE')+' → '+m.id+'/notizen.md'; }
          else body.querySelector('#n-state').textContent = '✓ gespeichert (Browser)';
        }, 800);
      });
    }
  };
  draw();
}

/* ── Tab: Material ── */
async function renderMaterial(m, body){
  if(!dirHandle){
    body.innerHTML = `<div class="placeholder">${hasFS
      ? 'Verbinde oben einen Studienordner, dann kannst du hier Skripte/PDFs pro Modul ablegen und öffnen.'
      : 'Dieser Browser unterstützt die File System Access API nicht (Edge/Chrome nutzen).'}</div>`;
    return;
  }
  const files = await fsListFiles(m.id);
  body.innerHTML = `
    <div class="files" id="filelist">${files.length?'':'<div class="placeholder">Noch keine Dateien in „'+esc(m.id)+'/“.</div>'}</div>
    <div class="dropzone" id="drop">Dateien hierher ziehen (oder <u style="cursor:pointer" id="pick">auswählen</u>) — sie werden nach <b>${esc(m.id)}/</b> kopiert.<br><span style="font-size:.68rem">⚠️ WBS-Skripte nur lokal nutzen, nicht weitergeben (Urheberrecht).</span></div>`;
  const list = body.querySelector('#filelist');
  files.forEach(f=>{
    const row = document.createElement('div');
    row.className = 'file';
    row.innerHTML = `<span>📄</span><span class="fn">${esc(f.name)}</span><span class="fs">${fmtSize(f.size)}</span><button class="btn small">Öffnen</button>`;
    row.querySelector('button').onclick = async ()=>{
      const file = await f.handle.getFile();
      window.open(URL.createObjectURL(file), '_blank');
    };
    list.appendChild(row);
  });
  const drop = body.querySelector('#drop');
  drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', ()=>drop.classList.remove('over'));
  drop.addEventListener('drop', async e=>{
    e.preventDefault(); drop.classList.remove('over');
    const files = [...e.dataTransfer.files];
    if(!files.length) return;
    const n = await fsAddFiles(m.id, files);
    toast(n+' Datei(en) nach '+m.id+'/ kopiert.');
    renderMaterial(m, body);
  });
  body.querySelector('#pick').onclick = async ()=>{
    try{
      const handles = await window.showOpenFilePicker({multiple:true});
      const fs = await Promise.all(handles.map(h=>h.getFile()));
      const n = await fsAddFiles(m.id, fs);
      toast(n+' Datei(en) nach '+m.id+'/ kopiert.');
      renderMaterial(m, body);
    }catch(e){ /* abgebrochen */ }
  };
}

/* ── Tab: Projekte ── */
function renderProjects(m, body){
  const projs = state.projects[m.id];
  body.innerHTML = '';
  if(!projs.length) body.innerHTML = '<div class="placeholder">Noch keine Projekte für dieses Modul.</div>';
  projs.forEach(p=>{
    const doneN = p.todos.filter(t=>t.done).length;
    const el = document.createElement('div');
    el.className = 'proj';
    el.innerHTML = `
      <div class="phead">
        <input class="ptitle" value="${esc(p.title)}"/>
        <select>${PROJ_STATI.map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}</select>
        <input type="date" value="${esc(p.deadline)}" title="Deadline"/>
        <button class="btn small danger" title="Projekt löschen">🗑</button>
      </div>
      <div class="pbar"><i style="width:${p.todos.length?Math.round(doneN/p.todos.length*100):0}%"></i></div>
      <div class="ptodos">${p.todos.map((t,i)=>`
        <label class="${t.done?'c':''}"><input type="checkbox" data-i="${i}" ${t.done?'checked':''}/><span>${esc(t.t)}</span><button class="del" data-i="${i}" title="entfernen">✕</button></label>`).join('')}
      </div>
      <div class="paddrow"><input placeholder="Neuer Schritt …"/><button class="btn small">+ hinzufügen</button></div>`;
    el.querySelector('.ptitle').onchange = e=>{ p.title = e.target.value; save(false); };
    el.querySelector('.phead select').onchange = e=>{ p.status = e.target.value; save(false); };
    el.querySelector('.phead input[type=date]').onchange = e=>{ p.deadline = e.target.value; save(false); };
    el.querySelector('.phead .danger').onclick = ()=>{
      if(confirm('Projekt „'+p.title+'“ löschen?')){
        state.projects[m.id] = projs.filter(x=>x.id!==p.id);
        save(false); renderProjects(m, body);
      }
    };
    el.querySelectorAll('.ptodos input[type=checkbox]').forEach(cb=>cb.onchange = e=>{
      p.todos[Number(e.target.dataset.i)].done = e.target.checked;
      if(e.target.checked) logEvent('p');
      save(false); renderProjects(m, body);
    });
    el.querySelectorAll('.ptodos .del').forEach(b=>b.onclick = e=>{
      e.preventDefault();
      p.todos.splice(Number(b.dataset.i),1); save(false); renderProjects(m, body);
    });
    const addInput = el.querySelector('.paddrow input');
    const add = ()=>{
      if(!addInput.value.trim()) return;
      p.todos.push({t:addInput.value.trim(), done:false});
      save(false); renderProjects(m, body);
    };
    el.querySelector('.paddrow button').onclick = add;
    addInput.addEventListener('keydown', e=>{ if(e.key==='Enter') add(); });
    body.appendChild(el);
  });
  const newBtn = document.createElement('button');
  newBtn.className = 'btn';
  newBtn.textContent = '+ Neues Projekt';
  newBtn.onclick = ()=>{
    projs.push({id:uid(), title:'Neues Projekt', status:'Idee', deadline:'', todos:[]});
    save(false); renderProjects(m, body);
  };
  body.appendChild(newBtn);
}

/* ── Tab: Lernkarten ── */
function renderCards(m, body){
  const cards = state.cards.filter(c=>c.mod===m.id);
  const due = cards.filter(c=>(c.due||today())<=today()).length;
  body.innerHTML = `
    <div class="card-form">
      <textarea id="fc-q" placeholder="Frage (z. B. aus den Kontrollfragen / MC-Vorbereitung)…"></textarea>
      <textarea id="fc-a" placeholder="Richtige Antwort…"></textarea>
      <textarea id="fc-c" placeholder="Optional für MC-Quiz: falsche Antworten, eine pro Zeile…" style="min-height:38px"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn primary small" id="fc-add">+ Karte anlegen</button>
        ${due?`<button class="btn small" id="fc-learn">▶ ${due} fällige Karte(n) lernen</button>`:''}
        <button class="btn small" id="fc-import" title="JSON oder CSV (frage;antwort;falsch1;falsch2…)">⬆ Import</button>
        ${cards.length?`<button class="btn small" id="fc-export">⬇ Export (JSON)</button>`:''}
        <input type="file" id="fc-file" accept=".json,.csv,.txt,text/csv,application/json" style="display:none"/>
      </div>
      <span style="font-size:.7rem;color:var(--mut)">Leitner: gewusst → nächste Box (1/3/7/14/30 Tage), nicht gewusst → zurück zu Box 1. Mit Falschantworten wird die Karte im Lern-Modus als Multiple Choice abgefragt — wie in der echten Prüfung.</span>
    </div>
    <div class="cardlist">${cards.length?'':'<div class="placeholder">Noch keine Lernkarten für dieses Modul.</div>'}</div>`;
  const list = body.querySelector('.cardlist');
  cards.forEach(c=>{
    const row = document.createElement('div');
    row.className = 'fcrow';
    row.innerHTML = `<span class="box">Box ${c.box}</span>${c.choices&&c.choices.length?'<span class="box" title="Multiple Choice">MC</span>':''}<span class="q" title="${esc(c.q)}">${esc(c.q)}</span><span class="due">fällig ${fmtDate(c.due)}</span><button class="btn small danger">🗑</button>`;
    row.querySelector('.danger').onclick = ()=>{
      state.cards = state.cards.filter(x=>x.id!==c.id);
      save(false); renderCards(m, body);
    };
    list.appendChild(row);
  });
  body.querySelector('#fc-add').onclick = ()=>{
    const q = body.querySelector('#fc-q').value.trim();
    const a = body.querySelector('#fc-a').value.trim();
    const choices = body.querySelector('#fc-c').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!q || !a){ toast('Frage und Antwort ausfüllen.'); return; }
    state.cards.push({id:uid(), mod:m.id, q, a, choices, box:1, due:today()});
    save(false); renderCards(m, body);
  };
  const lb = body.querySelector('#fc-learn');
  if(lb) lb.onclick = ()=>startLearning(m.id);
  const ex = body.querySelector('#fc-export');
  if(ex) ex.onclick = ()=>{
    const data = cards.map(c=>({q:c.q, a:c.a, choices:c.choices||[]}));
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lernkarten_${m.id}_${today()}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  body.querySelector('#fc-import').onclick = ()=>body.querySelector('#fc-file').click();
  body.querySelector('#fc-file').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    f.text().then(txt=>{
      try{
        const parsed = parseCards(txt);
        if(!parsed.length) throw new Error('keine Karten erkannt');
        parsed.forEach(c=>state.cards.push({id:uid(), mod:m.id, q:c.q, a:c.a, choices:c.choices, box:1, due:today()}));
        save(false); renderCards(m, body);
        toast(parsed.length+' Karte(n) importiert. ✓');
      }catch(err){ toast('Import fehlgeschlagen: '+err.message); }
      e.target.value = '';
    });
  });
}
/* JSON ([{q,a,choices}] / [{frage,antwort,falsch}]) oder CSV (frage;antwort;falsch1;falsch2…) */
function parseCards(txt){
  txt = txt.replace(/^﻿/,'').trim();
  if(txt.startsWith('[') || txt.startsWith('{')){
    const data = JSON.parse(txt);
    const list = Array.isArray(data) ? data : (data.cards||[]);
    return list.map(c=>({
      q:String(c.q??c.frage??'').trim(),
      a:String(c.a??c.antwort??'').trim(),
      choices:(c.choices??c.falsch??[]).map(x=>String(x).trim()).filter(Boolean)
    })).filter(c=>c.q && c.a);
  }
  return txt.split(/\r?\n/)
    .map(l=>l.split(';').map(x=>x.trim()))
    .filter(p=>p.length>=2 && p[0] && p[1] && !/^frage$/i.test(p[0]))
    .map(p=>({q:p[0], a:p[1], choices:p.slice(2).filter(Boolean)}));
}

/* ── Lern-Modus ── */
function startLearning(mid){
  const t = today();
  let queue = state.cards.filter(c=>(c.due||t)<=t && (!mid || c.mod===mid));
  if(!queue.length){ toast('Keine fälligen Karten. 🎉'); return; }
  queue = queue.sort(()=>Math.random()-.5);
  let i = 0, revealed = false;
  modalMod = null;
  overlay.classList.add('open');
  const draw = ()=>{
    if(i>=queue.length){
      queue.forEach(q=>{ delete q._opts; delete q._picked; });
      document.getElementById('modal').innerHTML = `
        <div class="mhead"><h3>Fertig für heute 🎉</h3><button class="x">✕</button></div>
        <div class="tabbody"><div class="placeholder">${queue.length} Karte(n) gelernt. Die nächsten Wiederholungen stehen im Dashboard.</div></div>`;
      document.querySelector('#modal .x').onclick = closeModal;
      save(false); render();
      return;
    }
    const c = queue[i];
    const isMC = c.choices && c.choices.length;
    if(isMC && !c._opts) c._opts = [c.a, ...c.choices].sort(()=>Math.random()-.5);
    const grade = ok=>{
      if(ok){ c.box = Math.min(5, c.box+1); c.due = addDays(today(), LEITNER[c.box]); }
      else { c.box = 1; c.due = addDays(today(), 1); }
      logEvent('c');
    };
    document.getElementById('modal').innerHTML = `
      <div class="mhead"><h3>Lernen · ${esc(c.mod)} (${i+1}/${queue.length})</h3><button class="x">✕</button></div>
      <div class="tabbody">
        <div class="learncard">
          <div class="lmeta">Box ${c.box} · ${esc(MODULES.find(m=>m.id===c.mod)?.name||'')}${isMC?' · Multiple Choice':''}</div>
          <div class="lq">${esc(c.q)}</div>
          ${isMC
            ? `<div class="mcopts">${c._opts.map((o,oi)=>{
                let cls = '';
                if(revealed) cls = o===c.a ? ' right' : (oi===c._picked ? ' wrong' : '');
                return `<button class="mcopt${cls}" data-oi="${oi}" ${revealed?'disabled':''}>${esc(o)}</button>`;
              }).join('')}</div>`
            : (revealed?`<div class="la">${esc(c.a)}</div>`:'')}
        </div>
        <div class="learnbtns">
          ${isMC
            ? (revealed?`<button class="btn primary" id="l-next">Weiter →</button>`:'')
            : (revealed
                ? `<button class="btn small danger" id="l-no">✗ Nicht gewusst</button><button class="btn primary small" id="l-yes">✓ Gewusst</button>`
                : `<button class="btn primary" id="l-show">Antwort zeigen</button>`)}
        </div>
      </div>`;
    document.querySelector('#modal .x').onclick = ()=>{
      queue.forEach(q=>{ delete q._opts; delete q._picked; });
      save(false); closeModal();
    };
    if(isMC && !revealed){
      document.querySelectorAll('.mcopt').forEach(b=>b.onclick = ()=>{
        c._picked = Number(b.dataset.oi);
        grade(c._opts[c._picked]===c.a);
        revealed = true; draw();
      });
    }
    const next = document.getElementById('l-next');
    if(next) next.onclick = ()=>{ delete c._opts; delete c._picked; i++; revealed = false; draw(); };
    const show = document.getElementById('l-show');
    if(show) show.onclick = ()=>{ revealed = true; draw(); };
    const yes = document.getElementById('l-yes');
    if(yes) yes.onclick = ()=>{ grade(true); i++; revealed = false; draw(); };
    const no = document.getElementById('l-no');
    if(no) no.onclick = ()=>{ grade(false); i++; revealed = false; draw(); };
  };
  draw();
}
function addDays(iso, d){
  const dt = new Date(iso); dt.setDate(dt.getDate()+d);
  return dt.toISOString().slice(0,10);
}

/* ════════════════ PeerGroup ════════════════ */
let peerTab = 'kontakte';
function openPeer(tab){
  modalMod = null;
  if(tab) peerTab = tab;
  overlay.classList.add('open');
  renderPeer();
}
function renderPeer(){
  const P = state.peer;
  const tabs = [['kontakte','Kontakte ('+P.contacts.length+')'],['termine','Termine ('+P.meetings.length+')'],['aufgaben','Aufgaben ('+P.tasks.filter(t=>!t.done).length+' offen)']];
  document.getElementById('modal').innerHTML = `
    <div class="mhead"><span class="chip" style="margin-top:4px">👥</span><h3>PeerGroup — Gruppenarbeiten zählen 40 % jeder Fachmodul-Note</h3><button class="x">✕</button></div>
    <div class="tabs">${tabs.map(t=>`<button class="tab ${t[0]===peerTab?'active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="tabbody" id="peerbody"></div>`;
  document.querySelector('#modal .x').onclick = closeModal;
  document.querySelectorAll('#modal .tab').forEach(b=>b.onclick = ()=>{ peerTab = b.dataset.tab; renderPeer(); });
  const body = document.getElementById('peerbody');

  if(peerTab==='kontakte'){
    body.innerHTML = P.contacts.length?'':'<div class="placeholder">Noch keine Kontakte — kommen bei der PeerGroup-Einteilung in VM1.</div>';
    P.contacts.forEach((c,i)=>{
      const row = document.createElement('div');
      row.className = 'file';
      row.innerHTML = `<span>👤</span><span class="fn"><b>${esc(c.name)}</b>${c.mail?' · <a href="mailto:'+esc(c.mail)+'" style="color:var(--blue)">'+esc(c.mail)+'</a>':''}${c.tel?' · '+esc(c.tel):''}${c.note?' — <span style="color:var(--mut)">'+esc(c.note)+'</span>':''}</span><button class="btn small danger">🗑</button>`;
      row.querySelector('.danger').onclick = ()=>{ P.contacts.splice(i,1); save(false); renderPeer(); };
      body.appendChild(row);
    });
    const form = document.createElement('div');
    form.className = 'card-form';
    form.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input id="pc-name" placeholder="Name *" style="flex:2;min-width:120px;padding:6px 9px;font-size:.76rem"/>
        <input id="pc-mail" placeholder="E-Mail" style="flex:2;min-width:120px;padding:6px 9px;font-size:.76rem"/>
        <input id="pc-tel" placeholder="Telefon/Teams" style="flex:1;min-width:90px;padding:6px 9px;font-size:.76rem"/>
        <input id="pc-note" placeholder="Notiz" style="flex:2;min-width:120px;padding:6px 9px;font-size:.76rem"/>
        <button class="btn small primary" id="pc-add">+ Kontakt</button>
      </div>`;
    form.querySelector('#pc-add').onclick = ()=>{
      const name = form.querySelector('#pc-name').value.trim();
      if(!name){ toast('Name fehlt.'); return; }
      P.contacts.push({name, mail:form.querySelector('#pc-mail').value.trim(), tel:form.querySelector('#pc-tel').value.trim(), note:form.querySelector('#pc-note').value.trim()});
      save(false); renderPeer();
    };
    body.appendChild(form);
  }

  if(peerTab==='termine'){
    const sorted = P.meetings.map((mt,i)=>({mt,i})).sort((a,b)=>(a.mt.date||'').localeCompare(b.mt.date||''));
    body.innerHTML = sorted.length?'':'<div class="placeholder">Noch keine Gruppentermine.</div>';
    sorted.forEach(({mt,i})=>{
      const past = mt.date < today();
      const row = document.createElement('div');
      row.className = 'file';
      if(past) row.style.opacity = .55;
      row.innerHTML = `<span>📆</span><span class="fn"><b>${fmtDate(mt.date)}${mt.time?' '+esc(mt.time):''}</b> — ${esc(mt.topic||'Gruppentermin')}${mt.mod?' <span class="box" style="font-size:.62rem">'+esc(mt.mod)+'</span>':''}</span><button class="btn small danger">🗑</button>`;
      row.querySelector('.danger').onclick = ()=>{ P.meetings.splice(i,1); save(false); renderPeer(); };
      body.appendChild(row);
    });
    const form = document.createElement('div');
    form.className = 'card-form';
    form.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input id="pm-date" type="date" style="padding:6px 9px;font-size:.76rem"/>
        <input id="pm-time" type="time" style="padding:6px 9px;font-size:.76rem"/>
        <input id="pm-topic" placeholder="Thema (z. B. Seminararbeit FM1)" style="flex:2;min-width:140px;padding:6px 9px;font-size:.76rem"/>
        <select id="pm-mod" style="padding:6px 9px;font-size:.76rem"><option value="">Modul –</option>${MODULES.filter(m=>m.phase==='fach').map(m=>`<option>${m.id}</option>`).join('')}</select>
        <button class="btn small primary" id="pm-add">+ Termin</button>
      </div>
      <span style="font-size:.68rem;color:var(--mut)">Termine landen auch im 📅 ICS-Export und im Wochenplaner.</span>`;
    form.querySelector('#pm-add').onclick = ()=>{
      const date = form.querySelector('#pm-date').value;
      if(!date){ toast('Datum fehlt.'); return; }
      P.meetings.push({date, time:form.querySelector('#pm-time').value, topic:form.querySelector('#pm-topic').value.trim(), mod:form.querySelector('#pm-mod').value});
      save(false); renderPeer();
    };
    body.appendChild(form);
  }

  if(peerTab==='aufgaben'){
    const wrap = document.createElement('div');
    wrap.className = 'ptodos';
    if(!P.tasks.length) body.innerHTML = '<div class="placeholder">Noch keine Gruppenaufgaben.</div>';
    P.tasks.forEach((t,i)=>{
      const lab = document.createElement('label');
      lab.className = t.done?'c':'';
      lab.innerHTML = `<input type="checkbox" ${t.done?'checked':''}/><span>${esc(t.t)}${t.who?' <b>→ '+esc(t.who)+'</b>':''}${t.mod?' <span class="box" style="font-size:.62rem">'+esc(t.mod)+'</span>':''}</span><button class="del">✕</button>`;
      lab.querySelector('input').onchange = e=>{ t.done = e.target.checked; save(false); renderPeer(); };
      lab.querySelector('.del').onclick = e=>{ e.preventDefault(); P.tasks.splice(i,1); save(false); renderPeer(); };
      wrap.appendChild(lab);
    });
    body.appendChild(wrap);
    const form = document.createElement('div');
    form.className = 'paddrow';
    form.innerHTML = `
      <input id="pt-t" placeholder="Aufgabe …" style="flex:3"/>
      <input id="pt-who" placeholder="Wer?" style="flex:1;min-width:70px;padding:6px 9px;font-size:.76rem"/>
      <select id="pt-mod" style="padding:6px 9px;font-size:.76rem"><option value="">Modul –</option>${MODULES.filter(m=>m.phase==='fach').map(m=>`<option>${m.id}</option>`).join('')}</select>
      <button class="btn small primary">+ </button>`;
    const add = ()=>{
      const t = form.querySelector('#pt-t').value.trim();
      if(!t) return;
      P.tasks.push({t, who:form.querySelector('#pt-who').value.trim(), mod:form.querySelector('#pt-mod').value, done:false});
      save(false); renderPeer();
    };
    form.querySelector('button').onclick = add;
    form.querySelector('#pt-t').addEventListener('keydown', e=>{ if(e.key==='Enter') add(); });
    body.appendChild(form);
  }
}

/* ════════════════ ICS-Export ════════════════ */
function icsExport(){
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//mba-studium//DE','CALSCALE:GREGORIAN'];
  const icsEsc = t=>String(t).replace(/\\/g,'\\\\').replace(/[,;]/g, m=>'\\'+m);
  const stamp = new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  let n = 0;
  if(state.start){
    const [y,mo] = state.start.split('-').map(Number);
    MILESTONES.forEach((ms,i)=>{
      const d = new Date(y, mo-1+ms.mm-1, 1);
      const ds = d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+'01';
      lines.push('BEGIN:VEVENT',`UID:mba-ms-${i}@studium`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${ds}`,
        `SUMMARY:🎓 MBA-Meilenstein ${icsEsc(ms.m)}: ${icsEsc(ms.t)}`,'END:VEVENT');
      n++;
    });
  }
  MODULES.forEach(m=>{
    const ed = state.modules[m.id].examDate;
    if(ed){
      lines.push('BEGIN:VEVENT',`UID:mba-ex-${m.id}@studium`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${ed.replace(/-/g,'')}`,
        `SUMMARY:📝 Prüfung ${m.id}: ${icsEsc(m.name)}`,`DESCRIPTION:${icsEsc(m.exam)}`,'END:VEVENT');
      n++;
    }
    (state.projects[m.id]||[]).forEach(p=>{
      if(p.deadline){
        lines.push('BEGIN:VEVENT',`UID:mba-pj-${p.id}@studium`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${p.deadline.replace(/-/g,'')}`,
          `SUMMARY:📋 Abgabe (${m.id}): ${icsEsc(p.title)}`,'END:VEVENT');
        n++;
      }
    });
  });
  (state.peer.meetings||[]).forEach((mt,i)=>{
    if(!mt.date) return;
    if(mt.time){
      const dt = mt.date.replace(/-/g,'')+'T'+mt.time.replace(':','')+'00';
      lines.push('BEGIN:VEVENT',`UID:mba-pg-${i}@studium`,`DTSTAMP:${stamp}`,`DTSTART:${dt}`,
        `SUMMARY:👥 PeerGroup${mt.mod?' ('+mt.mod+')':''}: ${icsEsc(mt.topic||'Gruppentermin')}`,'END:VEVENT');
    } else {
      lines.push('BEGIN:VEVENT',`UID:mba-pg-${i}@studium`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${mt.date.replace(/-/g,'')}`,
        `SUMMARY:👥 PeerGroup${mt.mod?' ('+mt.mod+')':''}: ${icsEsc(mt.topic||'Gruppentermin')}`,'END:VEVENT');
    }
    n++;
  });
  lines.push('END:VCALENDAR');
  if(!n){ toast('Keine Termine: Studienstart, Prüfungstermine oder Deadlines setzen.'); return; }
  const blob = new Blob([lines.join('\r\n')], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mba-studium.ics';
  a.click(); URL.revokeObjectURL(a.href);
  toast(n+' Termin(e) als mba-studium.ics exportiert.');
}

/* ════════════════ Export / Import / Theme / Init ════════════════ */
document.getElementById('btn-export').addEventListener('click', ()=>{
  state.lastBackup = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(state));
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mba-fortschritt_${today()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  render();
  toast('Backup heruntergeladen.');
});
document.getElementById('btn-import').addEventListener('click', ()=>document.getElementById('file-import').click());
document.getElementById('file-import').addEventListener('change', e=>{
  const f = e.target.files[0];
  if(!f) return;
  f.text().then(txt=>{
    try{
      const data = JSON.parse(txt);
      if(!data.modules) throw new Error('kein Tracker-Backup');
      state = migrate(data);
      save();
      toast('Backup importiert. ✓');
    }catch(err){ toast('Import fehlgeschlagen: '+err.message); }
    e.target.value = '';
  });
});
document.getElementById('btn-ics').addEventListener('click', icsExport);
document.getElementById('btn-folder').addEventListener('click', connectFolder);
document.getElementById('btn-peer').addEventListener('click', ()=>openPeer());
document.getElementById('learnbox-btn').addEventListener('click', ()=>startLearning(null));
document.getElementById('start').addEventListener('change', e=>{ state.start = e.target.value; save(); });
document.getElementById('search').addEventListener('input', e=>{ searchTerm = e.target.value.trim(); render(); });

const themeBtn = document.getElementById('btn-theme');
function applyTheme(t){
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t==='dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, t);
}
themeBtn.addEventListener('click', ()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
applyTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

if('serviceWorker' in navigator && location.protocol==='https:'){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

render();
restoreFolder().then(()=>render());
