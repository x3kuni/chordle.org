import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cpfmiszujdyrtadqtdbj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7KPZYtjYmFP0oXAVkE3KOw_VpTVXsGh";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const state = {
  session: null,
  profile: null,
  leaderboard: []
};

const css = `
#chordle-auth-root{position:fixed;top:18px;right:18px;z-index:2147483640;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f6f6f6}
#chordle-auth-root *,.ca-overlay *{box-sizing:border-box}
.ca-bar{display:flex;gap:8px;align-items:center;background:rgba(15,15,18,.76);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:8px;box-shadow:0 10px 35px rgba(0,0,0,.28)}
.ca-btn{appearance:none;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;border-radius:11px;padding:9px 12px;font:600 13px/1 inherit;cursor:pointer;transition:.18s ease}
.ca-btn:hover{background:rgba(255,255,255,.14);transform:translateY(-1px)}
.ca-primary{background:#f3f3f3;color:#111;border-color:#f3f3f3}.ca-primary:hover{background:#fff}
.ca-user{display:flex;align-items:center;gap:9px;padding:2px 4px 2px 7px}
.ca-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.13);font-weight:800}
.ca-name{font-size:13px;font-weight:700;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ca-overlay{position:fixed;inset:0;z-index:2147483641;background:rgba(0,0,0,.64);backdrop-filter:blur(7px);display:grid;place-items:center;padding:20px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f6f6f6}
.ca-modal{width:min(470px,100%);max-height:min(760px,90vh);overflow:auto;background:#151519;border:1px solid rgba(255,255,255,.13);border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.ca-modal.ca-wide{width:min(650px,100%)}
.ca-modal h2{margin:0 0 6px;font-size:25px}.ca-sub{color:#aaa;margin:0 0 20px;font-size:13px;line-height:1.45}
.ca-field{display:grid;gap:7px;margin:13px 0}.ca-field label{font-size:12px;color:#bbb;font-weight:700}
.ca-field input{width:100%;border:1px solid rgba(255,255,255,.14);background:#0e0e11;color:white;border-radius:11px;padding:12px 13px;outline:none;font:inherit}
.ca-field input:focus{border-color:rgba(255,255,255,.38)}
.ca-actions{display:flex;gap:9px;margin-top:18px}.ca-actions .ca-btn{flex:1;padding:12px}
.ca-msg{min-height:19px;margin-top:12px;font-size:12px;color:#ffb3b3}.ca-msg.ok{color:#a8efbe}
.ca-x{float:right;background:none;border:0;color:#aaa;font-size:24px;cursor:pointer;line-height:1}
.ca-profile-head{display:flex;align-items:center;gap:14px;margin:12px 0 20px}
.ca-profile-avatar{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.12);font-size:22px;font-weight:800}
.ca-profile-title{font-size:22px;font-weight:800}
.ca-profile-grid{display:grid;grid-template-columns:125px 1fr;gap:10px 14px;margin:18px 0;font-size:13px}
.ca-k{color:#999}.ca-v{word-break:break-word}
.ca-empty{padding:24px;text-align:center;color:#aaa;border:1px dashed rgba(255,255,255,.13);border-radius:14px}
.ca-lb{display:grid;gap:7px;margin-top:16px}
.ca-lb-row{display:grid;grid-template-columns:44px minmax(0,1fr) 130px;align-items:center;gap:10px;padding:11px 12px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.075);border-radius:12px}
.ca-rank{color:#999;font-weight:800;text-align:center}.ca-lb-name{font-weight:750;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ca-score{text-align:right;font-variant-numeric:tabular-nums;font-weight:800}
.ca-me{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.09)}
.ca-note{margin-top:12px;color:#888;font-size:11px;line-height:1.45}
@media(max-width:650px){#chordle-auth-root{top:10px;right:10px}.ca-bar{padding:6px}.ca-btn{padding:8px 9px}.ca-name{max-width:90px}.ca-lb-row{grid-template-columns:38px minmax(0,1fr) 92px}.ca-modal{padding:19px}}
`;

const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

