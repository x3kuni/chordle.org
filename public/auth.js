import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cpfmiszujdyrtadqtdbj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7KPZYtjYmFP0oXAVkE3KOw_VpTVXsGh";

window.__CHORDLE_SUPABASE_OWNS_UI__=true;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const DAILY_LOCAL_KEY = "chordle_generated_daily_roll_v1";
const LIFETIME_LOCAL_KEY = "chord_rng_lifetime_v1";
const LIFETIME_DAY_KEY = "chord_rng_lifetime_day_v1";
const SEEN_BADGES_KEY = "chordle_seen_badges_v1";
const PENDING_ANON_ROLL_KEY = "chordle_pending_anonymous_roll_v1";

const state = {
  session: null,
  profile: null,
  todayRoll: null,
  restoring: false,
  persisting: false,
  leaderboardTab: "today",
  leaderboardRenderSeq: 0,
  leaderboardWinnerKey: null,
  leaderboardTodayRolls: [],
  leaderboardTodayProfiles: new Map(),
  anonymousPromptedDay: null,
  dayKey: localDayKey()
};

const NOTE_NAMES_FLAT = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
const PROFILE_NAME_COLORS={white:"#f4f5f7",red:"#ff6262",orange:"#ff9f43",yellow:"#ffd84d",green:"#62d58b",blue:"#5ea7ff",purple:"#aa79ff",pink:"#ff72c6"};
const INFO_HASHES=new Set(["#credits","#how-to-play","#updates"]);

