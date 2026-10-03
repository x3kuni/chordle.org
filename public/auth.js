import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cpfmiszujdyrtadqtdbj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7KPZYtjYmFP0oXAVkE3KOw_VpTVXsGh";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const state = { session: null, profile: null };

const css = `
#chordle-auth-root{position:fixed;top:18px;right:18px;z-index:2147483640;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f6f6f6}
#chordle-auth-root *{box-sizing:border-box}
.ca-bar{display:flex;gap:8px;align-items:center;background:rgba(15,15,18,.74);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:8px;box-shadow:0 10px 35px rgba(0,0,0,.28)}
.ca-btn{appearance:none;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;border-radius:11px;padding:9px 12px;font:600 13px/1 inherit;cursor:pointer;transition:.18s ease}
.ca-btn:hover{background:rgba(255,255,255,.14);transform:translateY(-1px)}
.ca-primary{background:#f3f3f3;color:#111;border-color:#f3f3f3}.ca-primary:hover{background:#fff}
.ca-user{display:flex;align-items:center;gap:9px;padding:2px 4px 2px 7px}
.ca-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.13);font-weight:800}
.ca-name{font-size:13px;font-weight:700;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ca-overlay{position:fixed;inset:0;z-index:2147483641;background:rgba(0,0,0,.62);backdrop-filter:blur(7px);display:grid;place-items:center;padding:20px}
.ca-modal{width:min(430px,100%);background:#151519;border:1px solid rgba(255,255,255,.13);border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.ca-modal h2{margin:0 0 6px;font-size:25px}.ca-sub{color:#aaa;margin:0 0 20px;font-size:13px;line-height:1.45}
.ca-field{display:grid;gap:7px;margin:13px 0}.ca-field label{font-size:12px;color:#bbb;font-weight:700}
.ca-field input{width:100%;border:1px solid rgba(255,255,255,.14);background:#0e0e11;color:white;border-radius:11px;padding:12px 13px;outline:none;font:inherit}
.ca-field input:focus{border-color:rgba(255,255,255,.38)}
.ca-actions{display:flex;gap:9px;margin-top:18px}.ca-actions .ca-btn{flex:1;padding:12px}
.ca-msg{min-height:19px;margin-top:12px;font-size:12px;color:#ffb3b3}.ca-msg.ok{color:#a8efbe}
.ca-x{float:right;background:none;border:0;color:#aaa;font-size:24px;cursor:pointer;line-height:1}
.ca-profile-grid{display:grid;grid-template-columns:110px 1fr;gap:9px 14px;margin:18px 0;font-size:13px}.ca-k{color:#999}.ca-v{word-break:break-word}
@media(max-width:650px){#chordle-auth-root{top:10px;right:10px}.ca-bar{padding:6px}.ca-btn{padding:8px 9px}.ca-name{max-width:90px}}
`;
const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

const root = document.createElement("div");
root.id = "chordle-auth-root";
document.body.appendChild(root);

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function usernameFromUser(user){return state.profile?.username || user?.user_metadata?.username || user?.email?.split("@")[0] || "Player";}

function modal(inner){
  const overlay=document.createElement("div");
  overlay.className="ca-overlay";
  overlay.innerHTML='<div class="ca-modal"><button class="ca-x" aria-label="Close">×</button>'+inner+'</div>';
  overlay.querySelector(".ca-x").onclick=()=>overlay.remove();
  overlay.addEventListener("click",e=>{if(e.target===overlay) overlay.remove();});
  document.body.appendChild(overlay);
  return overlay;
}

async function loadProfile(user){
  state.profile=null;
  if(!user) return null;
  const {data,error}=await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if(!error && data) state.profile=data;
  return state.profile;
}

async function ensureProfile(user, preferredUsername){
  if(!user) return;
  const username=(preferredUsername || user.user_metadata?.username || "").trim();
  if(!username) return loadProfile(user);
  const {error}=await supabase.from("profiles").upsert({id:user.id,username},{onConflict:"id"});
  if(error) console.warn("Chordle profile upsert:",error.message);
  return loadProfile(user);
}

function render(){
  const user=state.session?.user;
  if(!user){
    root.innerHTML='<div class="ca-bar"><button class="ca-btn" data-a="login">Log In</button><button class="ca-btn ca-primary" data-a="signup">Create Account</button></div>';
    root.querySelector('[data-a="login"]').onclick=showLogin;
    root.querySelector('[data-a="signup"]').onclick=showSignup;
    return;
  }
  const name=usernameFromUser(user);
  root.innerHTML='<div class="ca-bar"><button class="ca-btn ca-user" data-a="profile"><span class="ca-avatar">'+esc(name.charAt(0).toUpperCase())+'</span><span class="ca-name">'+esc(name)+'</span></button><button class="ca-btn" data-a="logout">Log Out</button></div>';
  root.querySelector('[data-a="profile"]').onclick=showProfile;
  root.querySelector('[data-a="logout"]').onclick=logout;
}

function showLogin(){
  const o=modal('<h2>Log in</h2><p class="ca-sub">Continue your Chordle account and keep your profile tied to your Supabase user.</p><form><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Log In</button></div><div class="ca-msg"></div></form>');
  const f=o.querySelector("form"), msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault(); msg.textContent="Logging in…";
    const fd=new FormData(f);
    const {data,error}=await supabase.auth.signInWithPassword({email:String(fd.get("email")).trim(),password:String(fd.get("password"))});
    if(error){msg.textContent=error.message;return;}
    state.session=data.session; await loadProfile(data.user); render(); o.remove();
  };
}

function showSignup(){
  const o=modal('<h2>Create account</h2><p class="ca-sub">Create your Chordle login. Your username is stored in your real Supabase profile row.</p><form><div class="ca-field"><label>Username</label><input name="username" minlength="2" maxlength="24" autocomplete="username" required></div><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Create Account</button></div><div class="ca-msg"></div></form>');
  const f=o.querySelector("form"), msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(f), username=String(fd.get("username")).trim(), email=String(fd.get("email")).trim(), password=String(fd.get("password"));
    msg.textContent="Creating account…";
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username}}});
    if(error){msg.textContent=error.message;return;}
    if(data.session){
      state.session=data.session; await ensureProfile(data.user,username); render(); o.remove();
    } else {
      msg.classList.add("ok"); msg.textContent="Account created. Check your email to confirm it, then log in.";
    }
  };
}

function showProfile(){
  const u=state.session?.user;if(!u)return;
  const p=state.profile||{};
  const created=p.created_at||u.created_at||"—";
  modal('<h2>'+esc(usernameFromUser(u))+'</h2><p class="ca-sub">This is the profile currently loaded from Supabase.</p><div class="ca-profile-grid"><div class="ca-k">Username</div><div class="ca-v">'+esc(usernameFromUser(u))+'</div><div class="ca-k">Email</div><div class="ca-v">'+esc(u.email||"—")+'</div><div class="ca-k">User ID</div><div class="ca-v">'+esc(u.id)+'</div><div class="ca-k">Created</div><div class="ca-v">'+esc(created)+'</div></div>');
}

async function logout(){await supabase.auth.signOut();state.session=null;state.profile=null;render();}

async function boot(){
  const {data}=await supabase.auth.getSession();
  state.session=data.session;
  if(state.session?.user) await loadProfile(state.session.user);
  render();
  supabase.auth.onAuthStateChange(async(_event,session)=>{
    state.session=session;
    if(session?.user) await loadProfile(session.user); else state.profile=null;
    render();
  });
}
boot();

window.chordleSupabase=supabase;
