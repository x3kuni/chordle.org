import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cpfmiszujdyrtadqtdbj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7KPZYtjYmFP0oXAVkE3KOw_VpTVXsGh";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const DAILY_LOCAL_KEY = "chordle_generated_daily_roll_v1";
const LIFETIME_LOCAL_KEY = "chord_rng_lifetime_v1";
const LIFETIME_DAY_KEY = "chord_rng_lifetime_day_v1";
const SEEN_BADGES_KEY = "chordle_seen_badges_v1";

const state = {
  session: null,
  profile: null,
  todayRoll: null,
  restoring: false,
  persisting: false,
  leaderboardTab: "today",
  dayKey: localDayKey()
};

const NOTE_NAMES_FLAT = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];\nconst PROFILE_NAME_COLORS={white:"#f4f5f7",red:"#ff6262",orange:"#ff9f43",yellow:"#ffd84d",green:"#62d58b",blue:"#5ea7ff",purple:"#aa79ff",pink:"#ff72c6"};

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
@media(max-width:620px){.ca-server-row{grid-template-columns:40px minmax(0,1fr) 105px}.ca-server-value{font-size:12px}}
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
function numericText(el){const n=Number(String(el?.textContent||"").replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:0;}\n\nfunction nativeApp(){return window.__CHORDLE_APP__||null;}\nfunction titleCaseRarity(v){return String(v||'common').replace(/-/g,' ').replace(/\\b\\w/g,m=>m.toUpperCase());}\nfunction applyNameColor(el,value,userId=''){\n  if(!el)return;\n  el.dataset.profileId=String(userId||'');\n  el.classList.remove('adaptive-name-color','custom-name-color');\n  el.style.removeProperty('--account-name-color');\n  const chosen=color(value);\n  if(!chosen || chosen.toLowerCase()==='#ffffff' || chosen.toLowerCase()==='#f4f5f7'){\n    el.classList.add('adaptive-name-color');\n  }else{\n    el.classList.add('custom-name-color');\n    el.style.setProperty('--account-name-color',chosen);\n  }\n}\nfunction profileHref(id){return id?'#profile/'+encodeURIComponent(id):'#profile';}\nfunction makeProfileLink(profile,extraClass='mock-profile-link'){\n  const a=document.createElement('a');\n  a.className=extraClass;\n  a.href=profileHref(profile?.id);\n  a.textContent=profile?.username||'Player';\n  applyNameColor(a,profile?.name_color,profile?.id);\n  return a;\n}\nfunction profileTargetFromHash(){\n  const hash=location.hash||'';\n  if(!hash.startsWith('#profile/'))return state.session?.user?.id||null;\n  try{return decodeURIComponent(hash.slice(9))||state.session?.user?.id||null;}catch{return state.session?.user?.id||null;}\n}\nasync function fetchProfileTarget(target){\n  if(!target)return null;\n  const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(target));\n  let q=supabase.from('profiles').select('id,username,name_color,lifetime_score,joined_at');\n  q=isUuid?q.eq('id',target):q.eq('username',target);\n  const {data,error}=await q.maybeSingle();\n  if(error){console.warn('Chordle profile lookup:',error.message);return null;}\n  return data||null;\n}\nfunction rollSummary(roll){\n  if(!roll||!Array.isArray(roll.notes))return null;\n  const notes=roll.notes.map(Number);\n  const badges=badgeObjectsForNotes(notes);\n  const total=Math.max(0,Math.round(Number(roll.score)||0));\n  const tier=nativeApp()?.scoreTier?.(total);\n  return {\n    notes,badges,score:total,\n    rarity:String(roll.rarity||tier?.id||'common').toLowerCase(),\n    rarityLabel:tier?.label||titleCaseRarity(roll.rarity),\n    chordName:roll.chord_name||'Chord',\n    chordDetail:roll.chord_detail||''\n  };\n}\nfunction patchRenderedProfileLink(root,profile){\n  const a=root?.querySelector?.('.mock-profile-link');\n  if(!a||!profile)return;\n  a.href=profileHref(profile.id);\n  a.textContent=profile.username||'Player';\n  applyNameColor(a,profile.name_color,profile.id);\n}