const style=document.createElement("style");
style.textContent=`
#chordle-profile-auth-slot{margin:24px 0 0;padding:14px 16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045)}
#chordle-profile-auth-slot *,.ca-overlay *{box-sizing:border-box}
.ca-account-title{margin:0 0 9px;color:#8d929c;font-size:10px;font-weight:760;letter-spacing:.14em;text-transform:uppercase}
.ca-account-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.ca-account-user{margin-right:auto;font-size:13px;font-weight:750}
.ca-btn{appearance:none;border:1px solid rgba(255,255,255,.17);background:rgba(255,255,255,.07);color:inherit;padding:9px 13px;font:700 12px/1 inherit;cursor:pointer}
.ca-btn:hover{background:rgba(255,255,255,.13)}
.ca-primary{background:#f3f3f3;color:#111;border-color:#f3f3f3}
.ca-overlay{position:fixed;inset:0;z-index:2147483641;background:rgba(0,0,0,.64);backdrop-filter:blur(7px);display:grid;place-items:center;padding:20px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f6f6f6}
.ca-modal{width:min(430px,100%);background:#151519;border:1px solid rgba(255,255,255,.13);padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.ca-modal h2{margin:0 0 7px;font-size:25px}.ca-sub{color:#aaa;margin:0 0 20px;font-size:13px;line-height:1.45}
.ca-field{display:grid;gap:7px;margin:13px 0}.ca-field label{font-size:12px;color:#bbb;font-weight:700}
.ca-field input{width:100%;border:1px solid rgba(255,255,255,.14);background:#0e0e11;color:white;padding:12px 13px;outline:none;font:inherit}
.ca-actions{display:flex;gap:9px;margin-top:18px}.ca-actions .ca-btn{flex:1;padding:12px}
.ca-msg{min-height:19px;margin-top:12px;font-size:12px;color:#ffb3b3}.ca-msg.ok{color:#a8efbe}
.ca-x{float:right;background:none;border:0;color:#aaa;font-size:24px;cursor:pointer}
.ca-server-row{display:grid;grid-template-columns:52px minmax(0,1fr) 150px;gap:10px;align-items:center;padding:12px 8px;border-bottom:1px solid rgba(255,255,255,.08)}
.ca-server-rank{font-weight:850;color:#8d929c;text-align:center}
.ca-server-user{font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ca-server-value{text-align:right;font-weight:850;font-variant-numeric:tabular-nums}
.ca-best-roll{padding:16px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035)}
.ca-best-roll-name{font-size:18px;font-weight:850}
.ca-best-roll-meta{margin-top:7px;color:#8d929c;font-size:12px}
.leaderboard-winner-card .mock-roll-score-block{min-height:96px;padding-bottom:8px}
.leaderboard-winner-card .mock-roll-score-block .score{font-size:clamp(58px,7vw,100px);line-height:.96;padding:0 6px 8px}
.leaderboard-row-card .mock-roll-score-block .score{font-size:clamp(38px,4.5vw,58px);line-height:.96}
.profile-best-wrap .mock-roll-score-block .score{font-size:clamp(50px,6vw,78px);line-height:.96}
.chordle-footer{width:min(1080px,94vw);margin:52px auto 24px;padding:8px 0 18px;text-align:center;color:#6f747d;font-size:11px;line-height:1.5}
.chordle-footer a{color:#747983;text-decoration:none;transition:color .15s ease}
.chordle-footer a:hover{color:#a6abb4}
.chordle-footer-sep{padding:0 7px;color:#555a62}
.chordle-info-page{display:none;width:min(760px,92vw);margin:0 auto;min-height:calc(100vh - 210px);padding:58px 0 90px}
html.chordle-info-route .chordle-info-page{display:block}
html.chordle-info-route .piano-banner,
html.chordle-info-route .game-camera,
html.chordle-info-route .settings-page,
html.chordle-info-route .badges-index-page,
html.chordle-info-route .badge-detail-page,
html.chordle-info-route .leaderboard-page,
html.chordle-info-route .profile-page,
html.chordle-info-route .admin-luck{display:none!important}
.chordle-info-title{margin:0 0 30px;text-align:center;font-size:clamp(32px,6vw,48px);font-weight:900;letter-spacing:-.02em}
.chordle-info-copy{width:min(680px,100%);margin:0 auto;color:#c9ccd2;font-size:15px;line-height:1.72}
.chordle-info-copy p{margin:0 0 22px}
.chordle-info-copy a{color:#eef0f4;font-weight:800;text-decoration:none}
.chordle-info-copy a:hover{text-decoration:underline}
.chordle-update-card{padding:20px 22px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035)}
.chordle-update-title{margin:0 0 10px;color:#eef0f4;font-size:19px;font-weight:850}
.chordle-update-body{margin:0!important;color:#b9bdc5}
.ca-save-overlay{background:rgba(0,0,0,.52);backdrop-filter:blur(5px)}
.ca-save-overlay .ca-modal{width:min(450px,100%);text-align:center;border-radius:14px}
.ca-save-overlay .ca-modal h2{margin-top:8px;font-size:27px}
.ca-save-overlay .ca-sub{max-width:340px;margin-left:auto;margin-right:auto}
.ca-save-choice{display:flex;gap:10px;margin-top:20px}
.ca-save-choice .ca-btn{flex:1;padding:12px}
#profileNavBtn.chordle-profile-login-pulse{
  position:relative;
  border-radius:8px;
  animation:chordleProfileLoginPulse 1.55s ease-in-out infinite;
}
@keyframes chordleProfileLoginPulse{
  0%,100%{box-shadow:0 0 0 1px rgba(210,216,228,.28),0 0 5px rgba(220,225,238,.10)}
  50%{box-shadow:0 0 0 2px rgba(226,231,242,.72),0 0 14px rgba(220,225,238,.30)}
}
@media(max-width:620px){
  .ca-server-row{grid-template-columns:40px minmax(0,1fr) 105px}.ca-server-value{font-size:12px}
  .leaderboard-winner-card .mock-roll-score-block .score{font-size:clamp(50px,14vw,82px)}
}
`;
document.head.appendChild(style);

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function localDayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function noteName(n){return `${NOTE_NAMES_FLAT[((Number(n)%12)+12)%12]}${2+Math.floor(Number(n)/12)}`;}
function formatScore(v){const n=Number(v||0);return Number.isFinite(n)?Math.round(n).toLocaleString():"0";}
function username(user=state.session?.user){return state.profile?.username||user?.user_metadata?.username||user?.email?.split("@")[0]||"Player";}
function color(v){return typeof v==="string"&&CSS.supports("color",v)?v:"";}
function joined(v){if(!v)return "Joined —";const d=new Date(v);return Number.isNaN(d.getTime())?"Joined —":"Joined "+d.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});}
function readJson(key){try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function numericText(el){const n=Number(String(el?.textContent||"").replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:0;}

function nativeApp(){return window.__CHORDLE_APP__||null;}
function titleCaseRarity(v){return String(v||'common').replace(/-/g,' ').replace(/\\b\\w/g,m=>m.toUpperCase());}
function applyNameColor(el,value,userId=''){
  if(!el)return;
  el.dataset.profileId=String(userId||'');
  el.classList.remove('adaptive-name-color','custom-name-color');
  el.style.removeProperty('--account-name-color');
  const chosen=color(value);
  if(!chosen || chosen.toLowerCase()==='#ffffff' || chosen.toLowerCase()==='#f4f5f7'){
    el.classList.add('adaptive-name-color');
  }else{
    el.classList.add('custom-name-color');
    el.style.setProperty('--account-name-color',chosen);
  }
}
function profileHref(value){
  if(value&&typeof value==='object'){
    const key=value.public_id??value.id??value.username;
    return key!==undefined&&key!==null?'#profile/'+encodeURIComponent(String(key)):'#profile';
  }
  return value!==undefined&&value!==null&&value!==''?'#profile/'+encodeURIComponent(String(value)):'#profile';
}
function makeProfileLink(profile,extraClass='mock-profile-link'){
  const a=document.createElement('a');
  a.className=extraClass;
  a.href=profileHref(profile);
  a.textContent=profile?.username||'Player';
  applyNameColor(a,profile?.name_color,profile?.id);
  return a;
}
function profileTargetFromHash(){
  const hash=location.hash||'';
  if(!hash.startsWith('#profile/'))return state.session?.user?.id||null;
  try{return decodeURIComponent(hash.slice(9))||state.session?.user?.id||null;}catch{return state.session?.user?.id||null;}
}
async function fetchProfileTarget(target){
  if(!target)return null;
  const raw=String(target);
  const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);
  const isPublicId=/^\d+$/.test(raw);
  let q=supabase.from('profiles').select('id,public_id,username,name_color,lifetime_score,joined_at');
  q=isUuid?q.eq('id',raw):(isPublicId?q.eq('public_id',Number(raw)):q.eq('username',raw));
  const {data,error}=await q.maybeSingle();
  if(error){console.warn('Chordle profile lookup:',error.message);return null;}
  return data||null;
}
function rollSummary(roll){
  if(!roll||!Array.isArray(roll.notes))return null;
  const notes=roll.notes.map(Number);
  const badges=badgeObjectsForNotes(notes);
  const total=Math.max(0,Math.round(Number(roll.score)||0));
  const tier=nativeApp()?.scoreTier?.(total);
  return {
    notes,badges,score:total,
    rarity:String(roll.rarity||tier?.id||'common').toLowerCase(),
    rarityLabel:tier?.label||titleCaseRarity(roll.rarity),
    chordName:roll.chord_name||'Chord',
    chordDetail:roll.chord_detail||''
  };
}
function patchRenderedProfileLink(root,profile){
  const a=root?.querySelector?.('.mock-profile-link');
  if(!a||!profile)return;
  a.href=profileHref(profile);
  a.textContent=profile.username||'Player';
  applyNameColor(a,profile.name_color,profile.id);
}


function mountSiteFooter(){
  let footer=document.getElementById('chordleFooter');
  if(footer)return footer;
  footer=document.createElement('footer');
  footer.id='chordleFooter';
  footer.className='chordle-footer';
  footer.innerHTML='<a href="#credits">Credits</a><span class="chordle-footer-sep">-</span><a href="#how-to-play">How to play</a><span class="chordle-footer-sep">-</span><a href="#updates">Updates</a>';
  document.body.appendChild(footer);
  return footer;
}

function infoProfileLink(username,label=username){
  const a=document.createElement('a');
  a.href='#profile/'+encodeURIComponent(username);
  a.textContent=label;
  return a;
}

function buildCreditsPage(copy){
  const p1=document.createElement('p');
  p1.append('Developed by ',infoProfileLink('Kii'));

  const p2=document.createElement('p');
  p2.append('Tested by ',infoProfileLink('gyban'),' and ',infoProfileLink('LeDrivel'));

  const p3=document.createElement('p');
  p3.textContent='Inspired by RNGdle and a bit of Sols Rng.';

  const p4=document.createElement('p');
  p4.textContent="Whether you're a musical enjoyer like me or not, hope you enjoy my game!";

  copy.append(p1,p2,p3,p4);
}

function buildHowToPlayPage(copy){
  const paragraphs=[
    'Click the Generate chord button. This will generate 6 notes on a piano at random within a range from C2 to C5. Your 6 notes generate a chord (which we try to put a name to as best we can).',
    'Depending on a myriad of factors, like intervals, pairs, chord matches, and more, you gain points by the badges that your chord applies to. The rarer the badge is, typically, the more points you get.',
    "You get 2 final badges, which is a complex algorithm that calculates your chord's dissonance, and beauty. You get bonus points for this.",
    'If your chord gains enough points, it might show up on the leaderboard :o',
    "Here's something unique: You, and every other player in the game, are trying to find all the badges in the game. You can see how many copies of a certain badge exists, and you can see who was the first to discover it.",
    'There are currently 12 rarities, with 1600+ badges. Its up to you and the community to try and discover them all.',
    'Good luck, and have fun!'
  ];
  for(const value of paragraphs){
    const p=document.createElement('p');
    p.textContent=value;
    copy.appendChild(p);
  }
}

function buildUpdatesPage(copy){
  const card=document.createElement('section');
  card.className='chordle-update-card';
  const title=document.createElement('h2');
  title.className='chordle-update-title';
  title.textContent='Beta 0.1 - October 2, 2026';
  const body=document.createElement('p');
  body.className='chordle-update-body';
  body.textContent='The beta version of the game is officially public';
  card.append(title,body);
  copy.appendChild(card);
}

function mountInfoPage(){
  let page=document.getElementById('chordleInfoPage');
  if(page)return page;
  page=document.createElement('main');
  page.id='chordleInfoPage';
  page.className='chordle-info-page';
  page.innerHTML='<h1 class="chordle-info-title" id="chordleInfoTitle"></h1><div class="chordle-info-copy" id="chordleInfoCopy"></div>';
  document.body.insertBefore(page,document.getElementById('chordleFooter')||null);
  return page;
}

function renderInfoRoute(){
  const hash=location.hash||'#home';
  const active=INFO_HASHES.has(hash);
  document.documentElement.classList.toggle('chordle-info-route',active);
  if(!active)return false;

  const page=mountInfoPage();
  const title=page.querySelector('#chordleInfoTitle');
  const copy=page.querySelector('#chordleInfoCopy');
  copy.replaceChildren();

  if(hash==='#credits'){
    title.textContent='Credits';
    buildCreditsPage(copy);
  }else if(hash==='#how-to-play'){
    title.textContent='How to play';
    buildHowToPlayPage(copy);
  }else{
    title.textContent='Updates';
    buildUpdatesPage(copy);
  }

  window.scrollTo({top:0,left:0,behavior:'auto'});
  return true;
}

function setModalContent(o,inner,onClose=null){
  const panel=o?.querySelector?.(".ca-modal");
  if(!panel)return o;
  panel.innerHTML='<button class="ca-x" aria-label="Close">×</button>'+inner;
  const close=()=>{
    if(!o.isConnected)return;
    o.remove();
    if(typeof onClose==='function')onClose();
  };
  o._chordleClose=close;
  panel.querySelector(".ca-x").onclick=close;
  return o;
}

function modal(inner,onClose=null){
  const o=document.createElement("div");o.className="ca-overlay";
  o.innerHTML='<div class="ca-modal"></div>';
  setModalContent(o,inner,onClose);
  o.addEventListener("click",e=>{if(e.target===o)o._chordleClose?.();});
  document.body.appendChild(o);
  return o;
}

function highlightProfileLogin(){
  document.getElementById('profileNavBtn')?.classList.add('chordle-profile-login-pulse');
}

function clearProfileLoginHighlight(){
  document.getElementById('profileNavBtn')?.classList.remove('chordle-profile-login-pulse');
}

function unlockExistingPages(){
  for(const id of ["profilePage","leaderboardPage"]){
    const page=document.getElementById(id);
    if(!page)continue;
    page.classList.remove("beta-locked-page");
    page.querySelectorAll(":scope > .beta-coming-soon").forEach(el=>el.remove());
  }
}

function applyRoute(route){
  const root=document.documentElement;
  const profile=route==="profile", leaderboard=route==="leaderboard";
  root.classList.toggle("settings-route",false);
  root.classList.toggle("badges-route",false);
  root.classList.toggle("badge-detail-route",false);
  root.classList.toggle("profile-route",profile);
  root.classList.toggle("leaderboard-route",leaderboard);
  if(profile) history.pushState(null,"","#profile/kii");
  if(leaderboard) history.pushState(null,"","#leaderboard");
  window.scrollTo({top:0,left:0,behavior:"auto"});
}

async function loadProfile(user=state.session?.user,retries=0){
  state.profile=null;
  if(!user)return null;
  for(let i=0;i<=retries;i++){
    const {data,error}=await supabase.from("profiles")
      .select("id,public_id,username,name_color,lifetime_score,joined_at")
      .eq("id",user.id).maybeSingle();
    if(!error&&data){state.profile=data;syncLifetimeDisplay();return data;}
    if(i<retries)await new Promise(r=>setTimeout(r,250));
  }
  return null;
}

function syncLifetimeDisplay(){
  if(!state.profile)return;
  const value=Math.max(0,Number(state.profile.lifetime_score)||0);
  try{localStorage.setItem(LIFETIME_LOCAL_KEY,String(Math.round(value)));}catch{}
  const el=document.getElementById("lifetimeScore");
  if(el){
    el.textContent="Lifetime score: "+Math.round(value).toLocaleString();
    el.classList.add("visible");
  }
}

async function getTodayRoll(userId=state.session?.user?.id){
  if(!userId)return null;
  const {data,error}=await supabase.from("chordle_rolls")
    .select("*").eq("user_id",userId).eq("roll_day",localDayKey()).maybeSingle();
  if(error){
    if(String(error.message||"").toLowerCase().includes("daily_rolls")) return null;
    throw error;
  }
  return data||null;
}

async function getRollBadges(rollId){
  if(!rollId)return [];
  const {data,error}=await supabase.from("chordle_roll_badges")
    .select("*").eq("roll_id",rollId).order("points",{ascending:false});
  if(error)return [];
  return data||[];
}

async function getOwnedBadges(userId){
  if(!userId)return [];
  const {data,error}=await supabase.from("chordle_user_badges")
    .select("*").eq("user_id",userId).order("points",{ascending:false});
  if(error)return [];
  return data||[];
}

async function syncOwnedBadgesToLocal(){
  const uid=state.session?.user?.id;
  if(!uid)return [];
  const owned=await getOwnedBadges(uid);
  const keys=owned.map(b=>String(b.badge_key));
  try{localStorage.setItem(SEEN_BADGES_KEY,JSON.stringify(keys));}catch{}
  nativeApp()?.setOwnedBadgeKeys?.(keys);
  return owned;
}

function currentDailyNotes(){
  const stored=readJson(DAILY_LOCAL_KEY);
  if(!stored||stored.day!==localDayKey()||!Array.isArray(stored.notes)||stored.notes.length!==6)return null;
  const notes=stored.notes.map(Number);
  return notes.every(n=>Number.isInteger(n)&&n>=0&&n<=36)?notes:null;
}

function currentRarityId(){
  const classes=[...(document.getElementById("scoreBox")?.classList||[])];
  const hit=classes.find(c=>c.startsWith("rarity-"));
  return hit?hit.slice(7):String(document.getElementById("scoreRarity")?.textContent||"common").trim().toLowerCase().replace(/\s+/g,"-");
}

function badgeObjectsForNotes(notes){
  const sim=window.__CHORDLE_SIM__;
  if(!sim||!Array.isArray(notes))return [];
  try{return [...sim.analyze(notes),...sim.wholeChordBadges(notes)];}catch{return [];}
}

function captureAnonymousRoll(){
  if(state.session?.user)return null;
  const notes=currentDailyNotes();
  const total=numericText(document.getElementById('score'));
  const next=document.getElementById('nextChord');
  if(!notes||total<=0||!next?.classList.contains('visible'))return null;
  const pending={
    roll_day:localDayKey(),
    notes,
    score:Math.round(total),
    chord_name:String(document.getElementById('chordName')?.textContent||'').trim()||null,
    chord_detail:String(document.getElementById('chordDetail')?.textContent||'').trim()||null,
    rarity:currentRarityId()
  };
  writeJson(PENDING_ANON_ROLL_KEY,pending);
  return pending;
}

async function persistPendingAnonymousRoll(){
  if(!state.session?.user)return null;
  const pending=readJson(PENDING_ANON_ROLL_KEY);
  if(!pending)return null;
  if(pending.roll_day!==localDayKey()){
    try{localStorage.removeItem(PENDING_ANON_ROLL_KEY);}catch{}
    return null;
  }
  const notes=Array.isArray(pending.notes)?pending.notes.map(Number):[];
  if(notes.length!==6||!notes.every(n=>Number.isInteger(n)&&n>=0&&n<=36))return null;

  let roll=await getTodayRoll();
  if(!roll){
    const payload={
      user_id:state.session.user.id,
      roll_day:pending.roll_day,
      notes,
      score:Math.max(0,Math.round(Number(pending.score)||0)),
      chord_name:pending.chord_name||null,
      chord_detail:pending.chord_detail||null,
      rarity:String(pending.rarity||'common').toLowerCase()
    };
    if(payload.score<=0)return null;
    const {data,error}=await supabase.from('chordle_rolls').insert(payload).select('*').single();
    if(error){
      roll=await getTodayRoll();
      if(!roll)throw error;
    }else roll=data;
  }

  const badges=badgeObjectsForNotes(notes);
  if(roll&&badges.length){
    const existing=await getRollBadges(roll.id);
    const existingKeys=new Set(existing.map(b=>String(b.badge_key)));
    const rows=badges.filter(b=>!existingKeys.has(String(b.key||b.name||'unknown'))).map(b=>({
      roll_id:roll.id,
      user_id:state.session.user.id,
      badge_key:String(b.key||b.name||'unknown'),
      badge_name:String(b.name||'Badge'),
      badge_description:String(b.desc||''),
      rarity:String(b.rarity||'common').toLowerCase(),
      points:Math.max(0,Math.round(Number(b.points)||0)),
      special:!!b.special
    }));
    if(rows.length){
      const {error}=await supabase.from('chordle_roll_badges').insert(rows);
      if(error)throw error;
    }
  }

  try{localStorage.removeItem(PENDING_ANON_ROLL_KEY);}catch{}
  return roll||null;
}

async function persistCompletedRoll(){
  if(state.restoring||state.persisting||!state.session?.user)return;
  const next=document.getElementById('nextChord');
  if(!next?.classList.contains('visible'))return;
  const notes=currentDailyNotes();
  if(!notes)return;

  state.persisting=true;
  try{
    let roll=await getTodayRoll();
    if(!roll){
      const total=numericText(document.getElementById('score'));
      if(total<=0)return;
      const payload={
        user_id:state.session.user.id,
        roll_day:localDayKey(),
        notes,
        score:Math.round(total),
        chord_name:String(document.getElementById('chordName')?.textContent||'').trim()||null,
        chord_detail:String(document.getElementById('chordDetail')?.textContent||'').trim()||null,
        rarity:currentRarityId()
      };
      const {data,error}=await supabase.from('chordle_rolls').insert(payload).select('*').single();
      if(error){
        roll=await getTodayRoll();
        if(!roll)throw error;
      }else roll=data;
    }

    const badges=badgeObjectsForNotes(notes);
    if(roll&&badges.length){
      const existing=await getRollBadges(roll.id);
      const existingKeys=new Set(existing.map(b=>String(b.badge_key)));
      const rows=badges.filter(b=>!existingKeys.has(String(b.key||b.name||'unknown'))).map(b=>({
        roll_id:roll.id,
        user_id:state.session.user.id,
        badge_key:String(b.key||b.name||'unknown'),
        badge_name:String(b.name||'Badge'),
        badge_description:String(b.desc||''),
        rarity:String(b.rarity||'common').toLowerCase(),
        points:Math.max(0,Math.round(Number(b.points)||0)),
        special:!!b.special
      }));
      if(rows.length){
        const {error:badgeError}=await supabase.from('chordle_roll_badges').insert(rows);
        if(badgeError)console.warn('Chordle badge save:',badgeError.message);
      }
    }

    state.todayRoll=roll;
    await loadProfile(state.session.user,2);
    await syncOwnedBadgesToLocal();
    if(location.hash==='#leaderboard')await renderLeaderboard();
    await refreshBadgeExistCounts();
    if(location.hash.startsWith('#profile'))await renderProfile();
  }catch(err){
    console.warn('Chordle roll persistence:',err);
  }finally{
    state.persisting=false;
  }
}

function renderRestoredBadge(badge,notes){
  const el=document.createElement("div");
  el.className=`badge ${String(badge.rarity||"common").toLowerCase()}${badge.special?" analysis-final":""}`;
  if(!badge.special)el.dataset.badgeKey=String(badge.key||badge.name||"unknown");
  const needed=new Map();
  for(const n of (badge.notes||[]))needed.set(Number(n),(needed.get(Number(n))||0)+1);
  const ordered=[...notes].sort((a,b)=>a-b);
  const strip=ordered.map(n=>{
    const count=needed.get(n)||0;
    if(count>0)needed.set(n,count-1);
    return `<span class="badge-mini-note${count>0?" active":""}">${esc(noteName(n))}</span>`;
  }).join("");
  el.innerHTML=`<div class="badge-row"><div><div class="badge-name-line"><div class="badge-name">${esc(badge.name||"Badge")}</div></div><div class="badge-note-strip">${strip}</div><div class="badge-desc">${esc(badge.desc||"")}</div></div><div class="badge-meta"><div class="rarity">${esc(badge.rarity||"common")}</div><div class="points">+${formatScore(badge.points)}</div></div></div>`;
  el.classList.add("show");
  return el;
}

function restoreDailyRoll(roll){
  if(!roll||!Array.isArray(roll.notes)||roll.notes.length!==6)return false;
  const summary=rollSummary(roll);
  if(!summary)return false;
  state.restoring=true;
  try{
    writeJson(DAILY_LOCAL_KEY,{day:roll.roll_day,notes:summary.notes});
    try{
      localStorage.setItem(LIFETIME_DAY_KEY,roll.roll_day);
      if(state.profile)localStorage.setItem(LIFETIME_LOCAL_KEY,String(Math.round(Number(state.profile.lifetime_score)||0)));
    }catch{}
    const restored=nativeApp()?.restoreCompletedRoll?.(summary);
    syncLifetimeDisplay();
    return restored!==false;
  }finally{
    setTimeout(()=>{state.restoring=false;},0);
  }
}

function mountAccountControls(){
  const page=document.getElementById("profilePage");
  const badgesPanel=page?.querySelector(".profile-badges-panel");
  if(!page||!badgesPanel)return;
  let slot=document.getElementById("chordle-profile-auth-slot");
  if(!slot){
    slot=document.createElement("div");
    slot.id="chordle-profile-auth-slot";
  }
  // Always keep account controls at the very bottom, below Top 10 Badges.
  page.appendChild(slot);

  if(!state.session?.user){
    slot.innerHTML='<div class="ca-account-title">Chordle Account</div><div class="ca-account-row"><button class="ca-btn ca-primary" data-ca="signup">Create Account</button><button class="ca-btn" data-ca="login">Log In</button></div>';
    slot.querySelector('[data-ca="signup"]').onclick=showSignup;
    slot.querySelector('[data-ca="login"]').onclick=showLogin;
  }else{
    slot.innerHTML='<div class="ca-account-title">Chordle Account</div><div class="ca-account-row"><div class="ca-account-user">Logged in as '+esc(username())+'</div><button class="ca-btn" data-ca="logout">Log Out</button></div>';
    slot.querySelector('[data-ca="logout"]').onclick=logout;
  }
}

function renderBestRoll(best){
  const el=document.getElementById('profileBestRoll');
  if(!el)return;
  el.replaceChildren();
  if(!best){
    el.innerHTML='<div class="profile-badges-empty">No completed rolls yet.</div>';
    return;
  }
  const summary=rollSummary(best);
  const card=summary?nativeApp()?.createRollCard?.(summary,{showRarity:true}):null;
  if(card){
    el.appendChild(card);
    nativeApp()?.queueMockScoreFit?.(el);
  }else{
    el.innerHTML='<div class="profile-badges-empty">Unable to render this roll.</div>';
  }
}

function renderTopBadges(rows){
  const el=document.getElementById('profileTopBadges');
  if(!el)return;
  el.replaceChildren();
  if(!rows.length){
    el.innerHTML='<div class="profile-badges-empty">No collectible badges yet.</div>';
    return;
  }
  for(const saved of rows.slice(0,10)){
    const catalog=nativeApp()?.getCatalogBadgeByKey?.(String(saved.badge_key));
    const badge=catalog||{
      key:String(saved.badge_key),
      name:saved.badge_name||'Badge',
      desc:saved.badge_description||'',
      rarity:String(saved.rarity||'common').toLowerCase(),
      points:Number(saved.points)||0
    };
    const row=nativeApp()?.createProfileBadgeRow?.(badge);
    if(row)el.appendChild(row);
  }
  nativeApp()?.queueCompactBadgeTitleFit?.(el);
}

function bindProfileColorControl(targetProfile,ownProfile){
  const control=document.getElementById('profileColorControl');
  const button=document.getElementById('profileColorButton');
  const fill=document.getElementById('profileColorFill');
  const menu=document.getElementById('profileColorMenu');
  if(!control||!button||!fill||!menu)return;
  control.hidden=!ownProfile;
  if(!ownProfile){menu.hidden=true;button.setAttribute('aria-expanded','false');return;}

  const current=color(targetProfile?.name_color)||PROFILE_NAME_COLORS.white;
  fill.style.setProperty('--profile-color-fill',current);
  menu.replaceChildren();
  for(const [key,value] of Object.entries(PROFILE_NAME_COLORS)){
    const option=document.createElement('button');
    option.type='button';
    option.className='profile-color-option';
    option.dataset.colorKey=key;
    option.style.setProperty('--option-color',value);
    option.title=key[0].toUpperCase()+key.slice(1);
    option.setAttribute('aria-label',option.title+' username');
    option.classList.toggle('selected',value.toLowerCase()===current.toLowerCase());
    option.addEventListener('click',async event=>{
      event.stopPropagation();
      const uid=state.session?.user?.id;
      if(!uid)return;
      const {data,error}=await supabase.from('profiles').update({name_color:value}).eq('id',uid).select('id,public_id,username,name_color,lifetime_score,joined_at').single();
      if(error){console.warn('Chordle name color:',error.message);return;}
      state.profile=data;
      fill.style.setProperty('--profile-color-fill',value);
      document.querySelectorAll('[data-profile-id="'+CSS.escape(uid)+'"]').forEach(el=>applyNameColor(el,value,uid));
      applyNameColor(document.getElementById('profileName'),value,uid);
      menu.hidden=true;
      button.setAttribute('aria-expanded','false');
    });
    menu.appendChild(option);
  }

}

async function renderProfile(){
  unlockExistingPages();
  mountAccountControls();

  const nameEl=document.getElementById('profileName');
  const joinEl=document.getElementById('profileJoinDate');
  const lifetimeEl=document.getElementById('profileLifetimeScore');
  const targetKey=profileTargetFromHash();
  const target=targetKey?await fetchProfileTarget(targetKey):null;
  const ownProfile=!!(target?.id && state.session?.user?.id===target.id);

  if(!target){
    if(nameEl){nameEl.textContent='Profile';nameEl.classList.add('adaptive-name-color');nameEl.style.removeProperty('--account-name-color');}
    if(joinEl)joinEl.textContent=state.session?.user?'Profile unavailable':'Log in or create an account to view your profile';
    if(lifetimeEl)lifetimeEl.textContent='—';
    bindProfileColorControl(null,false);
    renderBestRoll(null);
    renderTopBadges([]);
    mountAccountControls();
    return;
  }

  if(ownProfile)state.profile=target;
  if(nameEl){nameEl.textContent=target.username||'Player';applyNameColor(nameEl,target.name_color,target.id);}
  if(joinEl){
    const joinedText=joined(target.joined_at);
    joinEl.textContent=target.public_id?('User ID #'+target.public_id+' · '+joinedText):joinedText;
  }
  if(lifetimeEl)lifetimeEl.textContent=formatScore(target.lifetime_score);
  bindProfileColorControl(target,ownProfile);

  const [{data:best},{data:badges}]=await Promise.all([
    supabase.from('chordle_rolls').select('*').eq('user_id',target.id).order('score',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('chordle_user_badges').select('*').eq('user_id',target.id).order('points',{ascending:false}).limit(10)
  ]);
  renderBestRoll(best||null);
  renderTopBadges(badges||[]);
  mountAccountControls();
}

function makeLeaderboardRow(rank,name,value,nameColor,href=null){
  const row=document.createElement("div");row.className="ca-server-row";
  const r=document.createElement("div");r.className="ca-server-rank";r.textContent="#"+rank;
  const u=document.createElement(href?"a":"div");u.className="ca-server-user";u.textContent=name||"Unnamed";
  if(href)u.href=href;
  const c=color(nameColor);if(c)u.style.color=c;
  const v=document.createElement("div");v.className="ca-server-value";v.textContent=value;
  row.append(r,u,v);return row;
}

async function profileMapFor(ids){
  const unique=[...new Set(ids.filter(Boolean))];
  if(!unique.length)return new Map();
  const {data}=await supabase.from("profiles").select("id,public_id,username,name_color,lifetime_score").in("id",unique);
  return new Map((data||[]).map(p=>[p.id,p]));
}

function renderedLeaderboardRow(profile,rank,summary){
  const account={id:profile.id,name:profile.username||'Player'};
  const row=nativeApp()?.createLeaderboardRow?.(account,rank,summary);
  if(row)patchRenderedProfileLink(row,profile);
  return row;
}

function renderedMetricRow(profile,rank,valueText){
  const account={id:profile.id,name:profile.username||'Player'};
  const row=nativeApp()?.createLeaderboardMetricRow?.(account,rank,valueText);
  if(row)patchRenderedProfileLink(row,profile);
  return row;
}

async function fetchTodayRolls(){
  const {data,error}=await supabase.from('chordle_rolls').select('*').eq('roll_day',localDayKey()).order('score',{ascending:false}).limit(100);
  if(error){console.warn('Chordle today leaderboard:',error.message);return [];}
  return data||[];
}

async function bestRollsByUser(desc=true){
  const {data,error}=await supabase.from('chordle_rolls').select('*').order('score',{ascending:!desc}).limit(5000);
  if(error){console.warn('Chordle roll ranking:',error.message);return [];}
  const first=new Map();
  for(const roll of (data||[]))if(!first.has(roll.user_id))first.set(roll.user_id,roll);
  return [...first.values()];
}

function configureLeaderboardTabs(){
  const old=document.querySelector('.leaderboard-tab[data-leaderboard-tab="lowest"]');
  if(old){
    old.dataset.leaderboardTab='lifetime';
    old.textContent='Most Lifetime';
  }
}

function winnerSignature(roll){
  if(!roll)return 'none';
  return [roll.id,roll.user_id,roll.score,roll.chord_name,roll.rarity].join(':');
}

function renderStableWinner(todayRolls,todayProfiles){
  const winnerEl=document.getElementById('leaderboardWinner');
  if(!winnerEl)return;
  const winner=todayRolls[0]||null;
  const signature=winnerSignature(winner);
  if(signature===state.leaderboardWinnerKey && winnerEl.children.length)return;

  winnerEl.replaceChildren();
  if(winner){
    const profile=todayProfiles.get(winner.user_id)||{id:winner.user_id,username:'Player',name_color:'#ffffff'};
    const summary=rollSummary(winner);
    const rank=document.createElement('div');
    rank.className='leaderboard-winner-rank';
    rank.textContent='#1 Today';
    const card=summary?nativeApp()?.createRollCard?.(summary,{winner:true,showRarity:false}):null;
    const by=document.createElement('div');
    by.className='leaderboard-winner-by';
    by.append('Rolled by ',makeProfileLink(profile));
    winnerEl.append(rank);
    if(card)winnerEl.appendChild(card);
    winnerEl.appendChild(by);
  }else{
    const empty=document.createElement('div');
    empty.className='profile-badges-empty';
    empty.textContent='No rolls have been completed today.';
    winnerEl.appendChild(empty);
  }
  state.leaderboardWinnerKey=signature;
}

async function renderLeaderboard(tab=state.leaderboardTab,{refreshWinner=true}={}){
  unlockExistingPages();
  configureLeaderboardTabs();
  state.leaderboardTab=(tab==='lowest'?'lifetime':(tab||'today'));
  const seq=++state.leaderboardRenderSeq;

  const list=document.getElementById('leaderboardList');
  const dateEl=document.getElementById('leaderboardDate');
  const titleEl=document.getElementById('leaderboardTitle');
  if(!list)return;

  // Only the ranking list is replaced on tab changes. The #1 Today showcase
  // stays mounted so it no longer flashes away and rebuilds every click.
  list.replaceChildren();
  if(titleEl)titleEl.textContent="Today's Leaderboard";
  if(dateEl)dateEl.textContent=new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  let todayRolls=state.leaderboardTodayRolls;
  let todayProfiles=state.leaderboardTodayProfiles;
  if(refreshWinner || !todayRolls.length){
    todayRolls=await fetchTodayRolls();
    if(seq!==state.leaderboardRenderSeq)return;
    todayProfiles=await profileMapFor(todayRolls.map(r=>r.user_id));
    if(seq!==state.leaderboardRenderSeq)return;
    state.leaderboardTodayRolls=todayRolls;
    state.leaderboardTodayProfiles=todayProfiles;
    renderStableWinner(todayRolls,todayProfiles);
  }

  if(state.leaderboardTab==='today'){
    todayRolls.slice(1).forEach((roll,index)=>{
      if(seq!==state.leaderboardRenderSeq)return;
      const profile=todayProfiles.get(roll.user_id)||{id:roll.user_id,username:'Player',name_color:'#ffffff'};
      const row=renderedLeaderboardRow(profile,index+2,rollSummary(roll));
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='alltime'){
    const rolls=await bestRollsByUser(true);
    if(seq!==state.leaderboardRenderSeq)return;
    const profiles=await profileMapFor(rolls.map(r=>r.user_id));
    if(seq!==state.leaderboardRenderSeq)return;
    rolls.forEach((roll,index)=>{
      const profile=profiles.get(roll.user_id)||{id:roll.user_id,username:'Player',name_color:'#ffffff'};
      const row=renderedLeaderboardRow(profile,index+1,rollSummary(roll));
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='lifetime'){
    const {data,error}=await supabase.from('profiles')
      .select('id,public_id,username,name_color,lifetime_score')
      .order('lifetime_score',{ascending:false})
      .limit(100);
    if(seq!==state.leaderboardRenderSeq)return;
    if(error)console.warn('Chordle lifetime leaderboard:',error.message);
    (data||[]).forEach((profile,index)=>{
      const row=renderedMetricRow(profile,index+1,formatScore(profile.lifetime_score)+' lifetime');
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='badges'){
    const {data}=await supabase.from('chordle_user_badges').select('user_id,badge_key');
    if(seq!==state.leaderboardRenderSeq)return;
    const counts=new Map();
    for(const b of (data||[]))counts.set(b.user_id,(counts.get(b.user_id)||0)+1);
    const ids=[...counts.keys()];
    const profiles=await profileMapFor(ids);
    if(seq!==state.leaderboardRenderSeq)return;
    const ranked=ids.map(id=>({profile:profiles.get(id)||{id,username:'Player',name_color:'#ffffff'},count:counts.get(id)||0}))
      .sort((a,b)=>b.count-a.count||String(a.profile.username).localeCompare(String(b.profile.username)));
    ranked.forEach((entry,index)=>{
      const row=renderedMetricRow(entry.profile,index+1,entry.count.toLocaleString()+' badges');
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='discovered'){
    const {data}=await supabase.from('chordle_user_badges').select('user_id,badge_key,discovered_at').order('discovered_at',{ascending:true});
    if(seq!==state.leaderboardRenderSeq)return;
    const firstByBadge=new Map();
    for(const b of (data||[]))if(!firstByBadge.has(b.badge_key))firstByBadge.set(b.badge_key,b.user_id);
    const counts=new Map();
    for(const uid of firstByBadge.values())counts.set(uid,(counts.get(uid)||0)+1);
    const ids=[...counts.keys()];
    const profiles=await profileMapFor(ids);
    if(seq!==state.leaderboardRenderSeq)return;
    const ranked=ids.map(id=>({profile:profiles.get(id)||{id,username:'Player',name_color:'#ffffff'},count:counts.get(id)||0}))
      .sort((a,b)=>b.count-a.count||String(a.profile.username).localeCompare(String(b.profile.username)));
    ranked.forEach((entry,index)=>{
      const row=renderedMetricRow(entry.profile,index+1,entry.count.toLocaleString()+' discovered');
      if(row)list.appendChild(row);
    });
  }

  if(seq!==state.leaderboardRenderSeq)return;
  if(!list.children.length){
    list.innerHTML='<div class="profile-badges-empty">No results yet.</div>';
  }

  document.getElementById('leaderboardTabs')?.querySelectorAll('.leaderboard-tab').forEach(btn=>{
    const active=btn.dataset.leaderboardTab===state.leaderboardTab;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-selected',active?'true':'false');
  });
  nativeApp()?.queueMockScoreFit?.(document);
}

async function refreshBadgeExistCounts(){
  const {data,error}=await supabase.from("chordle_user_badges").select("user_id,badge_key");
  if(error)return;
  const owners=new Map();
  for(const b of (data||[])){
    const key=String(b.badge_key);
    if(!owners.has(key))owners.set(key,new Set());
    owners.get(key).add(b.user_id);
  }
  document.querySelectorAll(".badge-index-row[data-badge-key]").forEach(row=>{
    const key=String(row.dataset.badgeKey||"");
    const exists=row.closest(".badge-index-entry")?.querySelector(".badge-index-exists");
    if(!exists)return;
    const count=owners.get(key)?.size||0;
    exists.textContent=count.toLocaleString()+" "+(count===1?"Exists":"Exist");
  });
}

async function renderBadgeDetailFromSupabase(){
  if(!location.hash.startsWith('#badges/'))return;
  const app=nativeApp();
  const badge=app?.getBadgeFromHash?.();
  const panel=document.getElementById('badgeDetailPanel');
  if(!badge||!panel)return;

  const {data:owners,error}=await supabase.from('chordle_user_badges')
    .select('user_id,discovered_at').eq('badge_key',String(badge.key)).order('discovered_at',{ascending:true});
  if(error){console.warn('Chordle badge detail:',error.message);return;}
  const rows=owners||[];
  const exists=rows.length;
  if(exists<=0){
    panel.className='badge-detail-panel detail-undiscovered';
    panel.innerHTML='<h1 class="badge-detail-undiscovered-title" id="badgeDetailTitle">This badge has not been discovered by anyone... yet...</h1>';
    return;
  }

  const first=rows[0];
  const firstProfile=first?.user_id?await fetchProfileTarget(first.user_id):null;
  panel.className='badge-detail-panel detail-'+String(badge.rarity||'common').toLowerCase();
  panel.replaceChildren();

  const title=document.createElement('h1');
  title.className='badge-detail-title';
  title.id='badgeDetailTitle';
  title.textContent=badge.name;
  const divider=document.createElement('div');divider.className='badge-detail-divider';
  const desc=document.createElement('p');desc.className='badge-detail-description';desc.textContent=badge.desc||'No description available.';

  const stats=document.createElement('div');stats.className='badge-detail-stats';
  const statDefs=[
    ['Rarity',app?.badgeIndexLabel?.(badge.rarity)||titleCaseRarity(badge.rarity),'badge-detail-rarity-value'],
    ['Probability',app?.formatBadgeProbability?.(badge.probability)||'—',''],
    ['Score','+'+Number(badge.points||0).toLocaleString(),'badge-detail-score-value']
  ];
  for(const [label,value,extra] of statDefs){
    const cell=document.createElement('div');cell.className='badge-detail-stat';
    const l=document.createElement('div');l.className='badge-detail-stat-label';l.textContent=label;
    const v=document.createElement('div');v.className=('badge-detail-stat-value '+extra).trim();v.textContent=value;
    cell.append(l,v);stats.appendChild(cell);
  }

  const discoveryRow=document.createElement('div');discoveryRow.className='badge-detail-discovery';
  const existCell=document.createElement('div');existCell.className='badge-detail-discovery-cell badge-detail-exists';
  existCell.textContent=exists.toLocaleString()+' '+(exists===1?'Exists':'Exist');
  const firstCell=document.createElement('div');firstCell.className='badge-detail-discovery-cell';
  if(firstProfile){
    firstCell.append(document.createTextNode('First discovered by\u00A0'));
    const link=makeProfileLink(firstProfile,'badge-detail-profile-link');
    const date=new Date(first.discovered_at);
    firstCell.append(link,document.createTextNode('\u00A0on '+date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})));
  }else{
    firstCell.textContent='First discovery information unavailable.';
  }
  discoveryRow.append(existCell,firstCell);
  panel.append(title,divider,desc,stats,discoveryRow);
  app?.queueBadgeDetailStatFit?.();
  app?.syncRarityGradient?.(panel);
}
function loginFormMarkup(){
  return '<h2>Sign in</h2><p class="ca-sub">Sign in to your Chordle account.</p><form><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Sign in</button></div><div class="ca-msg"></div></form>';
}

function signupFormMarkup(){
  return '<h2>Create account</h2><p class="ca-sub">Create your Chordle account. If you just rolled a chord, it will be saved when you sign in.</p><form><div class="ca-field"><label>Username</label><input name="username" minlength="2" maxlength="24" autocomplete="username" required></div><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Create account</button></div><div class="ca-msg"></div></form>';
}

function showLogin(existingOverlay=null){
  clearProfileLoginHighlight();
  const o=existingOverlay||modal('');
  o.classList.remove('ca-save-overlay');
  setModalContent(o,loginFormMarkup());
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();msg.textContent="Signing in…";
    const fd=new FormData(f);
    const {data,error}=await supabase.auth.signInWithPassword({email:String(fd.get("email")).trim(),password:String(fd.get("password"))});
    if(error){msg.textContent=error.message;return;}
    state.session=data.session;
    await initializeSignedInUser(data.user);
    o.remove();
    renderProfile();
  };
  return o;
}

function showSignup(existingOverlay=null){
  clearProfileLoginHighlight();
  const o=existingOverlay||modal('');
  o.classList.remove('ca-save-overlay');
  setModalContent(o,signupFormMarkup());
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(f),uname=String(fd.get("username")).trim();
    msg.textContent="Creating account…";
    const {data,error}=await supabase.auth.signUp({email:String(fd.get("email")).trim(),password:String(fd.get("password")),options:{data:{username:uname}}});
    if(error){msg.textContent=error.message;return;}
    if(data.session){
      state.session=data.session;
      await initializeSignedInUser(data.user);
      o.remove();
      renderProfile();
    }else{
      msg.className="ca-msg ok";
      msg.textContent="Account created. Check your email to confirm it, then sign in. Your chord is waiting to be saved.";
    }
  };
  return o;
}

function showAnonymousSavePrompt(){
  if(state.session?.user)return;
  const pending=captureAnonymousRoll();
  if(!pending)return;
  if(document.querySelector('.ca-save-overlay'))return;
  if(state.anonymousPromptedDay===pending.roll_day)return;
  state.anonymousPromptedDay=pending.roll_day;

  const inner='<h2>Log on to save your chord</h2><p class="ca-sub">Sign in or create an account to keep this roll, its score, and its discovered badges.</p><div class="ca-save-choice"><button class="ca-btn" data-ca-save="signin">Sign in</button><button class="ca-btn ca-primary" data-ca-save="signup">Create account</button></div>';
  const o=modal(inner,highlightProfileLogin);
  o.classList.add('ca-save-overlay');
  o.querySelector('[data-ca-save="signin"]').onclick=()=>showLogin(o);
  o.querySelector('[data-ca-save="signup"]').onclick=()=>showSignup(o);
}

async function logout(){
  await supabase.auth.signOut();
  state.session=null;state.profile=null;state.todayRoll=null;
  renderProfile();
}

async function initializeSignedInUser(user){
  clearProfileLoginHighlight();
  await loadProfile(user,2);
  await syncOwnedBadgesToLocal();
  state.todayRoll=await getTodayRoll(user.id);

  if(!state.todayRoll){
    try{
      const savedPending=await persistPendingAnonymousRoll();
      if(savedPending){
        state.todayRoll=savedPending;
        await loadProfile(user,2);
        await syncOwnedBadgesToLocal();
      }
    }catch(error){
      console.warn('Chordle pending anonymous roll save:',error);
    }
  }

  if(state.todayRoll)restoreDailyRoll(state.todayRoll);
  else if(document.getElementById("nextChord")?.classList.contains("visible"))await persistCompletedRoll();
}

function wireNavigation(){
  document.getElementById('profileNavBtn')?.addEventListener('click',e=>{
    clearProfileLoginHighlight();
    e.preventDefault();e.stopImmediatePropagation();
    const target=profileHref(state.profile||state.session?.user?.id);
    if(location.hash===target)renderProfile();
    else location.hash=target;
  },true);

  document.getElementById('leaderboardNavBtn')?.addEventListener('click',e=>{
    e.preventDefault();e.stopImmediatePropagation();
    state.leaderboardTab='today';
    if(location.hash==='#leaderboard')renderLeaderboard('today',{refreshWinner:true});
    else location.hash='#leaderboard';
  },true);

  document.getElementById('leaderboardTabs')?.addEventListener('click',e=>{
    const btn=e.target.closest('.leaderboard-tab');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    renderLeaderboard(btn.dataset.leaderboardTab||'today',{refreshWinner:false});
  },true);

  document.getElementById('badgesNavBtn')?.addEventListener('click',()=>{
    setTimeout(refreshBadgeExistCounts,80);
    setTimeout(refreshBadgeExistCounts,350);
  },true);

  window.addEventListener('hashchange',()=>{
    setTimeout(()=>{
      if(renderInfoRoute())return;
      if(location.hash.startsWith('#profile'))renderProfile();
      else if(location.hash==='#leaderboard')renderLeaderboard(state.leaderboardTab,{refreshWinner:true});
      else if(location.hash==='#badges')refreshBadgeExistCounts();
      else if(location.hash.startsWith('#badges/'))renderBadgeDetailFromSupabase();
    },0);
  });
}

function wireRollCompletion(){
  const next=document.getElementById("nextChord");
  if(next){
    const observer=new MutationObserver(()=>{
      if(!next.classList.contains("visible")||state.restoring)return;
      if(state.session?.user)setTimeout(persistCompletedRoll,0);
      else setTimeout(showAnonymousSavePrompt,180);
    });
    observer.observe(next,{attributes:true,attributeFilter:["class"]});
  }

  document.getElementById('revealBtn')?.addEventListener('click',event=>{
    if(state.todayRoll){
      event.preventDefault();
      event.stopImmediatePropagation();
      const summary=rollSummary(state.todayRoll);
      if(summary)void nativeApp()?.replayCompletedRoll?.(summary);
    }
  },true);
}

async function boot(){
  unlockExistingPages();
  configureLeaderboardTabs();
  mountSiteFooter();
  mountInfoPage();
  wireNavigation();
  wireRollCompletion();

  document.addEventListener('click',event=>{
    const control=document.getElementById('profileColorControl');
    const menu=document.getElementById('profileColorMenu');
    const button=document.getElementById('profileColorButton');
    if(control && menu && !menu.hidden && !control.contains(event.target)){
      menu.hidden=true;
      button?.setAttribute('aria-expanded','false');
    }
  });

  const {data}=await supabase.auth.getSession();
  state.session=data.session;
  if(data.session?.user)await initializeSignedInUser(data.session.user);
  syncLifetimeDisplay();
  if(!data.session?.user && document.getElementById("nextChord")?.classList.contains("visible")){
    setTimeout(showAnonymousSavePrompt,250);
  }

  if(renderInfoRoute()){}
  else if(location.hash.startsWith('#profile'))await renderProfile();
  else if(location.hash==='#leaderboard')await renderLeaderboard(state.leaderboardTab,{refreshWinner:true});
  else if(location.hash==='#badges')await refreshBadgeExistCounts();
  else if(location.hash.startsWith('#badges/'))await renderBadgeDetailFromSupabase();

  supabase.auth.onAuthStateChange((_event,session)=>{
    setTimeout(async()=>{
      state.session=session;
      if(session?.user)await initializeSignedInUser(session.user);
      else{state.profile=null;state.todayRoll=null;}
      if(renderInfoRoute())return;
      if(location.hash.startsWith('#profile'))renderProfile();
      if(location.hash==='#leaderboard')renderLeaderboard(state.leaderboardTab,{refreshWinner:true});
      if(location.hash==='#badges')refreshBadgeExistCounts();
      if(location.hash.startsWith('#badges/'))renderBadgeDetailFromSupabase();
    },0);
  });

  setInterval(()=>{
    const day=localDayKey();
    if(day!==state.dayKey){location.reload();return;}
    if(location.hash==='#badges')refreshBadgeExistCounts();
  },1000);
}

boot();

window.chordleSupabase=supabase;
window.chordleAuth={showLogin,showSignup,showAnonymousSavePrompt,logout,renderProfile,renderLeaderboard,persistCompletedRoll,persistPendingAnonymousRoll,refreshBadgeExistCounts,renderBadgeDetailFromSupabase};
