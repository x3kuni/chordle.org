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
#chordle-profile-auth-slot{margin:16px 0;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.045);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:inherit}
#chordle-profile-auth-slot *,.ca-overlay *{box-sizing:border-box}
.ca-profile-auth-title{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.65;margin-bottom:9px}
.ca-profile-auth-actions{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.ca-profile-auth-user{font-size:13px;font-weight:700;margin-right:auto}
.ca-btn{appearance:none;border:1px solid rgba(255,255,255,.17);background:rgba(255,255,255,.08);color:inherit;border-radius:11px;padding:9px 12px;font:600 13px/1 inherit;cursor:pointer;transition:.18s ease}
.ca-btn:hover{background:rgba(255,255,255,.14);transform:translateY(-1px)}
.ca-primary{background:#f3f3f3;color:#111;border-color:#f3f3f3}.ca-primary:hover{background:#fff}
.ca-overlay{position:fixed;inset:0;z-index:2147483641;background:rgba(0,0,0,.64);backdrop-filter:blur(7px);display:grid;place-items:center;padding:20px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f6f6f6}
.ca-modal{width:min(430px,100%);max-height:min(760px,90vh);overflow:auto;background:#151519;border:1px solid rgba(255,255,255,.13);border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.ca-modal h2{margin:0 0 6px;font-size:25px}.ca-sub{color:#aaa;margin:0 0 20px;font-size:13px;line-height:1.45}
.ca-field{display:grid;gap:7px;margin:13px 0}.ca-field label{font-size:12px;color:#bbb;font-weight:700}
.ca-field input{width:100%;border:1px solid rgba(255,255,255,.14);background:#0e0e11;color:white;border-radius:11px;padding:12px 13px;outline:none;font:inherit}
.ca-field input:focus{border-color:rgba(255,255,255,.38)}
.ca-actions{display:flex;gap:9px;margin-top:18px}.ca-actions .ca-btn{flex:1;padding:12px}
.ca-msg{min-height:19px;margin-top:12px;font-size:12px;color:#ffb3b3}.ca-msg.ok{color:#a8efbe}
.ca-x{float:right;background:none;border:0;color:#aaa;font-size:24px;cursor:pointer;line-height:1}
`;

const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

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

function modal(inner) {
  const overlay = document.createElement("div");
  overlay.className = "ca-overlay";
  overlay.innerHTML = '<div class="ca-modal"><button class="ca-x" aria-label="Close">×</button>'+inner+'</div>';
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
      publishProfile();
      return data;
    }

    if (i < retries) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  publishProfile();
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
  document.dispatchEvent(new CustomEvent("chordle:leaderboard-data", {
    detail: { rows: state.leaderboard }
  }));
  return state.leaderboard;
}

function publishProfile() {
  document.dispatchEvent(new CustomEvent("chordle:profile-data", {
    detail: {
      user: state.session?.user || null,
      profile: state.profile
    }
  }));
}

function showLogin() {
  const o = modal('<h2>Log in</h2><p class="ca-sub">Log in to your Chordle account.</p><form><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Log In</button></div><div class="ca-msg"></div></form>');
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
    o.remove();
    mountProfileAccountArea();
  };
}

function showSignup() {
  const o = modal('<h2>Create account</h2><p class="ca-sub">Create a Chordle account. Your profile and score will be tied to this account across devices.</p><form><div class="ca-field"><label>Username</label><input name="username" minlength="2" maxlength="24" autocomplete="username" required></div><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Create Account</button></div><div class="ca-msg"></div></form>');
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
      o.remove();
      mountProfileAccountArea();
      return;
    }

    msg.className = "ca-msg ok";
    msg.textContent = "Account created. Check your email to confirm it, then return here and log in.";
  };
}

async function logout() {
  await supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  publishProfile();
  mountProfileAccountArea();
}

function visible(el) {
  if (!el || !el.isConnected) return false;
  const s = getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}

function exactText(el, text) {
  return (el?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase() === text;
}

function findProfileHost() {
  const preferred = [
    '[data-page="profile"]',
    '[data-view="profile"]',
    '[data-panel="profile"]',
    '#profile-page',
    '#profilePage',
    '.profile-page',
    '#profile-panel',
    '.profile-panel',
    '#profile-modal',
    '.profile-modal'
  ];

  for (const selector of preferred) {
    const el = document.querySelector(selector);
    if (visible(el)) return el;
  }

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,[role='heading']")]
    .filter(el => visible(el) && exactText(el, "profile"));

  for (const heading of headings) {
    let node = heading.parentElement;
    while (node && node !== document.body) {
      if (visible(node)) {
        const r = node.getBoundingClientRect();
        if (r.width >= 240 && r.height >= 120) return node;
      }
      node = node.parentElement;
    }
  }

  const named = [...document.querySelectorAll('[id*="profile" i],[class*="profile" i]')]
    .filter(el => visible(el) && !el.matches("button,a"));

  named.sort((a,b) => {
    const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
    return (br.width*br.height)-(ar.width*ar.height);
  });

  return named[0] || null;
}

function mountProfileAccountArea() {
  const old = document.getElementById("chordle-profile-auth-slot");
  if (old) old.remove();

  const host = findProfileHost();
  if (!host) return false;

  const slot = document.createElement("div");
  slot.id = "chordle-profile-auth-slot";

  const user = state.session?.user;
  if (!user) {
    slot.innerHTML =
      '<div class="ca-profile-auth-title">Chordle Account</div>'+
      '<div class="ca-profile-auth-actions">'+
      '<button class="ca-btn ca-primary" data-auth="signup">Create Account</button>'+
      '<button class="ca-btn" data-auth="login">Log In</button>'+
      '</div>';

    slot.querySelector('[data-auth="signup"]').onclick = showSignup;
    slot.querySelector('[data-auth="login"]').onclick = showLogin;
  } else {
    const name = usernameFromUser(user);
    slot.innerHTML =
      '<div class="ca-profile-auth-title">Chordle Account</div>'+
      '<div class="ca-profile-auth-actions">'+
      '<div class="ca-profile-auth-user">Logged in as '+esc(name)+'</div>'+
      '<button class="ca-btn" data-auth="logout">Log Out</button>'+
      '</div>';

    slot.querySelector('[data-auth="logout"]').onclick = logout;
  }

  const heading = [...host.querySelectorAll("h1,h2,h3,h4,[role='heading']")]
    .find(el => exactText(el, "profile"));

  if (heading && heading.parentElement === host) {
    heading.insertAdjacentElement("afterend", slot);
  } else {
    host.prepend(slot);
  }

  return true;
}

function scheduleProfileMount() {
  [0, 40, 120, 300, 700].forEach(ms => {
    setTimeout(() => mountProfileAccountArea(), ms);
  });
}

function watchExistingChordleUI() {
  document.addEventListener("click", e => {
    const target = e.target.closest("button,a,[role='button']");
    if (!target) return;

    const text = (target.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

    // Do not prevent or stop Chordle's own click handlers.
    // The original Profile and Leaderboard pages remain fully in control.
    if (text === "profile") {
      scheduleProfileMount();
    }

    if (text === "leaderboard") {
      loadLeaderboard().catch(err => {
        console.warn("Chordle leaderboard fetch failed:", err);
      });
    }
  });

  const observer = new MutationObserver(() => {
    if (findProfileHost()) mountProfileAccountArea();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden"]
  });
}

async function refreshFromSession(session) {
  state.session = session;

  if (session?.user) {
    await loadProfile(session.user, 1);
  } else {
    state.profile = null;
    publishProfile();
  }

  mountProfileAccountArea();
}

async function boot() {
  watchExistingChordleUI();

  const { data, error } = await supabase.auth.getSession();
  if (!error) {
    await refreshFromSession(data.session);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => refreshFromSession(session), 0);
  });

  loadLeaderboard().catch(() => {});
}

boot();

window.chordleSupabase = supabase;
window.chordleAuth = {
  showLogin,
  showSignup,
  logout,
  mountProfileAccountArea,
  getProfile: () => state.profile,
  refreshProfile: async () => {
    if (state.session?.user) await loadProfile(state.session.user, 1);
    return state.profile;
  },
  getLeaderboard: loadLeaderboard
};
