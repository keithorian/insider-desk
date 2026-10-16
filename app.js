(function(){
const CFG=window.DESK_CONFIG||{};const TZ='Asia/Singapore';
const STATUSES=['Draft','Pending Review','Approved','Scheduled','Published','Superseded'];
const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const addDays=(iso,n)=>{const[y,m,d]=iso.split('-').map(Number);const t=new Date(Date.UTC(y,m-1,d));t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
const fmt=(iso,long)=>{if(!iso)return'Undated';const[y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('en-GB',{weekday:long?'long':'short',day:'numeric',month:long?'long':'short',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)))};
function norm(p){const raw=(p.date||'').trim();const m=raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  const hm=(p.time||'').match(/^(\d{1,2}):(\d{2})/);const hr=hm?+hm[1]:null;
  const slot=hr==null?'none':(hr>=7&&hr<=9)?'morning':(hr>=19&&hr<=21)?'evening':'other';
  return{...p,date:m?`${m[1]}-${m[2]}-${m[3]}`:'',tbd:/tbd/i.test(raw),status:STATUSES.includes(p.status)?p.status:'Unfiled',
    inBuffer:!!(p.bufferId||'').trim(),slot,clock:hm?`${hm[1].padStart(2,'0')}:${hm[2]}`:(p.time||'')}}
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
function dayOf(posts,iso){const d=posts.filter(p=>p.date===iso&&p.status!=='Superseded');
  return{iso,morning:pick(d.filter(p=>p.slot==='morning')),evening:pick(d.filter(p=>p.slot==='evening')),other:d.filter(p=>p.slot==='other'||p.slot==='none')}}
let POSTS=[];
function slotCard(label,p){if(!p)return`<div class="card slot open"><p class="label">${label} SGT · Open</p><span class="t mute">Nothing on the sheet for this slot.</span></div>`;
  const live=p.status==='Published'?`Published ${esc(p.clock)}`:p.status==='Scheduled'&&p.inBuffer?'In Buffer':p.status;
  return`<button type="button" class="card slot" data-row="${p.row}"><p class="label">${label} SGT · ${esc(live)}</p><span class="t">${esc(p.title)}</span><span class="mute">${esc(p.pillar)}</span></button>`}
function rowBtn(label,p){return p?`<button type="button" class="row" data-row="${p.row}"><span class="tm">${esc(label)}</span><span>${esc(p.title)}</span><span class="st">${esc(p.status==='Scheduled'&&p.inBuffer?'In Buffer':p.status)}</span></button>`:`<div class="row empty"><span class="tm">${label}</span><span>Open</span></div>`}
function render(data){
  const today=todayISO();const posts=POSTS=(data.posts||[]).map(norm);
  const t=dayOf(posts,today);const dec=decisions(posts,today);
  const counts=[['Needs you',dec.filter(d=>d.tone==='now').length],['Still moving',posts.filter(p=>!['Superseded','Published'].includes(p.status)).length],
    ['In Buffer',posts.filter(p=>p.inBuffer&&p.status==='Scheduled').length],['Published',posts.filter(p=>p.status==='Published').length]];
  const days=[...Array(14)].map((_,i)=>dayOf(posts,addDays(today,i)));
  const mix=[...posts.filter(p=>p.status!=='Superseded').reduce((m,p)=>m.set(p.pillar||'Unsorted',(m.get(p.pillar||'Unsorted')||0)+1),new Map())].sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max=mix[0]?.[1]||1;const mem=data.memory||[];const notes=(data.dashboard||{}).notes||[];
  $('#app').innerHTML=`
  <section><p class="kicker">Today · ${fmt(today,true)}</p><div class="slots" style="margin-top:.6rem">${slotCard('08:00',t.morning)}${slotCard('20:00',t.evening)}</div>
   ${t.other.length?`<p class="mute" style="margin-top:.5rem">Also today: ${t.other.map(p=>esc(p.clock+' '+p.title)).join(' · ')}</p>`:''}</section>
  <section class="grid4">${counts.map(([l,v])=>`<div class="card"><p class="label">${l}</p><p class="num">${v}</p></div>`).join('')}</section>
  <div class="two"><section><h2>The next two weeks</h2><p class="mute">Locked windows: 08:00 and 20:00 SGT.</p>
   ${days.map(d=>`<article class="day"><header><h3>${fmt(d.iso)}</h3>${d.iso===today?'<span class="kicker">Today</span>':d.iso===addDays(today,1)?'<span class="kicker">Tomorrow</span>':''}</header>${rowBtn('08:00',d.morning)}${rowBtn('20:00',d.evening)}${d.other.map(p=>rowBtn(p.clock||'Untimed',p)).join('')}</article>`).join('')}</section>
  <div><section><h2>Needs a decision</h2>${dec.filter(d=>d.tone!=='tidy').length?'':'<p class="mute">Nothing waiting.</p>'}<ul>${dec.filter(d=>d.tone!=='tidy').map(d=>`<li><button type="button" class="card dec" data-row="${d.post.row}"><span class="kicker">${d.tone==='now'?'Now':'Soon'} · ${esc(d.post.status)}${d.post.date?' · '+fmt(d.post.date):''}</span><span class="t">${esc(d.post.title)}</span><span class="w">${esc(d.why)}</span></button></li>`).join('')}</ul></section>
   <section style="margin-top:2rem"><h2>Where the page is leaning</h2><ul>${mix.map(([p,c])=>`<li><div style="display:flex;justify-content:space-between;font-size:.9rem"><span>${esc(p)}</span><span class="mute">${c}</span></div><div class="bar"><div style="width:${Math.max(8,c/max*100)}%"></div></div></li>`).join('')}</ul></section></div></div>
  <section><h2>Sheet memory</h2><p class="mute">Latest change-log lines and Dashboard notes, read live from the sheet.</p>
   <ul class="mem">${mem.map(m=>`<li><span class="mute">${esc(m.when)} SGT · ${esc(m.who)}${m.row?' · row '+m.row:''}</span><br>${esc(m.what)}</li>`).join('')}${notes.map(n=>`<li><span class="mute">Dashboard note</span><br>${esc(n)}</li>`).join('')}</ul></section>`;
  const g=data.generatedAt?new Date(data.generatedAt):new Date();
  $('#fresh').textContent='Live from sheet · '+new Intl.DateTimeFormat('en-GB',{timeZone:TZ,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(g)+' SGT';}
function openRow(r){const p=POSTS.find(x=>x.row==r);if(!p)return;
  const f=[['Row',p.row],['Date',p.date?fmt(p.date,true):(p.tbd?'TBD':'Undated')],['Time',p.time],['Status',p.status],['Pillar',p.pillar],['Format',p.format],['Topic',p.topic],['Buffer',p.bufferId||'—'],['Reach thesis',p.thesis],['Hook',p.hook]];
  $('#detailBody').innerHTML=`<h2>${esc(p.title)}</h2><dl>${f.filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${p.instagram?`<p><a style="color:var(--gold)" href="${esc(p.instagram)}" target="_blank" rel="noreferrer">Open the live post</a></p>`:''}<p><a style="color:var(--gold)" target="_blank" rel="noreferrer" href="${esc((CFG.SHEET_URL||'')+'#gid=0&range=A'+p.row)}">Open row in sheet</a></p>`;
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
