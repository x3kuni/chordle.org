import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cpfmiszujdyrtadqtdbj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7KPZYtjYmFP0oXAVkE3KOw_VpTVXsGh";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const state = { session:null, profile:null, leaderboard:[] };

const style=document.createElement("style");
style.textContent=`
#chordle-profile-auth-slot{margin:18px 0 2px;padding:14px 16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045)}
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
.ca-profile-empty{padding:17px 0;color:#8d929c;font-size:13px}
`;
document.head.appendChild(style);

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function username(user){return state.profile?.username||user?.user_metadata?.username||user?.email?.split("@")[0]||"Player";}
function score(v){const n=Number(v||0);return Number.isFinite(n)?Math.round(n).toLocaleString():"0";}
function joined(v){if(!v)return "Joined —";const d=new Date(v);return Number.isNaN(d.getTime())?"Joined —":"Joined "+d.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});}
function color(v){return typeof v==="string"&&CSS.supports("color",v)?v:"";}

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

async function loadProfile(user,retries=0){
  state.profile=null;
  if(!user)return null;
  for(let i=0;i<=retries;i++){
    const {data,error}=await supabase.from("profiles")
      .select("id,username,name_color,lifetime_score,joined_at")
      .eq("id",user.id).maybeSingle();
    if(!error&&data){state.profile=data;return data;}
    if(i<retries)await new Promise(r=>setTimeout(r,300));
  }
  return null;
}

async function loadLeaderboard(){
  const {data,error}=await supabase.from("profiles")
    .select("id,username,name_color,lifetime_score,joined_at")
    .order("lifetime_score",{ascending:false})
    .order("joined_at",{ascending:true})
    .limit(100);
  if(error)throw error;
  state.leaderboard=data||[];
  return state.leaderboard;
}

function mountAccountControls(){
  const page=document.getElementById("profilePage");
  const head=page?.querySelector(".profile-head");
  if(!page||!head)return;

  let slot=document.getElementById("chordle-profile-auth-slot");
  if(!slot){
    slot=document.createElement("div");
    slot.id="chordle-profile-auth-slot";
    head.insertAdjacentElement("afterend",slot);
  }

  const user=state.session?.user;
  if(!user){
    slot.innerHTML='<div class="ca-account-title">Chordle Account</div><div class="ca-account-row"><button class="ca-btn ca-primary" data-ca="signup">Create Account</button><button class="ca-btn" data-ca="login">Log In</button></div>';
    slot.querySelector('[data-ca="signup"]').onclick=showSignup;
    slot.querySelector('[data-ca="login"]').onclick=showLogin;
  }else{
    slot.innerHTML='<div class="ca-account-title">Chordle Account</div><div class="ca-account-row"><div class="ca-account-user">Logged in as '+esc(username(user))+'</div><button class="ca-btn" data-ca="logout">Log Out</button></div>';
    slot.querySelector('[data-ca="logout"]').onclick=logout;
  }
}

function renderProfile(){
  unlockExistingPages();
  mountAccountControls();

  const nameEl=document.getElementById("profileName");
  const joinEl=document.getElementById("profileJoinDate");
  const lifetimeEl=document.getElementById("profileLifetimeScore");
  const bestEl=document.getElementById("profileBestRoll");
  const badgesEl=document.getElementById("profileTopBadges");
  const colorControl=document.getElementById("profileColorControl");

  const user=state.session?.user;
  if(!user){
    if(nameEl){nameEl.textContent="Profile";nameEl.style.color="";}
    if(joinEl)joinEl.textContent="Log in or create an account to view your profile";
    if(lifetimeEl)lifetimeEl.textContent="—";
    if(colorControl)colorControl.hidden=true;
    if(bestEl)bestEl.innerHTML='<div class="profile-badges-empty">Your best roll will appear here after you sign in and complete a roll.</div>';
    if(badgesEl)badgesEl.innerHTML='<div class="profile-badges-empty">Your top badges will appear here after you sign in.</div>';
    return;
  }

  const p=state.profile;
  const name=username(user);
  if(nameEl){
    nameEl.textContent=name;
    nameEl.style.color=color(p?.name_color);
  }
  if(joinEl)joinEl.textContent=joined(p?.joined_at||user.created_at);
  if(lifetimeEl)lifetimeEl.textContent=score(p?.lifetime_score);
  if(colorControl)colorControl.hidden=true;

  if(bestEl && !bestEl.children.length){
    bestEl.innerHTML='<div class="profile-badges-empty">No server-backed rolls recorded yet.</div>';
  }
  if(badgesEl && !badgesEl.children.length){
    badgesEl.innerHTML='<div class="profile-badges-empty">No server-backed badges recorded yet.</div>';
  }
}