const root = document.createElement("div");
root.id = "chordle-auth-root";
document.body.appendChild(root);

function esc(v="") {
  return String(v).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

function usernameFromUser(user) {
  return state.profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Player";
}

function formatScore(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function safeNameColor(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  if (/^[a-z]{3,20}$/i.test(v) && CSS.supports("color", v)) return v;
  return "";
}

function modal(inner, wide=false) {
  const overlay = document.createElement("div");
  overlay.className = "ca-overlay";
  overlay.innerHTML = '<div class="ca-modal'+(wide?' ca-wide':'')+'"><button class="ca-x" aria-label="Close">×</button>'+inner+'</div>';
  overlay.querySelector(".ca-x").onclick = () => overlay.remove();
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
}

async function loadProfile(user, retries=0) {
  state.profile = null;
  if (!user) return null;

  for (let i = 0; i <= retries; i++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,name_color,lifetime_score,joined_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data) {
      state.profile = data;
      return data;
    }

    if (i < retries) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  return null;
}

async function loadLeaderboard() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,name_color,lifetime_score,joined_at")
    .order("lifetime_score", { ascending: false })
    .order("joined_at", { ascending: true })
    .limit(100);

  if (error) throw error;
  state.leaderboard = data || [];
  return state.leaderboard;
}

function renderAuthBar() {
  const user = state.session?.user;

  if (!user) {
    root.innerHTML = '<div class="ca-bar"><button class="ca-btn" data-a="login">Log In</button><button class="ca-btn ca-primary" data-a="signup">Create Account</button></div>';
    root.querySelector('[data-a="login"]').onclick = showLogin;
    root.querySelector('[data-a="signup"]').onclick = showSignup;
    return;
  }

  const name = usernameFromUser(user);
  root.innerHTML = '<div class="ca-bar"><button class="ca-btn ca-user" data-a="profile"><span class="ca-avatar">'+esc(name.charAt(0).toUpperCase())+'</span><span class="ca-name">'+esc(name)+'</span></button><button class="ca-btn" data-a="logout">Log Out</button></div>';
  root.querySelector('[data-a="profile"]').onclick = showProfile;
  root.querySelector('[data-a="logout"]').onclick = logout;
}

function showLogin() {
  const o = modal('<h2>Log in</h2><p class="ca-sub">Log in to your Chordle account. Your session stays signed in on this browser until you log out.</p><form><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Log In</button></div><div class="ca-msg"></div></form>');

  const f = o.querySelector("form");
  const msg = o.querySelector(".ca-msg");

  f.onsubmit = async e => {
    e.preventDefault();
    msg.className = "ca-msg";
    msg.textContent = "Logging in…";

    const fd = new FormData(f);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")).trim(),
      password: String(fd.get("password"))
    });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    state.session = data.session;
    await loadProfile(data.user, 2);
    renderAuthBar();
    o.remove();
  };
}

function showSignup() {
  const o = modal('<h2>Create account</h2><p class="ca-sub">Your Chordle profile is tied to your Supabase Auth account, so different users get separate profiles and scores.</p><form><div class="ca-field"><label>Username</label><input name="username" minlength="2" maxlength="24" autocomplete="username" required></div><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Create Account</button></div><div class="ca-msg"></div></form>');

  const f = o.querySelector("form");
  const msg = o.querySelector(".ca-msg");

  f.onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(f);
    const username = String(fd.get("username")).trim();
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));

    msg.className = "ca-msg";
    msg.textContent = "Creating account…";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    if (data.session) {
      state.session = data.session;
      await loadProfile(data.user, 6);
      renderAuthBar();
      o.remove();
      showProfile();
      return;
    }

    msg.className = "ca-msg ok";
    msg.textContent = "Account created. Check your email to confirm it, then log in.";
  };
}