function modal(inner){
  const o=document.createElement("div");o.className="ca-overlay";
  o.innerHTML='<div class="ca-modal"><button class="ca-x" aria-label="Close">×</button>'+inner+'</div>';
  o.querySelector(".ca-x").onclick=()=>o.remove();
  o.addEventListener("click",e=>{if(e.target===o)o.remove();});
  document.body.appendChild(o);return o;
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
      .select("id,username,name_color,lifetime_score,joined_at")
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

async function persistCompletedRoll(){
  if(state.restoring||state.persisting||!state.session?.user)return;
  const next=document.getElementById("nextChord");
  if(!next?.classList.contains("visible"))return;
  const notes=currentDailyNotes();
  if(!notes)return;

  state.persisting=true;
  try{
    let roll=await getTodayRoll();
    if(!roll){
      const total=numericText(document.getElementById("score"));
      if(total<=0)return;
      const payload={
        user_id:state.session.user.id,
        roll_day:localDayKey(),
        notes,
        score:Math.round(total),
        chord_name:String(document.getElementById("chordName")?.textContent||"").trim()||null,
        chord_detail:String(document.getElementById("chordDetail")?.textContent||"").trim()||null,
        rarity:currentRarityId()
      };
      const {data,error}=await supabase.from("chordle_rolls").insert(payload).select("*").single();
      if(error){
        roll=await getTodayRoll();
        if(!roll)throw error;
      }else{
        roll=data;
      }

      const badges=badgeObjectsForNotes(notes);
      if(roll&&badges.length){
        const rows=badges.map(b=>({
          roll_id:roll.id,
          user_id:state.session.user.id,
          badge_key:String(b.key||b.name||"unknown"),
          badge_name:String(b.name||"Badge"),
          badge_description:String(b.desc||""),
          rarity:String(b.rarity||"common").toLowerCase(),
          points:Math.max(0,Math.round(Number(b.points)||0)),
          special:!!b.special
        }));
        const {error:badgeError}=await supabase.from("chordle_roll_badges").insert(rows);
        if(badgeError)console.warn("Chordle badge save:",badgeError.message);
      }
    }

    state.todayRoll=roll;
    await loadProfile(state.session.user,2);
    await syncOwnedBadgesToLocal();
    if(location.hash==="#leaderboard")await renderLeaderboard();
    await refreshBadgeExistCounts();
    if(location.hash.startsWith("#profile"))await renderProfile();
  }catch(err){
    console.warn("Chordle roll persistence:",err);
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
      const {data,error}=await supabase.from('profiles').update({name_color:value}).eq('id',uid).select('id,username,name_color,lifetime_score,joined_at').single();
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

  if(button.dataset.supabaseBound!=='1'){
    button.dataset.supabaseBound='1';
    button.addEventListener('click',event=>{
      event.stopPropagation();
      menu.hidden=!menu.hidden;
      button.setAttribute('aria-expanded',menu.hidden?'false':'true');
    });
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
  if(joinEl)joinEl.textContent=joined(target.joined_at);
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
  const {data}=await supabase.from("profiles").select("id,username,name_color,lifetime_score").in("id",unique);
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

async function renderLeaderboard(tab=state.leaderboardTab){
  unlockExistingPages();
  state.leaderboardTab=tab||'today';
  const list=document.getElementById('leaderboardList');
  const winnerEl=document.getElementById('leaderboardWinner');
  const dateEl=document.getElementById('leaderboardDate');
  const titleEl=document.getElementById('leaderboardTitle');
  if(!list||!winnerEl)return;

  list.replaceChildren();
  winnerEl.replaceChildren();
  if(titleEl)titleEl.textContent="Today's Leaderboard";
  if(dateEl)dateEl.textContent=new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const todayRolls=await fetchTodayRolls();
  const todayProfiles=await profileMapFor(todayRolls.map(r=>r.user_id));
  const winner=todayRolls[0]||null;
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

  if(state.leaderboardTab==='today'){
    todayRolls.slice(1).forEach((roll,index)=>{
      const profile=todayProfiles.get(roll.user_id)||{id:roll.user_id,username:'Player',name_color:'#ffffff'};
      const row=renderedLeaderboardRow(profile,index+2,rollSummary(roll));
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='alltime'){
    const rolls=await bestRollsByUser(true);
    const profiles=await profileMapFor(rolls.map(r=>r.user_id));
    rolls.forEach((roll,index)=>{
      const profile=profiles.get(roll.user_id)||{id:roll.user_id,username:'Player',name_color:'#ffffff'};
      const row=renderedLeaderboardRow(profile,index+1,rollSummary(roll));
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='lowest'){
    const rolls=await bestRollsByUser(false);
    const profiles=await profileMapFor(rolls.map(r=>r.user_id));
    rolls.forEach((roll,index)=>{
      const profile=profiles.get(roll.user_id)||{id:roll.user_id,username:'Player',name_color:'#ffffff'};
      const row=renderedLeaderboardRow(profile,index+1,rollSummary(roll));
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='badges'){
    const {data}=await supabase.from('chordle_user_badges').select('user_id,badge_key');
    const counts=new Map();
    for(const b of (data||[]))counts.set(b.user_id,(counts.get(b.user_id)||0)+1);
    const ids=[...counts.keys()];
    const profiles=await profileMapFor(ids);
    const ranked=ids.map(id=>({profile:profiles.get(id)||{id,username:'Player',name_color:'#ffffff'},count:counts.get(id)||0}))
      .sort((a,b)=>b.count-a.count||String(a.profile.username).localeCompare(String(b.profile.username)));
    ranked.forEach((entry,index)=>{
      const row=renderedMetricRow(entry.profile,index+1,entry.count.toLocaleString()+' badges');
      if(row)list.appendChild(row);
    });
  }else if(state.leaderboardTab==='discovered'){
    const {data}=await supabase.from('chordle_user_badges').select('user_id,badge_key,discovered_at').order('discovered_at',{ascending:true});
    const firstByBadge=new Map();
    for(const b of (data||[]))if(!firstByBadge.has(b.badge_key))firstByBadge.set(b.badge_key,b.user_id);
    const counts=new Map();
    for(const uid of firstByBadge.values())counts.set(uid,(counts.get(uid)||0)+1);
    const ids=[...counts.keys()];
    const profiles=await profileMapFor(ids);
    const ranked=ids.map(id=>({profile:profiles.get(id)||{id,username:'Player',name_color:'#ffffff'},count:counts.get(id)||0}))
      .sort((a,b)=>b.count-a.count||String(a.profile.username).localeCompare(String(b.profile.username)));
    ranked.forEach((entry,index)=>{
      const row=renderedMetricRow(entry.profile,index+1,entry.count.toLocaleString()+' discovered');
      if(row)list.appendChild(row);
    });
  }

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

function showLogin(){
  const o=modal('<h2>Log in</h2><p class="ca-sub">Log in to your Chordle account.</p><form><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Log In</button></div><div class="ca-msg"></div></form>');
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();msg.textContent="Logging in…";
    const fd=new FormData(f);
    const {data,error}=await supabase.auth.signInWithPassword({email:String(fd.get("email")).trim(),password:String(fd.get("password"))});
    if(error){msg.textContent=error.message;return;}
    state.session=data.session;await initializeSignedInUser(data.user);o.remove();renderProfile();
  };
}

function showSignup(){
  const o=modal('<h2>Create account</h2><p class="ca-sub">Create your Chordle account.</p><form><div class="ca-field"><label>Username</label><input name="username" minlength="2" maxlength="24" autocomplete="username" required></div><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Create Account</button></div><div class="ca-msg"></div></form>');
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();const fd=new FormData(f),uname=String(fd.get("username")).trim();
    const {data,error}=await supabase.auth.signUp({email:String(fd.get("email")).trim(),password:String(fd.get("password")),options:{data:{username:uname}}});
    if(error){msg.textContent=error.message;return;}
    if(data.session){state.session=data.session;await initializeSignedInUser(data.user);o.remove();renderProfile();}
    else{msg.className="ca-msg ok";msg.textContent="Account created. Check your email to confirm it, then log in.";}
  };
}

async function logout(){
  await supabase.auth.signOut();
  state.session=null;state.profile=null;state.todayRoll=null;
  renderProfile();
}

async function initializeSignedInUser(user){
  await loadProfile(user,2);
  await syncOwnedBadgesToLocal();
  state.todayRoll=await getTodayRoll(user.id);
  if(state.todayRoll)restoreDailyRoll(state.todayRoll);
  else if(document.getElementById("nextChord")?.classList.contains("visible"))await persistCompletedRoll();
}

function wireNavigation(){
  document.getElementById("profileNavBtn")?.addEventListener("click",e=>{
    e.preventDefault();e.stopImmediatePropagation();applyRoute("profile");renderProfile();
  },true);

  document.getElementById("leaderboardNavBtn")?.addEventListener("click",e=>{
    e.preventDefault();e.stopImmediatePropagation();applyRoute("leaderboard");renderLeaderboard("today");
  },true);

  document.getElementById("leaderboardTabs")?.addEventListener("click",e=>{
    const btn=e.target.closest(".leaderboard-tab");if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();renderLeaderboard(btn.dataset.leaderboardTab||"today");
  },true);

  document.getElementById("badgesNavBtn")?.addEventListener("click",()=>{
    setTimeout(refreshBadgeExistCounts,80);setTimeout(refreshBadgeExistCounts,350);
  },true);
}

function wireRollCompletion(){
  const next=document.getElementById("nextChord");
  if(next){
    const observer=new MutationObserver(()=>{
      if(next.classList.contains("visible")&&!state.restoring)setTimeout(persistCompletedRoll,0);
    });
    observer.observe(next,{attributes:true,attributeFilter:["class"]});
  }

  document.getElementById("revealBtn")?.addEventListener("click",()=>{
    // A server row for today always wins over the local button.
    if(state.todayRoll){
      restoreDailyRoll(state.todayRoll);
    }
  },true);
}

async function boot(){
  unlockExistingPages();
  wireNavigation();
  wireRollCompletion();

  const {data}=await supabase.auth.getSession();
  state.session=data.session;
  if(data.session?.user)await initializeSignedInUser(data.session.user);
  syncLifetimeDisplay();

  supabase.auth.onAuthStateChange((_event,session)=>{
    setTimeout(async()=>{
      state.session=session;
      if(session?.user)await initializeSignedInUser(session.user);
      else{state.profile=null;state.todayRoll=null;}
      if(location.hash.startsWith("#profile"))renderProfile();
      if(location.hash==="#leaderboard")renderLeaderboard(state.leaderboardTab);
    },0);
  });

  setInterval(()=>{
    const day=localDayKey();
    if(day!==state.dayKey){
      // Midnight reset: reload the app so Generate Chord is available for the new day.
      location.reload();
      return;
    }
    if(location.hash==="#badges")refreshBadgeExistCounts();
  },1000);
}

boot();

window.chordleSupabase=supabase;
window.chordleAuth={showLogin,showSignup,logout,renderProfile,renderLeaderboard,persistCompletedRoll,refreshBadgeExistCounts};