function makeLeaderboardRow(p,rank){
  const row=document.createElement("div");
  row.className="leaderboard-metric-row";

  const rankEl=document.createElement("div");
  rankEl.className="leaderboard-metric-rank";
  rankEl.textContent="#"+rank;

  const user=document.createElement("div");
  user.className="leaderboard-metric-user";
  const link=document.createElement("a");
  link.href="#profile/"+encodeURIComponent(p.username||p.id);
  link.className="mock-profile-link adaptive-name-color";
  link.textContent=p.username||"Unnamed";
  const c=color(p.name_color);
  if(c)link.style.color=c;
  user.appendChild(link);

  const value=document.createElement("div");
  value.className="leaderboard-metric-value";
  value.textContent=score(p.lifetime_score);

  row.append(rankEl,user,value);
  return row;
}

async function renderLeaderboard(){
  unlockExistingPages();

  const list=document.getElementById("leaderboardList");
  const winner=document.getElementById("leaderboardWinner");
  const date=document.getElementById("leaderboardDate");
  const title=document.getElementById("leaderboardTitle");
  if(!list)return;

  let rows;
  try{rows=await loadLeaderboard();}
  catch(err){
    list.innerHTML='<div class="profile-badges-empty">Unable to load leaderboard.</div>';
    console.warn("Chordle leaderboard:",err);
    return;
  }

  if(title)title.textContent="All-Time Leaderboard";
  if(date)date.textContent="Ranked by lifetime score";
  if(winner)winner.replaceChildren();
  list.replaceChildren();

  if(!rows.length){
    list.innerHTML='<div class="profile-badges-empty">No player profiles yet.</div>';
    return;
  }

  rows.forEach((p,i)=>list.appendChild(makeLeaderboardRow(p,i+1)));

  const tabs=document.getElementById("leaderboardTabs");
  if(tabs){
    tabs.querySelectorAll(".leaderboard-tab").forEach(btn=>{
      const active=btn.dataset.leaderboardTab==="alltime";
      btn.classList.toggle("active",active);
      btn.setAttribute("aria-selected",active?"true":"false");
    });
  }
}

function showLogin(){
  const o=modal('<h2>Log in</h2><p class="ca-sub">Log in to your Chordle account.</p><form><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Log In</button></div><div class="ca-msg"></div></form>');
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();msg.textContent="Logging in…";
    const fd=new FormData(f);
    const {data,error}=await supabase.auth.signInWithPassword({email:String(fd.get("email")).trim(),password:String(fd.get("password"))});
    if(error){msg.textContent=error.message;return;}
    state.session=data.session;
    await loadProfile(data.user,2);
    o.remove();
    renderProfile();
  };
}

function showSignup(){
  const o=modal('<h2>Create account</h2><p class="ca-sub">Create your Chordle account.</p><form><div class="ca-field"><label>Username</label><input name="username" minlength="2" maxlength="24" autocomplete="username" required></div><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Create Account</button></div><div class="ca-msg"></div></form>');
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(f);
    const uname=String(fd.get("username")).trim();
    const {data,error}=await supabase.auth.signUp({
      email:String(fd.get("email")).trim(),
      password:String(fd.get("password")),
      options:{data:{username:uname}}
    });
    if(error){msg.textContent=error.message;return;}
    if(data.session){
      state.session=data.session;
      await loadProfile(data.user,6);
      o.remove();renderProfile();
    }else{
      msg.className="ca-msg ok";
      msg.textContent="Account created. Check your email to confirm it, then log in.";
    }
  };
}

async function logout(){
  await supabase.auth.signOut();
  state.session=null;state.profile=null;
  renderProfile();
}

function scheduleRouteRender(){
  setTimeout(()=>{
    unlockExistingPages();
    const hash=location.hash||"";
    if(hash.startsWith("#profile")) renderProfile();
    if(hash==="#leaderboard") renderLeaderboard();
  },0);
  setTimeout(()=>{
    const hash=location.hash||"";
    if(hash.startsWith("#profile")) renderProfile();
    if(hash==="#leaderboard") renderLeaderboard();
  },80);
}

async function refreshSession(session){
  state.session=session;
  if(session?.user)await loadProfile(session.user,1);
  else state.profile=null;
  scheduleRouteRender();
}

async function boot(){
  unlockExistingPages();

  const profileBtn=document.getElementById("profileNavBtn");
  const leaderboardBtn=document.getElementById("leaderboardNavBtn");
  profileBtn?.addEventListener("click",scheduleRouteRender);
  leaderboardBtn?.addEventListener("click",scheduleRouteRender);

  document.getElementById("leaderboardTabs")?.addEventListener("click",e=>{
    const btn=e.target.closest(".leaderboard-tab");
    if(!btn)return;
    // Until daily-roll/badge server tables are connected, keep this existing
    // page backed by the profiles table rather than displaying mock data.
    setTimeout(renderLeaderboard,0);
  });

  window.addEventListener("hashchange",scheduleRouteRender);

  const {data}=await supabase.auth.getSession();
  await refreshSession(data.session);

  supabase.auth.onAuthStateChange((_event,session)=>{
    setTimeout(()=>refreshSession(session),0);
  });
}

boot();

window.chordleSupabase=supabase;
window.chordleAuth={showLogin,showSignup,logout,renderProfile,renderLeaderboard,loadProfile,loadLeaderboard};