async function showProfile() {
  const user = state.session?.user;

  if (!user) {
    showLogin();
    return;
  }

  await loadProfile(user, 1);
  const p = state.profile;
  const name = usernameFromUser(user);
  const color = safeNameColor(p?.name_color);
  const colorStyle = color ? ' style="color:'+esc(color)+'"' : "";

  const content = p
    ? '<div class="ca-profile-head"><div class="ca-profile-avatar">'+esc(name.charAt(0).toUpperCase())+'</div><div><div class="ca-profile-title"'+colorStyle+'>'+esc(name)+'</div><div class="ca-sub" style="margin:3px 0 0">Chordle profile</div></div></div><div class="ca-profile-grid"><div class="ca-k">Username</div><div class="ca-v">'+esc(name)+'</div><div class="ca-k">Lifetime score</div><div class="ca-v">'+formatScore(p.lifetime_score)+'</div><div class="ca-k">Name color</div><div class="ca-v">'+esc(p.name_color || "Default")+'</div><div class="ca-k">Joined</div><div class="ca-v">'+esc(formatDate(p.joined_at))+'</div><div class="ca-k">Email</div><div class="ca-v">'+esc(user.email || "—")+'</div></div>'
    : '<h2>'+esc(name)+'</h2><div class="ca-empty">You are logged in, but no matching row was returned from <strong>profiles</strong> yet.</div><p class="ca-note">Account ID: '+esc(user.id)+'</p>';

  modal(content);
}

async function showLeaderboard() {
  const o = modal('<h2>Leaderboard</h2><p class="ca-sub">Top Chordle profiles by lifetime score.</p><div class="ca-empty">Loading leaderboard…</div>', true);

  try {
    const rows = await loadLeaderboard();
    const body = o.querySelector(".ca-modal");

    let html = '<button class="ca-x" aria-label="Close">×</button><h2>Leaderboard</h2><p class="ca-sub">Top Chordle profiles by lifetime score.</p>';

    if (!rows.length) {
      html += '<div class="ca-empty">No profiles are on the leaderboard yet.</div>';
    } else {
      html += '<div class="ca-lb">';
      rows.forEach((p, index) => {
        const isMe = state.session?.user?.id === p.id;
        const color = safeNameColor(p.name_color);
        const style = color ? ' style="color:'+esc(color)+'"' : "";
        html += '<div class="ca-lb-row'+(isMe?' ca-me':'')+'"><div class="ca-rank">#'+(index+1)+'</div><div class="ca-lb-name"'+style+'>'+esc(p.username || "Unnamed")+(isMe?' (You)':'')+'</div><div class="ca-score">'+formatScore(p.lifetime_score)+'</div></div>';
      });
      html += '</div>';
    }

    body.innerHTML = html;
    body.querySelector(".ca-x").onclick = () => o.remove();
  } catch (err) {
    const empty = o.querySelector(".ca-empty");
    if (empty) empty.textContent = "Could not load the leaderboard: " + (err?.message || "Unknown error");
  }
}

async function logout() {
  await supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  renderAuthBar();
}

async function refreshFromSession(session) {
  state.session = session;
  if (session?.user) {
    await loadProfile(session.user, 1);
  } else {
    state.profile = null;
  }
  renderAuthBar();
}

function activateExistingPageButtons() {
  document.addEventListener("click", e => {
    const target = e.target.closest("button,a,[role='button']");
    if (!target) return;
    if (target.closest("#chordle-auth-root") || target.closest(".ca-overlay")) return;

    const text = (target.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

    if (text === "profile") {
      e.preventDefault();
      e.stopPropagation();
      showProfile();
    }

    if (text === "leaderboard") {
      e.preventDefault();
      e.stopPropagation();
      showLeaderboard();
    }
  }, true);
}

async function boot() {
  activateExistingPageButtons();

  const { data, error } = await supabase.auth.getSession();
  if (!error) {
    await refreshFromSession(data.session);
  } else {
    renderAuthBar();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      refreshFromSession(session);
    }, 0);
  });
}

boot();

window.chordleSupabase = supabase;
window.chordleAuth = {
  showLogin,
  showSignup,
  showProfile,
  showLeaderboard,
  refreshProfile: async () => {
    if (state.session?.user) await loadProfile(state.session.user, 1);
    return state.profile;
  }
};
