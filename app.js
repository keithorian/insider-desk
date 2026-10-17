(function(){
const CFG=window.DESK_CONFIG||{};const TZ='Asia/Singapore';
const STATUSES=['Draft','In production','On Hold','Pending Review','Approved','Scheduled','Published','Superseded'];
// 'Latest Files (Review)' cell: 'Label: https://drive.google.com/... | Label: https://...'. Only Google Drive/Docs links are rendered.
function fileLinks(raw){return String(raw||'').split(/\s+\|\s+/).map(seg=>{const m=seg.trim().match(/^(.+?):\s*(https:\/\/(?:drive|docs)\.google\.com\/\S+)$/);return m?{label:m[1].trim(),url:m[2]}:null}).filter(Boolean)}
const filesHTML=(p,cls)=>p.files&&p.files.length?`<div class="files${cls?' '+cls:''}"><span class="fl">Drive</span>${p.files.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noreferrer" title="${esc(f.label)}">${esc(f.label.replace(/\s*\(.*\)\s*$/,''))}</a>`).join('')}</div>`:'';
const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const addDays=(iso,n)=>{const[y,m,d]=iso.split('-').map(Number);const t=new Date(Date.UTC(y,m-1,d));t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
const fmt=(iso,long)=>{if(!iso)return'Undated';const[y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('en-GB',{weekday:long?'long':'short',day:'numeric',month:long?'long':'short',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)))};
function norm(p){const raw=(p.date||'').trim();const m=raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  const hm=(p.time||'').match(/^(\d{1,2}):(\d{2})/);const hr=hm?+hm[1]:null;
  const slot=hr==null?'none':(hr>=7&&hr<=9)?'morning':(hr>=19&&hr<=21)?'evening':'other';
  return{...p,date:m?`${m[1]}-${m[2]}-${m[3]}`:'',tbd:/tbd/i.test(raw),status:STATUSES.includes(p.status)?p.status:'Unfiled',
    inBuffer:!!(p.bufferId||'').trim(),files:fileLinks(p.files),filesNote:fileLinks(p.files).length?'':String(p.files||'').trim(),plats:platforms(p.bufferId,m?`${m[1]}-${m[2]}-${m[3]}`:''),slot,clock:hm?`${hm[1].padStart(2,'0')}:${hm[2]}`:(p.time||'')}}
const PLAT_ORDER={ig:0,reel:1,story:2,tt:3,yt:4,other:5};
const slotOf=c=>{const m=String(c||'').match(/^(\d{1,2}):/);if(!m)return'none';const h=+m[1];return(h>=7&&h<=9)?'morning':(h>=19&&h<=21)?'evening':'other'};
function platforms(raw,rowDate){const out=[];const yr=(rowDate||todayISO()).slice(0,4);
  String(raw||'').split('|').map(x=>x.trim()).filter(Boolean).forEach(seg=>{
  const m=seg.match(/^([a-f0-9]{24})\s*(?:\((.*)\))?\s*$/i);const id=m?m[1]:seg;let lab=((m&&m[2])||'').trim();let at=null;
  const a=lab.match(/@\s*(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if(a){at={date:`${yr}-${a[1].padStart(2,'0')}-${a[2].padStart(2,'0')}`,clock:`${a[3].padStart(2,'0')}:${a[4]}`};lab=lab.replace(a[0],'').replace(/\s*,\s*$/,'').trim()}
  else{const tm=/tik\s*tok/i.test(lab)&&lab.match(/(\d{1,2}):(\d{2})/);if(tm&&rowDate)at={date:rowDate,clock:`${tm[1].padStart(2,'0')}:${tm[2]}`}}
  let b;
  if(/you\s*tube|\byt\b/i.test(lab))b={k:'yt',t:'YouTube Short'};
  else if(/tik\s*tok/i.test(lab))b={k:'tt',t:'TikTok'};
  else if(/trial\s*reel/i.test(lab))b={k:'reel',t:'IG Trial Reel'+(/manual/i.test(lab)?' (Manual)':'')};
  else if(/reel/i.test(lab))b={k:'reel',t:'IG Reel'};
  else if(/story/i.test(lab))b={k:'story',t:'IG Story'};
  else if(/carousel/i.test(lab))b={k:'ig',t:'IG carousel'};
  else if(/feed/i.test(lab))b={k:'ig',t:'IG feed'};
  else if(!lab)b={k:'other',t:'Buffer post'};
  else b={k:'other',t:lab};
  if(at){at.slot=slotOf(at.clock);at.short=at.date===rowDate?at.clock:`${fmt(at.date)} ${at.clock}`}
  out.push({...b,id,label:lab,at})});
  return out.sort((a,b)=>PLAT_ORDER[a.k]-PLAT_ORDER[b.k])}
const shortTitle=t=>{let s=String(t||'').split(/[:?(—]/)[0].trim();if(s.length>42)s=s.slice(0,40).replace(/\s+\S*$/,'')+'…';return s};
const badgeHTML=(list,bare)=>list.length?`<span class="plats">${list.map(b=>`<span class="pb pb-${b.k}${b.at&&!bare?' pb-at':''}" title="${esc(b.t+(b.at?' @ '+b.at.date+' '+b.at.clock+' SGT':'')+' · Buffer '+b.id)}">${esc(b.t+(b.at&&!bare?' '+b.at.short:''))}</span>`).join('')}</span>`:'';
function decisions(posts,today){const soon=addDays(today,3),out=[];
  for(const t of posts){if(t.status==='Superseded'||t.status==='Published')continue;
    if(t.status==='Pending Review')out.push({post:t,why:'Waiting on your approval.',tone:'now'});
    else if(t.status==='Scheduled'&&!t.inBuffer)out.push({post:t,why:'Marked scheduled, but the sheet has no Buffer ID.',tone:'now'});
    else if(t.status==='Approved'&&!t.inBuffer&&t.date&&t.date<=soon)out.push({post:t,why:'Approved, on the calendar, and not in Buffer.',tone:'now'});
    else if(t.status==='Approved'&&!t.inBuffer)out.push({post:t,why:t.tbd?'Approved, but the date is still TBD.':'Approved, and not in Buffer yet.',tone:'soon'});
    else if(t.status==='Draft'&&t.date&&t.date<today)out.push({post:t,why:'Draft dated in the past.',tone:'soon'});
    else if(t.status==='Draft'&&!t.date)out.push({post:t,why:t.tbd?'Draft parked as TBD.':'Draft with no date.',tone:'tidy'});
    else if(t.status==='Unfiled')out.push({post:t,why:'No review status on the sheet.',tone:'tidy'});}
  const rank={now:0,soon:1,tidy:2};return out.sort((a,b)=>rank[a.tone]-rank[b.tone]||(a.post.date||'9').localeCompare(b.post.date||'9'))}
function pick(list){return list.find(p=>p.status==='Published')||list.find(p=>p.status==='Scheduled')||list.find(p=>p.status!=='Superseded')||null}
function satellites(posts){const out=[];for(const p of posts){if(p.status==='Superseded')continue;const g=new Map();
  for(const b of p.plats){if(!b.at)continue;if(b.at.date===p.date&&b.at.slot===p.slot&&b.at.slot!=='other')continue;
    const k=b.at.date+' '+b.at.clock;if(!g.has(k))g.set(k,{post:p,date:b.at.date,clock:b.at.clock,slot:b.at.slot,plats:[]});g.get(k).plats.push(b)}
  for(const v of g.values()){v.title=shortTitle(p.title)+' — '+v.plats.map(b=>b.t).join(' + ');out.push(v)}}return out}
let SATS=[];
function dayOf(posts,iso){const d=posts.filter(p=>p.date===iso&&p.status!=='Superseded');const s=SATS.filter(x=>x.date===iso);
  return{iso,morning:pick(d.filter(p=>p.slot==='morning')),evening:pick(d.filter(p=>p.slot==='evening')),
    satM:s.filter(x=>x.slot==='morning'),satE:s.filter(x=>x.slot==='evening'),
    other:[...d.filter(p=>p.slot==='other'||p.slot==='none').map(p=>({kind:'post',clock:p.clock,p})),...s.filter(x=>x.slot==='other'||x.slot==='none').map(x=>({kind:'sat',clock:x.clock,x}))].sort((a,b)=>(a.clock||'99').localeCompare(b.clock||'99'))}}
let POSTS=[];
function satLine(x){return`<button type="button" class="satline" data-row="${x.post.row}"><span class="mute">${esc(x.clock)}</span> ${esc(shortTitle(x.post.title))} ${badgeHTML(x.plats,true)}</button>`}
function slotCard(label,p,sats){sats=sats||[];
  if(!p&&!sats.length)return`<div class="card slot open"><p class="label">${label} SGT · Open</p><span class="t mute">Nothing on the sheet for this slot.</span></div>`;
  if(!p){const x=sats[0];return`<div class="card slot"><p class="label">${label} SGT · Reel / Short</p>${sats.map(x=>`<button type="button" class="satmain" data-row="${x.post.row}"><span class="t">${esc(x.title)}</span>${badgeHTML(x.plats,true)}<span class="mute">${esc(x.clock)} · from row ${x.post.row}</span></button>`).join('')}</div>`}
  const live=p.status==='Published'?`Published ${esc(p.clock)}`:p.status==='Scheduled'&&p.inBuffer?'In Buffer':p.status;
  return`<div class="card slot"><button type="button" class="satmain" data-row="${p.row}"><p class="label">${label} SGT · ${esc(live)}</p><span class="t">${esc(p.title)}</span>${badgeHTML(p.plats)}<span class="mute">${esc(p.pillar)}</span></button>${filesHTML(p)}${sats.length?`<div class="also"><span class="label">Also in this slot</span>${sats.map(satLine).join('')}</div>`:''}</div>`}
function rowBtn(label,p){return p?`<button type="button" class="row" data-row="${p.row}"><span class="tm">${esc(label)}</span><span class="rt"><span>${esc(p.title)}</span>${badgeHTML(p.plats)}</span><span class="st">${esc(p.status==='Scheduled'&&p.inBuffer?'In Buffer':p.status)}</span></button>`+filesHTML(p,'inrow'):`<div class="row empty"><span class="tm">${label}</span><span>Open</span></div>`}
const nowSG=()=>{const f=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const g=k=>f.find(p=>p.type===k).value;return`${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`};
function satStatus(x){const past=(x.date+' '+x.clock)<nowSG();return past?(x.post.status==='Published'?'Sent':'Past slot'):(x.post.inBuffer?'In Buffer':x.post.status)}
function satRow(label,x){return`<button type="button" class="row sat" data-row="${x.post.row}"><span class="tm">${esc(label)}</span><span class="rt"><span>${esc(x.title)}</span>${badgeHTML(x.plats,true)}</span><span class="st">${esc(satStatus(x))}</span></button>`}
function slotRows(label,p,sats){if(!p&&!sats.length)return rowBtn(label,null);return(p?rowBtn(label,p):'')+sats.map(x=>satRow(x.clock===label?label:x.clock,x)).join('')}
function otherRows(list){return list.map(o=>o.kind==='post'?rowBtn(o.p.clock||'Untimed',o.p):satRow(o.clock,o.x)).join('')}
function dayRows(d){const m=slotRows('08:00',d.morning,d.satM),e=slotRows('20:00',d.evening,d.satE);
  const before=d.other.filter(o=>(o.clock||'99')<'08:00'),mid=d.other.filter(o=>(o.clock||'99')>='08:00'&&(o.clock||'99')<'20:00'),after=d.other.filter(o=>(o.clock||'99')>='20:00');
  return otherRows(before)+m+otherRows(mid)+e+otherRows(after)}
function render(data){
  const today=todayISO();const posts=POSTS=(data.posts||[]).map(norm);SATS=satellites(posts);
  const t=dayOf(posts,today);const dec=decisions(posts,today);
  const counts=[['Needs you',dec.filter(d=>d.tone==='now').length],['Still moving',posts.filter(p=>!['Superseded','Published'].includes(p.status)).length],
    ['In Buffer',posts.filter(p=>p.inBuffer&&p.status==='Scheduled').length],['Published',posts.filter(p=>p.status==='Published').length]];
  const days=[...Array(14)].map((_,i)=>dayOf(posts,addDays(today,i)));
  const mix=[...posts.filter(p=>p.status!=='Superseded').reduce((m,p)=>m.set(p.pillar||'Unsorted',(m.get(p.pillar||'Unsorted')||0)+1),new Map())].sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max=mix[0]?.[1]||1;const mem=data.memory||[];const notes=(data.dashboard||{}).notes||[];
  $('#app').innerHTML=`
  <section><p class="kicker">Today · ${fmt(today,true)}</p><div class="slots" style="margin-top:.6rem">${slotCard('08:00',t.morning,t.satM)}${slotCard('20:00',t.evening,t.satE)}</div>
   ${t.other.length?`<p class="mute" style="margin-top:.5rem">Also today: ${t.other.map(o=>o.kind==='post'?esc(o.p.clock+' '+o.p.title):esc(o.clock+' '+o.x.title)).join(' · ')}</p>`:''}</section>
  <section class="grid4">${counts.map(([l,v])=>`<div class="card"><p class="label">${l}</p><p class="num">${v}</p></div>`).join('')}</section>
  <div class="two"><section><h2>The next two weeks</h2><p class="mute">Locked windows: 08:00 and 20:00 SGT.</p>
   ${days.map(d=>`<article class="day"><header><h3>${fmt(d.iso)}</h3>${d.iso===today?'<span class="kicker">Today</span>':d.iso===addDays(today,1)?'<span class="kicker">Tomorrow</span>':''}</header>${dayRows(d)}</article>`).join('')}</section>
  <div><section><h2>Needs a decision</h2>${dec.filter(d=>d.tone!=='tidy').length?'':'<p class="mute">Nothing waiting.</p>'}<ul>${dec.filter(d=>d.tone!=='tidy').map(d=>`<li><button type="button" class="card dec" data-row="${d.post.row}"><span class="kicker">${d.tone==='now'?'Now':'Soon'} · ${esc(d.post.status)}${d.post.date?' · '+fmt(d.post.date):''}</span><span class="t">${esc(d.post.title)}</span>${badgeHTML(d.post.plats)}<span class="w">${esc(d.why)}</span></button></li>`).join('')}</ul></section>
   <section style="margin-top:2rem"><h2>Where the page is leaning</h2><ul>${mix.map(([p,c])=>`<li><div style="display:flex;justify-content:space-between;font-size:.9rem"><span>${esc(p)}</span><span class="mute">${c}</span></div><div class="bar"><div style="width:${Math.max(8,c/max*100)}%"></div></div></li>`).join('')}</ul></section></div></div>
  <section><h2>Sheet memory</h2><p class="mute">Latest change-log lines and Dashboard notes, read live from the sheet.</p>
   <ul class="mem">${mem.map(m=>`<li><span class="mute">${esc(m.when)} SGT · ${esc(m.who)}${m.row?' · row '+m.row:''}</span><br>${esc(m.what)}</li>`).join('')}${notes.map(n=>`<li><span class="mute">Dashboard note</span><br>${esc(n)}</li>`).join('')}</ul></section>`;
  const g=data.generatedAt?new Date(data.generatedAt):new Date();
  $('#fresh').textContent='Live from sheet · '+new Intl.DateTimeFormat('en-GB',{timeZone:TZ,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(g)+' SGT';}
function openRow(r){const p=POSTS.find(x=>x.row==r);if(!p)return;
  const f=[['Row',p.row],['Date',p.date?fmt(p.date,true):(p.tbd?'TBD':'Undated')],['Time',p.time],['Status',p.status],['Pillar',p.pillar],['Format',p.format],['Topic',p.topic],['Buffer',p.plats.length?'':'—'],['Reach thesis',p.thesis],['Hook',p.hook]];
  $('#detailBody').innerHTML=`<h2>${esc(p.title)}</h2><dl>${f.filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}${p.plats.length?`<dt>Platforms</dt><dd><ul class="pl">${p.plats.map(b=>`<li><span class="pb pb-${b.k}">${esc(b.t)}</span>${b.at?` <span>@ ${esc(fmt(b.at.date)+' '+b.at.clock)} SGT</span>`:''} <span class="mute">${esc(b.id)}</span></li>`).join('')}</ul></dd>`:''}</dl>${p.files.length?`<h3 style="margin-top:1rem">Latest files (review)</h3><ul class="pl">${p.files.map(f=>`<li><a style="color:var(--gold)" href="${esc(f.url)}" target="_blank" rel="noreferrer">${esc(f.label)}</a></li>`).join('')}</ul>`:(p.filesNote?`<p class="mute">Latest files: ${esc(p.filesNote)}</p>`:'')}${p.instagram?`<p><a style="color:var(--gold)" href="${esc(p.instagram)}" target="_blank" rel="noreferrer">Open the live post</a></p>`:''}<p><a style="color:var(--gold)" target="_blank" rel="noreferrer" href="${esc((CFG.SHEET_URL||'')+'#gid=0&range=A'+p.row)}">Open row in sheet</a></p>`;
  $('#detail').showModal()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-row]');if(b)openRow(b.dataset.row)});
const bust=u=>u+(u.includes('?')?'&':'?')+'t='+Date.now();
async function getJSON(u){const r=await fetch(bust(u),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
function getJSONP(u){return new Promise((ok,fail)=>{const cb='__desk'+Date.now();const s=document.createElement('script');
  const done=()=>{delete window[cb];s.remove();clearTimeout(to)};const to=setTimeout(()=>{done();fail(new Error('Feed did not respond (check the web app is deployed with access: Anyone).'))},15000);
  window[cb]=d=>{done();ok(d)};s.onerror=()=>{done();fail(new Error('Feed could not be loaded (check the web app is deployed with access: Anyone).'))};
  s.src=bust(u)+'&callback='+cb;document.head.appendChild(s)})}
async function load(){$('#fresh').textContent='Loading live sheet…';
  const url=new URLSearchParams(location.search).get('data')||CFG.DATA_URL;
  try{if(!url||/PASTE_/.test(url))throw new Error('DATA_URL is not set in config.js yet.');
    let data;try{data=await getJSON(url)}catch(e1){data=await getJSONP(url)}if(!data.ok)throw new Error(data.error||'Feed returned an error');render(data)}
  catch(err){$('#app').innerHTML=`<div class="err"><h2>Couldn't load the live sheet</h2><p>${esc(err.message)}</p><p class="mute">The desk never shows stale data: it reads the sheet on every load.</p></div>`;$('#fresh').textContent='Not loaded'}}
$('#sheetlink').href=CFG.SHEET_URL||'#';$('#reload').onclick=load;load();setInterval(load,5*60*1000);
})();
