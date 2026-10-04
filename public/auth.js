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
const ANON_ROLL_BROWSER_KEY = "chordle_anonymous_roll_browser_v1";
const SIGNUP_COOLDOWN_KEY = "chordle_signup_cooldown_v1";
const SIGNUP_COOLDOWN_MS = 60000;
const CHORDLE_DISCORD_URL = "https://discord.gg/vsWx9n2S4";

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
  badgeSortOrder: "desc",
  rollHistoryRenderSeq: 0,
  profileLikeRenderSeq: 0,
  anonymousPromptedDay: null,
  externalReplay: null,
  replayLoadSeq: 0,
  homeNeedsReset: false,
  todayNewBadgeKeys: new Set(),
  firstDiscoveryKeys: new Set(),
  dayKey: localDayKey()
};

const NOTE_NAMES_FLAT = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
const PROFILE_NAME_COLORS={white:"#f4f5f7",red:"#ff6262",orange:"#ff9f43",yellow:"#ffd84d",green:"#62d58b",blue:"#5ea7ff",purple:"#aa79ff",pink:"#ff72c6"};
const INFO_HASHES=new Set(["#credits","#how-to-play","#updates"]);
const RARITY_EMOJI={
  common:"⬜",
  uncommon:"🟩",
  rare:"🟦",
  epic:"🟪",
  legendary:"🟨",
  mythic:"🟥",
  ultra:"🩷",
  godly:"🔳",
  supreme:"🌈",
  omnipotent:"⬛",
  eternal:"🟧",
  absolute:"🌌"
};
const RARITY_ORDER=["common","uncommon","rare","epic","legendary","mythic","ultra","godly","supreme","omnipotent","eternal","absolute"];

const style=document.createElement("style");
style.textContent=`
#chordle-profile-auth-slot{margin:24px 0 0;padding:14px 16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045)}
#chordle-profile-auth-slot *,.ca-overlay *{box-sizing:border-box}
.ca-account-title{margin:0 0 9px;color:#8d929c;font-size:10px;font-weight:760;letter-spacing:.14em;text-transform:uppercase}
.ca-account-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;min-height:38px}
.ca-account-user{margin-right:auto;font-size:15px;font-weight:780;line-height:1.25}
.ca-account-row .ca-btn{align-self:center;margin-top:0;margin-bottom:0}
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
.leaderboard-winner-card .mock-roll-score-block{
  min-height:104px;
  padding:0 4px 8px!important;
  align-items:center!important;
  justify-content:center!important;
  text-align:center!important;
}
.leaderboard-winner-card .mock-roll-score-block .score{
  width:100%!important;
  font-size:clamp(66px,8vw,112px)!important;
  line-height:.94;
  margin:0!important;
  padding:0 4px 8px!important;
  text-align:center!important;
  transform:none!important;
}
.profile-best-wrap .mock-roll-percentile,
.leaderboard-row-card .mock-roll-percentile,
.roll-history-item .mock-roll-percentile{
  font-size:12px;line-height:1.15;margin-top:9px!important;padding-top:3px;
  min-height:18px;display:flex;align-items:center;
}
.mock-profile-link{
  max-width:100%;white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;
}
.leaderboard-row-user .mock-profile-link{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
}
.profile-first-discoveries-panel{
  width:100%;margin:24px 0 0;padding:18px 20px;
  border:1px solid rgba(255,255,255,.10);border-radius:11px;
  background:rgba(255,255,255,.035);
}
.profile-first-discoveries-title{
  margin:0 0 14px;color:#eef0f4;font-size:15px;font-weight:900;
  letter-spacing:.08em;text-transform:uppercase;
}
.profile-first-discoveries-list{
  display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;
}
.profile-first-discovery-item{
  display:inline-flex;align-items:center;gap:10px;min-width:0;
}
.profile-first-discovery-link{
  appearance:none;border:0;background:transparent;padding:0;
  font:800 16px/1.25 inherit;text-align:left;cursor:pointer;
  max-width:100%;white-space:normal;
}
.profile-first-discovery-separator{
  color:#737983;font-size:16px;font-weight:900;line-height:1;
}
.profile-first-discovery-link:hover,
.profile-first-discovery-link:focus-visible{
  text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;outline:none;
}
.profile-first-discoveries-empty{color:#858a94;font-size:13px;font-weight:700}
.chordle-roll-history-entry{
  width:100%;margin:24px 0 0;padding:16px 18px;border:1px solid rgba(255,255,255,.13);
  border-radius:11px;background:rgba(255,255,255,.045);color:#f2f3f6;
  font:850 14px/1.2 inherit;text-align:center;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease;
}
.chordle-roll-history-entry:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22);transform:translateY(-1px)}
.chordle-roll-history-page{
  display:none;width:min(980px,94vw);margin:0 auto;min-height:calc(100vh - 210px);padding:48px 0 90px;
}
html.chordle-roll-history-route .chordle-roll-history-page{display:block}
html.chordle-roll-history-route .piano-banner,
html.chordle-roll-history-route .game-camera,
html.chordle-roll-history-route .settings-page,
html.chordle-roll-history-route .badges-index-page,
html.chordle-roll-history-route .badge-detail-page,
html.chordle-roll-history-route .leaderboard-page,
html.chordle-roll-history-route .profile-page,
html.chordle-roll-history-route .admin-luck{display:none!important}
.roll-history-title{margin:0 0 38px;text-align:center;font-size:clamp(34px,6vw,52px);font-weight:900;letter-spacing:-.025em}
.roll-history-list{display:grid;gap:24px}
.roll-history-item{display:grid;gap:10px}
.roll-history-date{
  padding:0 3px;color:#aeb3bd;font-size:12px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;
}
.roll-history-item .mock-roll-card{width:100%}
.roll-history-item .mock-roll-score-block .score{font-size:clamp(48px,6vw,76px);line-height:.96}
.profile-like-control{
  display:flex;align-items:center;gap:5px;margin-left:10px;flex:0 0 auto;
}
.profile-like-control[hidden]{display:none!important}
.profile-like-heart{
  appearance:none;border:0;background:transparent;color:#a8adb6;padding:2px 3px;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;
  transition:color .14s ease,transform .14s ease,filter .14s ease;
}
.profile-like-heart svg{display:block;width:29px;height:27px;overflow:visible}
.profile-like-heart-shape{
  fill:transparent;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round;stroke-linecap:round;
  transition:fill .14s ease,stroke .14s ease;
}
.profile-like-heart:hover{color:#ff6978;transform:scale(1.06)}
.profile-like-heart.is-liked,
.profile-like-heart.is-count-display{color:#e53945;filter:drop-shadow(0 0 6px rgba(229,57,69,.24))}
.profile-like-heart.is-liked .profile-like-heart-shape,
.profile-like-heart.is-count-display .profile-like-heart-shape{fill:currentColor;stroke:currentColor}
.profile-like-heart:disabled{cursor:default;transform:none}
.profile-like-count{min-width:20px;color:#b7bbc3;font-size:14px;font-weight:850;line-height:1;font-variant-numeric:tabular-nums}
#homeLink{margin-right:0!important}
.chordle-discord-link{
  display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
  margin-left:4px!important;margin-right:auto!important;color:#aeb4c0;text-decoration:none!important;vertical-align:middle;flex:0 0 auto;
  opacity:.9;transition:color .14s ease,opacity .14s ease,transform .14s ease;
}
.chordle-discord-link:hover{color:#ffffff;opacity:1;transform:translateY(-1px)}
.chordle-discord-link svg{display:block;width:19px;height:19px}
.badge-detail-profile-link{border-bottom-color:transparent!important;text-decoration:none!important}
.badge-detail-profile-link:hover{border-bottom-color:currentColor!important;text-decoration:none!important}
.roll-detail-badge.badge.common:hover .roll-detail-badge-name,
.roll-detail-badge.badge.uncommon:hover .roll-detail-badge-name,
.roll-detail-badge.badge.rare:hover .roll-detail-badge-name,
.roll-detail-badge.badge.epic:hover .roll-detail-badge-name{
  text-decoration:underline!important;
  text-decoration-thickness:1px!important;
  text-underline-offset:3px!important;
}
.leaderboard-mini-piano .leaderboard-static-key{pointer-events:none}
.leaderboard-mini-piano .leaderboard-static-key.rolled{transform:translateY(-1px)}
.leaderboard-mini-piano .leaderboard-static-key.common{background:var(--common)}
.leaderboard-mini-piano .leaderboard-static-key.uncommon{background:var(--uncommon)}
.leaderboard-mini-piano .leaderboard-static-key.rare{background:var(--rare)}
.leaderboard-mini-piano .leaderboard-static-key.epic{background:var(--epic)}
.leaderboard-mini-piano .leaderboard-static-key.legendary{background:var(--legendary)}
.leaderboard-mini-piano .leaderboard-static-key.mythic{background:var(--mythic)}
.leaderboard-mini-piano .leaderboard-static-key.ultra{background:var(--ultra)}
.leaderboard-mini-piano .leaderboard-static-key.godly{background:var(--godly);box-shadow:0 0 22px rgba(255,255,255,.5)}
.leaderboard-mini-piano .white-key.leaderboard-static-key.godly{
  background:linear-gradient(180deg,#ffffff 0%,#f8f8f8 38%,#d7d9dd 72%,#aeb2b9 100%);
  border-color:#c7c9ce;
  box-shadow:0 0 22px rgba(255,255,255,.52),inset 0 -10px 15px rgba(70,74,82,.14);
}
.leaderboard-mini-piano .leaderboard-static-key.supreme{background:linear-gradient(180deg,#ff5454 0%,#ffd84d 22%,#62d58b 43%,#5ea7ff 64%,#aa79ff 82%,#ff72c6 100%)}
.leaderboard-mini-piano .leaderboard-static-key.omnipotent{background:#050505;border-color:#7f838a;box-shadow:0 0 18px rgba(255,255,255,.16)}
.leaderboard-mini-piano .black-key.leaderboard-static-key.omnipotent{
  background:linear-gradient(180deg,#5f6269 0%,#34363b 28%,#111216 68%,#030304 100%);
  border-color:#969aa2;
  box-shadow:0 7px 10px rgba(0,0,0,.42),0 0 18px rgba(255,255,255,.20),inset 0 1px 2px rgba(255,255,255,.20);
}
.leaderboard-mini-piano .leaderboard-static-key.eternal{background:linear-gradient(180deg,#d97932 0%,#17181b 52%,#f3f3f4 100%);border-color:#e6c5ad;box-shadow:0 0 16px rgba(217,121,50,.30),0 0 24px rgba(255,255,255,.18)}
.leaderboard-mini-piano .leaderboard-static-key.absolute{background:linear-gradient(180deg,#160b25 0%,#3b1268 38%,#0b0710 100%);border-color:#9a65db;box-shadow:0 0 22px rgba(136,62,214,.48),inset 0 0 12px rgba(255,255,255,.06)}
.roll-detail-actions{display:flex;align-items:center;gap:7px;margin-left:auto}
.roll-detail-replay{flex:0 0 auto;min-width:118px;padding:6px 10px;border-radius:7px;font-size:10px;font-weight:760}
.chordle-replay-panel{
  position:absolute;z-index:20;left:14px;top:12px;max-width:min(72vw,390px);
  padding:8px 12px;border:1px solid rgba(255,89,112,.9);border-radius:8px;
  background:rgba(156,18,39,.86);color:#fff;font-size:12px;font-weight:900;
  letter-spacing:.055em;text-transform:none;pointer-events:none;
  box-shadow:0 0 22px rgba(255,48,84,.38);
  animation:chordleReplayPanelPulse 1.25s ease-in-out infinite;
}
@keyframes chordleReplayPanelPulse{
  0%,100%{opacity:0}
  50%{opacity:1}
}
html.chordle-external-replay #revealBtn,
html.chordle-external-replay #rerollBtn,
html.chordle-external-replay #shareChordBtn{display:none!important}
html.chordle-external-replay #badges .badge-new-tag,
html.chordle-external-replay #badges .badge-first-discovery-tag{display:none!important}
html.chordle-external-replay #lifetimeScore,
html.chordle-external-replay #nextChord{display:none!important}
.leaderboard-row-card,
.leaderboard-row-card .mock-roll-card,
.leaderboard-row-card.mock-roll-card,
.chordle-tight-leaderboard-card{
  min-height:0!important;
  height:auto!important;
}
.leaderboard-row-card .mock-roll-card,
.leaderboard-row-card.mock-roll-card,
.chordle-tight-leaderboard-card{
  position:relative!important;
  padding-top:9px!important;
  padding-bottom:7px!important;
  grid-template-rows:auto!important;
  align-items:center!important;
}
.leaderboard-row-card .mock-roll-card > *,
.leaderboard-row-card.mock-roll-card > *,
.chordle-tight-leaderboard-card > *{
  min-height:0!important;
}
.leaderboard-row-card .mock-roll-percentile{
  margin-top:7px!important;
  padding-top:0!important;
  min-height:15px!important;
  line-height:1!important;
}
.leaderboard-row-card{
  grid-template-columns:minmax(0,1fr) minmax(330px,42%)!important;
}
.leaderboard-row-card .mock-roll-score-block,
.chordle-tight-leaderboard-card:not(.leaderboard-winner-card) .mock-roll-score-block{
  align-self:stretch!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:flex-end!important;
  justify-content:center!important;
  gap:4px!important;
  padding:0 1px 0 4px!important;
  margin:0!important;
  min-height:0!important;
  height:auto!important;
  text-align:right!important;
}
.leaderboard-roll-rarity{
  font-size:10px;
  line-height:1;
  font-weight:900;
  letter-spacing:.14em;
  text-transform:uppercase;
  white-space:nowrap;
}
.leaderboard-roll-rarity-corner{
  position:absolute!important;
  top:6px!important;
  right:6px!important;
  bottom:auto!important;
  left:auto!important;
  z-index:4;
  width:auto!important;
  margin:0!important;
  text-align:right!important;
  font-size:12px!important;
  letter-spacing:.15em!important;
}
.leaderboard-winner-meta-row{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:18px!important;
  width:100%!important;
  margin-top:7px!important;
}
.leaderboard-winner-meta-row .mock-roll-percentile{
  margin:0!important;
  padding:0!important;
  min-height:0!important;
  width:auto!important;
}
.leaderboard-winner-meta-row .leaderboard-roll-rarity{
  position:static!important;
  width:auto!important;
  margin:0!important;
  text-align:left!important;
}
.leaderboard-winner-card .leaderboard-roll-rarity{
  font-size:13px!important;
  letter-spacing:.15em!important;
}
.rarity-text-common{color:#d7d9de}
.rarity-text-uncommon{color:#62d58b}
.rarity-text-rare{color:#5ea7ff}
.rarity-text-epic{color:#aa79ff}
.rarity-text-legendary{color:#ffd84d}
.rarity-text-mythic{color:#ff4d63}
.rarity-text-ultra{color:#ff72c6}
.rarity-text-godly{
  background:linear-gradient(90deg,#ffffff,#bfc5cf,#ffffff);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.rarity-text-supreme{
  background:linear-gradient(90deg,#ff6464,#ffd84d,#62d58b,#5ea7ff,#aa79ff,#ff72c6);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.rarity-text-omnipotent{
  background:linear-gradient(90deg,#d9d9de,#737782,#e9e9ed);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.rarity-text-eternal{
  background:linear-gradient(90deg,#ff9d42,#ffd07b,#ff7a2f);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.rarity-text-absolute{
  background:linear-gradient(90deg,#d1a5ff,#8b5ac7,#f0d9ff);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.leaderboard-row-card .mock-roll-score-block .score,
.chordle-tight-leaderboard-card:not(.leaderboard-winner-card) .mock-roll-score-block .score{
  width:auto!important;
  max-width:100%!important;
  font-size:clamp(38px,4.5vw,58px);line-height:.92;
  margin:0 -2px 0 0!important;padding:0!important;
  text-align:right!important;
  transform:translateY(7px);
}
#scoreBox.chordle-standard-score-tier #score{
  position:relative!important;
  top:-4px!important;
}
.chordle-badge-sort-host{position:relative!important}
.chordle-badge-sort-control{
  position:absolute;top:10px;right:12px;z-index:8;
  display:flex;align-items:center;
  padding:0;border:0;border-radius:0;
  background:transparent;backdrop-filter:none;
  color:#aeb3bd;font-size:10px;font-weight:800;letter-spacing:.04em;
}
.chordle-badge-sort-control select{
  appearance:auto;border:1px solid rgba(255,255,255,.14);border-radius:6px;
  background:#202228;color:#e9ebef;padding:5px 7px;
  font:800 10px/1.1 inherit;cursor:pointer;outline:none;
}
.badge-index-entry.chordle-publicly-discovered{
  background:transparent!important;
}
.badge-index-entry.chordle-publicly-discovered .badge-index-row{
  position:relative!important;
  overflow:hidden!important;
  isolation:isolate;
  cursor:pointer!important;
  transition:filter .15s ease,box-shadow .15s ease,border-color .15s ease!important;
  background:linear-gradient(135deg,rgba(255,255,255,.035),rgba(255,255,255,.018))!important;
}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="uncommon"] .badge-index-row{background:linear-gradient(135deg,rgba(98,213,139,.16),rgba(25,28,30,.86) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="rare"] .badge-index-row{background:linear-gradient(135deg,rgba(94,167,255,.17),rgba(25,28,32,.86) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="epic"] .badge-index-row{background:linear-gradient(135deg,rgba(170,121,255,.18),rgba(27,25,32,.86) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="legendary"] .badge-index-row{background:linear-gradient(135deg,rgba(255,216,77,.17),rgba(31,29,23,.88) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="mythic"] .badge-index-row{background:linear-gradient(135deg,rgba(255,77,99,.17),rgba(31,24,26,.88) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="ultra"] .badge-index-row{background:linear-gradient(135deg,rgba(255,114,198,.17),rgba(31,24,30,.88) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="godly"] .badge-index-row{background:linear-gradient(135deg,rgba(235,237,241,.15),rgba(25,26,29,.90) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="supreme"] .badge-index-row{background:linear-gradient(135deg,rgba(255,84,84,.11),rgba(94,167,255,.09) 38%,rgba(170,121,255,.11) 68%,rgba(25,26,30,.88))!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="omnipotent"] .badge-index-row{background:linear-gradient(135deg,rgba(150,154,162,.13),rgba(5,5,7,.92) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="eternal"] .badge-index-row{background:linear-gradient(135deg,rgba(217,121,50,.18),rgba(27,25,23,.90) 72%)!important}
.badge-index-entry.chordle-publicly-discovered[data-chordle-rarity="absolute"] .badge-index-row{background:linear-gradient(135deg,rgba(154,101,219,.19),rgba(17,10,25,.92) 72%)!important}
.badge-index-entry.chordle-publicly-discovered .badge-index-row:hover,
.badge-index-entry.chordle-publicly-discovered .badge-index-row:focus-within{
  filter:brightness(1.10);
  border-color:rgba(255,255,255,.18)!important;
  box-shadow:inset 0 0 18px rgba(255,255,255,.025)!important;
}
.badge-index-entry.chordle-publicly-discovered .badge-index-row:hover .badge-index-row-name,
.badge-index-entry.chordle-publicly-discovered .badge-index-row:hover .badge-name,
.badge-index-entry.chordle-publicly-discovered .badge-index-row:hover > :first-child,
.badge-index-entry.chordle-publicly-discovered .badge-index-row:focus-within .badge-index-row-name,
.badge-index-entry.chordle-publicly-discovered .badge-index-row:focus-within .badge-name,
.badge-index-entry.chordle-publicly-discovered .badge-index-row:focus-within > :first-child{
  color:#d9dde5!important;
  opacity:1!important;
  text-shadow:0 0 8px rgba(255,255,255,.28);
}
@media(max-width:760px){
  .chordle-badge-sort-control{position:relative;top:auto;right:auto;width:max-content;margin:8px 10px 12px auto}
}
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
.chordle-update-card+.chordle-update-card{margin-top:14px}
.chordle-update-title{margin:0 0 10px;color:#eef0f4;font-size:19px;font-weight:850}
.chordle-update-body{margin:0!important;color:#b9bdc5}
.chordle-update-list{margin:0;padding-left:22px;color:#b9bdc5}
.chordle-update-list li{margin:7px 0;line-height:1.55}
.ca-save-overlay{background:rgba(0,0,0,.52);backdrop-filter:blur(5px)}
.ca-save-overlay .ca-modal{position:relative;width:min(450px,100%);text-align:center;border-radius:14px}
.ca-save-overlay .ca-modal h2{margin:6px 34px 7px;text-align:center;font-size:27px}
.ca-save-overlay .ca-sub{max-width:340px;margin-left:auto;margin-right:auto}
.ca-save-overlay .ca-x{position:absolute;top:9px;right:10px;float:none;width:26px;height:26px;padding:0;font-size:17px;line-height:24px;text-align:center}
.ca-save-choice{display:flex;gap:10px;margin-top:20px}
.ca-save-choice .ca-btn{flex:1;padding:12px}
#profileNavBtn.chordle-profile-login-pulse{
  position:relative;
  border-radius:8px;
  animation:chordleProfileLoginPulse 1.55s ease-in-out infinite;
}
@keyframes chordleProfileLoginPulse{
  0%,100%{transform:scale(1);box-shadow:0 0 0 1px rgba(210,216,228,.28),0 0 5px rgba(220,225,238,.10)}
  50%{transform:scale(1.06);box-shadow:0 0 0 2px rgba(226,231,242,.78),0 0 16px rgba(220,225,238,.36)}
}
#chordle-profile-auth-slot [data-ca="signup"].chordle-create-account-pulse{
  animation:chordleCreateAccountPulse 1.35s ease-in-out infinite;
}
#shareChordBtn{min-width:72px}
.chordle-copy-toast{
  position:fixed;
  z-index:2147483642;
  top:46px;
  left:50%;
  transform:translate(-50%,-8px);
  padding:7px 12px;
  border:1px solid rgba(255,255,255,.13);
  border-radius:8px;
  background:rgba(18,19,22,.94);
  color:#eef0f4;
  font-size:11px;
  font-weight:760;
  letter-spacing:.02em;
  box-shadow:0 8px 28px rgba(0,0,0,.28);
  opacity:0;
  pointer-events:none;
  transition:opacity .18s ease,transform .18s ease;
}
.chordle-copy-toast.show{opacity:1;transform:translate(-50%,0)}
.badge-first-discovery-tag{
  display:inline-flex;align-items:center;justify-content:center;height:21px;padding:0 7px;
  border:1px solid rgba(255,92,126,.90);border-radius:6px;
  background:linear-gradient(135deg,rgba(216,38,76,.24),rgba(255,94,183,.22));
  color:#ff9cbc;font-size:9px;line-height:1;font-weight:900;letter-spacing:.075em;
  text-transform:uppercase;box-shadow:0 0 8px rgba(255,66,125,.20),inset 0 0 7px rgba(255,255,255,.04);
  animation:firstDiscoveryPulse 1.35s ease-in-out infinite;
}
@keyframes firstDiscoveryPulse{
  0%,100%{color:#ff9aad;border-color:rgba(255,75,101,.76);box-shadow:0 0 6px rgba(255,54,86,.14);filter:brightness(.97)}
  50%{color:#ffd0e5;border-color:rgba(255,126,202,1);box-shadow:0 0 14px rgba(255,73,164,.42);filter:brightness(1.18)}
}
@keyframes chordleCreateAccountPulse{
  0%,100%{transform:scale(1);box-shadow:0 0 0 1px rgba(255,255,255,.16),0 0 5px rgba(255,255,255,.08)}
  50%{transform:scale(1.045);box-shadow:0 0 0 2px rgba(255,255,255,.80),0 0 18px rgba(255,255,255,.30)}
}
@media(max-width:620px){
  .ca-server-row{grid-template-columns:40px minmax(0,1fr) 105px}.ca-server-value{font-size:12px}
  .leaderboard-winner-card .mock-roll-score-block .score{font-size:clamp(50px,14vw,82px)}
}
`;
document.head.appendChild(style);

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function localDayKey(d=new Date()){
  const parts={};
  for(const part of new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d)){
    if(part.type!=="literal")parts[part.type]=part.value;
  }
  return parts.year+"-"+parts.month+"-"+parts.day;
}
function pacificDisplayDate(d=new Date()){
  return d.toLocaleDateString(undefined,{timeZone:"America/Los_Angeles",weekday:"long",year:"numeric",month:"long",day:"numeric"});
}

const PACIFIC_RESET_CLOCK_FORMATTER=new Intl.DateTimeFormat("en-US",{
  timeZone:"America/Los_Angeles",
  year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",second:"2-digit",
  hourCycle:"h23"
});
let cachedPacificResetDay="";
let cachedPacificResetAt=0;

function pacificClockParts(d=new Date()){
  const parts={};
  for(const part of PACIFIC_RESET_CLOCK_FORMATTER.formatToParts(d)){
    if(part.type!=="literal")parts[part.type]=part.value;
  }
  return parts;
}

function nextPacificMidnightMs(now=new Date()){
  const day=localDayKey(now);
  if(cachedPacificResetDay===day&&cachedPacificResetAt>now.getTime())return cachedPacificResetAt;

  const [year,month,date]=day.split("-").map(Number);
  const tomorrow=new Date(Date.UTC(year,month-1,date+1,12,0,0));
  const targetYear=tomorrow.getUTCFullYear();
  const targetMonth=tomorrow.getUTCMonth()+1;
  const targetDate=tomorrow.getUTCDate();

  for(let utcHour=6;utcHour<=10;utcHour++){
    const candidate=new Date(Date.UTC(targetYear,targetMonth-1,targetDate,utcHour,0,0));
    const parts=pacificClockParts(candidate);
    if(Number(parts.year)===targetYear&&Number(parts.month)===targetMonth&&Number(parts.day)===targetDate&&Number(parts.hour)===0&&Number(parts.minute)===0){
      cachedPacificResetDay=day;
      cachedPacificResetAt=candidate.getTime();
      return cachedPacificResetAt;
    }
  }

  cachedPacificResetDay=day;
  cachedPacificResetAt=Date.UTC(targetYear,targetMonth-1,targetDate,8,0,0);
  return cachedPacificResetAt;
}

function syncGlobalResetCountdown(){
  const el=document.getElementById("nextChord");
  if(!el||!el.classList.contains("visible")||state.externalReplay)return;

  const remaining=Math.max(0,Math.ceil((nextPacificMidnightMs()-Date.now())/1000));
  const hours=Math.floor(remaining/3600);
  const minutes=Math.floor((remaining%3600)/60);
  const seconds=remaining%60;
  el.textContent="Next chord in "+String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
}
function noteName(n){return `${NOTE_NAMES_FLAT[((Number(n)%12)+12)%12]}${2+Math.floor(Number(n)/12)}`;}
function formatScore(v){const n=Number(v||0);return Number.isFinite(n)?Math.round(n).toLocaleString():"0";}
function username(user=state.session?.user){return state.profile?.username||user?.user_metadata?.username||user?.email?.split("@")[0]||"Player";}
function color(v){return typeof v==="string"&&CSS.supports("color",v)?v:"";}
function joined(v){if(!v)return "Joined —";const d=new Date(v);return Number.isNaN(d.getTime())?"Joined —":"Joined "+d.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});}
function readJson(key){try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function numericText(el){const n=Number(String(el?.textContent||"").replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:0;}

function rarityEmoji(rarity){
  return RARITY_EMOJI[String(rarity||'common').toLowerCase()]||"⬜";
}

function rarityAtLeast(rarity,minimum){
  return RARITY_ORDER.indexOf(String(rarity||'common').toLowerCase())>=RARITY_ORDER.indexOf(minimum);
}

function chordleHeartSvg(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="profile-like-heart-shape" d="M12 21.15C10.58 19.9 3.36 14.14 2.28 9.53C1.39 5.72 3.86 2.42 7.62 2.42C9.55 2.42 11.17 3.38 12 4.72C12.83 3.38 14.45 2.42 16.38 2.42C20.14 2.42 22.61 5.72 21.72 9.53C20.64 14.14 13.42 19.9 12 21.15Z"/></svg>';
}

function installChordleFavicon(){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="14" fill="#111217" stroke="#f3f4f6" stroke-width="3"/><path d="M45 18A19 19 0 1 0 45 46" fill="none" stroke="#f5f6f8" stroke-width="8" stroke-linecap="round"/></svg>';
  let link=document.querySelector('link[data-chordle-favicon]');
  if(!link){
    link=document.createElement('link');
    link.rel='icon';
    link.type='image/svg+xml';
    link.dataset.chordleFavicon='true';
    document.head.appendChild(link);
  }
  link.href='data:image/svg+xml,'+encodeURIComponent(svg);
}

function discordLogoSvg(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.7 5.2A16.2 16.2 0 0 0 15 4.1l-.5 1a13.9 13.9 0 0 0-5 0l-.5-1a16 16 0 0 0-3.7 1.1C2.9 8.8 2.2 12.3 2.5 15.8a15 15 0 0 0 4.6 2.3l1.1-1.5a9.8 9.8 0 0 1-1.7-.8l.4-.3c3.3 1.5 6.8 1.5 10.1 0l.5.3c-.6.3-1.2.6-1.8.8l1.1 1.5a15 15 0 0 0 4.6-2.3c.4-4.1-.7-7.6-2.7-10.6ZM9.1 14.2c-1 0-1.8-.9-1.8-2s.8-2 1.8-2c1 0 1.8.9 1.8 2s-.8 2-1.8 2Zm5.8 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2c1 0 1.8.9 1.8 2s-.8 2-1.8 2Z"/></svg>';
}

function mountDiscordLink(attempt=0){
  if(document.getElementById('chordleDiscordLink'))return;
  const home=document.getElementById('homeLink');
  let target=(home&&/chordle/i.test(String(home.textContent||'')))?home:null;

  if(!target){
    const candidates=[...document.querySelectorAll('a,button,span,div,h1,h2')];
    target=candidates.find(el=>{
      if(el.id==='chordleDiscordLink')return false;
      const ownText=[...el.childNodes]
        .filter(node=>node.nodeType===Node.TEXT_NODE)
        .map(node=>String(node.textContent||''))
        .join(' ')
        .replace(/\s+/g,' ')
        .trim();
      return /^CHORDLE\s*\[BETA\]$/i.test(ownText);
    })||null;
  }

  if(!target&&home)target=home;
  if(!target){
    if(attempt<8)setTimeout(()=>mountDiscordLink(attempt+1),250);
    return;
  }

  const link=document.createElement('a');
  link.id='chordleDiscordLink';
  link.className='chordle-discord-link';
  link.href=CHORDLE_DISCORD_URL;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.title='Join the Chordle Discord';
  link.setAttribute('aria-label','Join the Chordle Discord');
  link.innerHTML=discordLogoSvg();
  target.insertAdjacentElement('afterend',link);
}

function showCopyToast(message="Chord copied to clipboard"){
  let toast=document.getElementById('chordleCopyToast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='chordleCopyToast';
    toast.className='chordle-copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent=message;
  toast.classList.remove('show');
  requestAnimationFrame(()=>toast.classList.add('show'));
  clearTimeout(showCopyToast.timer);
  showCopyToast.timer=setTimeout(()=>toast.classList.remove('show'),1700);
}

async function copyPlainText(text){
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return;
  }
  const area=document.createElement('textarea');
  area.value=text;
  area.setAttribute('readonly','');
  area.style.position='fixed';
  area.style.opacity='0';
  document.body.appendChild(area);
  area.select();
  const ok=document.execCommand('copy');
  area.remove();
  if(!ok)throw new Error('Clipboard copy failed');
}

function currentShareText(){
  if(state.externalReplay)return '';
  const next=document.getElementById('nextChord');
  const notes=currentDailyNotes();

  const day=localDayKey();
  const pending=readJson(PENDING_ANON_ROLL_KEY);
  const canonical=notes?canonicalRollAnalysis(notes):null;
  const savedScore=state.todayRoll?.roll_day===day?Number(state.todayRoll.score):0;
  const pendingScore=pending?.roll_day===day?Number(pending.score):0;
  const canonicalScore=Number(canonical?.score)||0;
  const renderedScore=numericText(document.getElementById('score'));
  const score=Math.max(0,Math.round(savedScore||pendingScore||canonicalScore||renderedScore));

  if(!next?.classList.contains('visible')||!notes||score<=0)return '';

  const chordName=String(document.getElementById('chordName')?.textContent||'Chord').trim()||'Chord';
  const rarity=String(currentRarityId()||'common').toLowerCase();
  const rarityLabel=String(document.getElementById('scoreRarity')?.textContent||titleCaseRarity(rarity)).trim()||titleCaseRarity(rarity);
  const percentile=String(document.getElementById('scorePercentile')?.textContent||'').trim();
  const badges=badgeObjectsForNotes(notes)
    .filter(b=>b&&b.name)
    .sort((a,b)=>(Number(b.points)||0)-(Number(a.points)||0))
    .slice(0,5);

  const rarityPrefix=rarityAtLeast(rarity,'legendary')?'## ':'';
  const lines=[
    `**${chordName}**`,
    `**${[...notes].sort((a,b)=>a-b).map(noteName).join(' - ')}**`,
    `${rarityPrefix}**${rarityEmoji(rarity)} ${rarityLabel}**`
  ];
  if(percentile)lines.push(`**${percentile}**`);
  lines.push(`**${score.toLocaleString()}** Score`,'');
  badges.forEach(badge=>{
    const prefix=rarityAtLeast(badge.rarity,'legendary')?'## ':'';
    lines.push(`${prefix}**${rarityEmoji(badge.rarity)} ${badge.name}**`);
  });
  lines.push('', 'https://chordle.org/');
  return lines.join('\n');
}

function ensureNewTag(card,show){
  const line=card?.querySelector?.('.badge-name-line');
  if(!line)return;
  let tag=line.querySelector('.badge-new-tag');
  if(!show){tag?.remove();return;}
  if(!tag){
    tag=document.createElement('span');
    tag.className='badge-new-tag';
    tag.textContent='New';
    const first=line.querySelector('.badge-first-discovery-tag');
    if(first)line.insertBefore(tag,first);
    else line.appendChild(tag);
  }
}

function ensureFirstDiscoveryTag(card,show){
  const line=card?.querySelector?.('.badge-name-line');
  if(!line)return;
  let tag=line.querySelector('.badge-first-discovery-tag');
  if(!show){
    tag?.remove();
    card.removeAttribute('data-first-discovery');
    return;
  }
  if(!tag){
    tag=document.createElement('span');
    tag.className='badge-first-discovery-tag';
    tag.textContent='First discovery';
    line.appendChild(tag);
  }
  card.dataset.firstDiscovery='true';
}

function applyCachedDiscoveryTags(){
  const cards=[...document.querySelectorAll('#badges .badge[data-badge-key]')];
  if(!cards.length)return;

  if(state.externalReplay){
    for(const card of cards){
      ensureNewTag(card,false);
      ensureFirstDiscoveryTag(card,false);
    }
    return;
  }

  for(const card of cards){
    const key=String(card.dataset.badgeKey||'');
    const nativeNew=!!card.querySelector('.badge-new-tag');
    ensureNewTag(card,state.todayNewBadgeKeys.has(key)||nativeNew);
    ensureFirstDiscoveryTag(card,state.firstDiscoveryKeys.has(key));
  }
}

function discoveredOnCurrentLocalDay(value){
  if(!value)return false;
  const d=new Date(value);
  return !Number.isNaN(d.getTime())&&localDayKey(d)===state.dayKey;
}

let firstDiscoveryTimer=0;
async function syncFirstDiscoveryTags({allowProvisional=true,all=false}={}){
  const cards=[...document.querySelectorAll('#badges .badge[data-badge-key]')];
  if(!cards.length)return;

  if(state.externalReplay){
    for(const card of cards){
      ensureNewTag(card,false);
      ensureFirstDiscoveryTag(card,false);
    }
    return;
  }

  const uid=state.session?.user?.id;
  if(!uid)return;
  const candidates=all
    ? cards
    : cards.filter(card=>card.querySelector('.badge-new-tag')||card.dataset.firstDiscovery==='true');
  if(!candidates.length)return;

  const keys=[...new Set(candidates.map(card=>String(card.dataset.badgeKey||'')).filter(Boolean))];
  if(!keys.length)return;

  const {data:owned,error:ownedError}=await supabase.from('chordle_user_badges')
    .select('user_id,badge_key,discovered_at')
    .eq('user_id',uid)
    .in('badge_key',keys);
  if(ownedError){
    console.warn('Chordle daily badge check:',ownedError.message);
    return;
  }

  const ownedByKey=new Map((owned||[]).map(row=>[String(row.badge_key),row]));
  const keysNeedingFirstCheck=new Set();

  for(const card of candidates){
    const key=String(card.dataset.badgeKey||'');
    const row=ownedByKey.get(key);
    const nativeNew=!!card.querySelector('.badge-new-tag');
    const isNewToday=!!row&&discoveredOnCurrentLocalDay(row.discovered_at);
    const provisional=allowProvisional&&!row&&nativeNew;

    ensureNewTag(card,isNewToday||provisional);
    if(isNewToday){
      state.todayNewBadgeKeys.add(key);
      keysNeedingFirstCheck.add(key);
    }else if(provisional){
      keysNeedingFirstCheck.add(key);
    }else{
      state.todayNewBadgeKeys.delete(key);
      state.firstDiscoveryKeys.delete(key);
      ensureFirstDiscoveryTag(card,false);
    }
  }

  if(!keysNeedingFirstCheck.size)return;
  const firstKeys=[...keysNeedingFirstCheck];
  const {data:owners,error:firstError}=await supabase.from('chordle_user_badges')
    .select('user_id,badge_key,discovered_at')
    .in('badge_key',firstKeys)
    .order('discovered_at',{ascending:true});
  if(firstError){
    console.warn('Chordle first discovery check:',firstError.message);
    return;
  }

  const firstByKey=new Map();
  for(const row of (owners||[])){
    const key=String(row.badge_key||'');
    if(key&&!firstByKey.has(key))firstByKey.set(key,row);
  }

  for(const card of candidates){
    const key=String(card.dataset.badgeKey||'');
    if(!keysNeedingFirstCheck.has(key))continue;
    const first=firstByKey.get(key);
    const provisional=allowProvisional&&!first&&!!card.querySelector('.badge-new-tag');
    const confirmed=first?.user_id===uid;
    if(confirmed)state.firstDiscoveryKeys.add(key);
    else if(first)state.firstDiscoveryKeys.delete(key);
    ensureFirstDiscoveryTag(card,confirmed||provisional);
  }
}

function scheduleFirstDiscoverySync(options={}){
  clearTimeout(firstDiscoveryTimer);
  firstDiscoveryTimer=setTimeout(()=>void syncFirstDiscoveryTags(options),90);
}

function wireFirstDiscoveryBadges(){
  const badges=document.getElementById('badges');
  if(!badges)return;
  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.addedNodes.length)){
      applyCachedDiscoveryTags();
      scheduleFirstDiscoverySync({allowProvisional:true,all:false});
    }
  });
  observer.observe(badges,{childList:true,subtree:true});
  scheduleFirstDiscoverySync({allowProvisional:false,all:true});
}

function syncShareButton(){
  const btn=document.getElementById('shareChordBtn');
  if(!btn)return;
  btn.disabled=!currentShareText();
}

function mountShareButton(){
  const audio=document.getElementById('audioBtn');
  if(!audio?.parentElement)return null;
  let btn=document.getElementById('shareChordBtn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='shareChordBtn';
    btn.type='button';
    btn.textContent='Share';
    btn.disabled=true;
    audio.insertAdjacentElement('afterend',btn);
    btn.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopPropagation();
      const text=currentShareText();
      if(!text)return;
      try{
        await copyPlainText(text);
        showCopyToast('Chord copied to clipboard');
      }catch(error){
        console.warn('Chordle share copy:',error);
        showCopyToast('Could not copy chord');
      }
    });
  }
  syncShareButton();
  return btn;
}

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
  a.title=profile?.username||'Player';
  applyNameColor(a,profile?.name_color,profile?.id);
  requestAnimationFrame(()=>fitProfileName(a));
  return a;
}

function fitProfileName(el){
  if(!el||!el.isConnected||el.clientWidth<=0)return;
  el.style.removeProperty('font-size');
  const base=parseFloat(getComputedStyle(el).fontSize)||16;
  const minSize=el.closest('.leaderboard-row-user')?8:10.5;
  let size=base;
  while(el.scrollWidth>el.clientWidth&&size>minSize){
    size-=0.5;
    el.style.fontSize=size.toFixed(1)+'px';
  }
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
  const canonical=canonicalRollAnalysis(notes);
  const badges=canonical?.badges||badgeObjectsForNotes(notes);
  const total=Math.max(0,Math.round(Number(roll.score)||canonical?.score||0));
  const tier=nativeApp()?.scoreTier?.(total);
  return {
    notes,badges,score:total,
    rarity:String(roll.rarity||canonical?.rarity||tier?.id||'common').toLowerCase(),
    rarityLabel:tier?.label||titleCaseRarity(roll.rarity||canonical?.rarity),
    chordName:validChordName(roll.chord_name)?String(roll.chord_name).trim():(canonical?.chordName||'Chord'),
    chordDetail:validChordDetail(roll.chord_detail)?String(roll.chord_detail).trim():(canonical?.chordDetail||'')
  };
}
function patchRenderedProfileLink(root,profile){
  const a=root?.querySelector?.('.mock-profile-link');
  if(!a||!profile)return;
  a.href=profileHref(profile);
  a.textContent=profile.username||'Player';
  a.title=profile.username||'Player';
  applyNameColor(a,profile.name_color,profile.id);
  requestAnimationFrame(()=>fitProfileName(a));
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
  void fetchProfileTarget(username).then(profile=>{
    if(!profile)return;
    a.href=profileHref(profile);
    applyNameColor(a,profile.name_color,profile.id);
  }).catch(()=>{});
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
  const beta02=document.createElement('section');
  beta02.className='chordle-update-card';

  const beta02Title=document.createElement('h2');
  beta02Title.className='chordle-update-title';
  beta02Title.textContent='Beta 0.2 - October 3, 2026';

  const beta02List=document.createElement('ul');
  beta02List.className='chordle-update-list';
  [
    'Account and roll data are now saved server-side instead of depending on the browser',
    'Added share button',
    'Added chord replay feature',
    'Added chord roll history',
    'Added like button on profiles',
    'Added first discovery list on profiles',
    'Added New and First Discovery boxes on badges',
    'Added badge index sorting',
    'Globally synced daily resets for all players',
    'Many, many, many, many leaderboard chord panel adjustments',
    'Uncountable bug fixes and visual adjustments'
  ].forEach(text=>{
    const item=document.createElement('li');
    item.textContent=text;
    beta02List.appendChild(item);
  });

  beta02.append(beta02Title,beta02List);

  const beta01=document.createElement('section');
  beta01.className='chordle-update-card';
  const beta01Title=document.createElement('h2');
  beta01Title.className='chordle-update-title';
  beta01Title.textContent='Beta 0.1 - October 2, 2026';
  const beta01Body=document.createElement('p');
  beta01Body.className='chordle-update-body';
  beta01Body.textContent='The beta version of the game is officially public';
  beta01.append(beta01Title,beta01Body);

  copy.append(beta02,beta01);
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
  if(state.session?.user)return;
  document.getElementById('profileNavBtn')?.classList.add('chordle-profile-login-pulse');
}

function clearProfileLoginHighlight(){
  const nav=document.getElementById('profileNavBtn');
  if(!nav)return;
  nav.classList.toggle('chordle-profile-login-pulse',!state.session?.user);
}

function syncAnonymousAccountAttention(){
  const anonymous=!state.session?.user;
  document.getElementById('profileNavBtn')?.classList.toggle('chordle-profile-login-pulse',anonymous);
  const signup=document.querySelector('#chordle-profile-auth-slot [data-ca="signup"]');
  if(signup)signup.classList.toggle('chordle-create-account-pulse',anonymous&&location.hash.startsWith('#profile'));
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
  if(!uid){
    state.todayNewBadgeKeys=new Set();
    state.firstDiscoveryKeys=new Set();
    return [];
  }

  const owned=await getOwnedBadges(uid);
  const keys=owned.map(b=>String(b.badge_key));
  state.todayNewBadgeKeys=new Set(
    owned
      .filter(row=>discoveredOnCurrentLocalDay(row.discovered_at))
      .map(row=>String(row.badge_key))
  );
  state.firstDiscoveryKeys=new Set();

  if(state.todayNewBadgeKeys.size){
    const todayKeys=[...state.todayNewBadgeKeys];
    const {data:owners,error}=await supabase.from('chordle_user_badges')
      .select('user_id,badge_key,discovered_at')
      .in('badge_key',todayKeys)
      .order('discovered_at',{ascending:true});
    if(!error){
      const firstByKey=new Map();
      for(const row of (owners||[])){
        const key=String(row.badge_key||'');
        if(key&&!firstByKey.has(key))firstByKey.set(key,row);
      }
      for(const key of todayKeys){
        if(firstByKey.get(key)?.user_id===uid)state.firstDiscoveryKeys.add(key);
      }
    }
  }

  try{localStorage.setItem(SEEN_BADGES_KEY,JSON.stringify(keys));}catch{}
  nativeApp()?.setOwnedBadgeKeys?.(keys);
  applyCachedDiscoveryTags();
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

function validChordName(value){
  const text=String(value||'').trim();
  return !!text && !['—','-','Chord','Generating six notes…','Your chord is ready to generate'].includes(text);
}

function validChordDetail(value){
  const text=String(value||'').trim();
  return !!text && !['—','-','Generating six notes…','Your chord is ready to generate'].includes(text);
}

function canonicalRollAnalysis(notes){
  if(!Array.isArray(notes)||notes.length!==6)return null;
  const sim=window.__CHORDLE_SIM__;
  if(sim?.evaluateRoll){
    try{
      const evaluated=sim.evaluateRoll(notes.map(Number));
      if(evaluated&&Array.isArray(evaluated.badges)&&Number(evaluated.score)>0){
        return {
          badges:evaluated.badges,
          score:Math.round(Number(evaluated.score)),
          rarity:String(evaluated.rarity||'common').toLowerCase(),
          chordName:validChordName(evaluated.chordName)?String(evaluated.chordName).trim():null,
          chordDetail:validChordDetail(evaluated.chordDetail)?String(evaluated.chordDetail).trim():null
        };
      }
    }catch(error){
      console.warn('Chordle canonical roll evaluation:',error);
    }
  }

  const badges=badgeObjectsForNotes(notes);
  if(!badges.length)return null;
  const rawScore=badges.reduce((sum,badge)=>sum+Math.max(0,Number(badge?.points)||0),0);
  const score=Math.round(rawScore);
  if(!Number.isFinite(score)||score<=0)return null;
  const tier=sim?.scoreTier?.(score)||nativeApp()?.scoreTier?.(score);
  let identity=null;
  try{identity=sim?.identifyChord?.(notes.map(Number))||null;}catch{}
  return {
    badges,
    score,
    rarity:String(tier?.id||'common').toLowerCase(),
    chordName:validChordName(identity?.name)?String(identity.name).trim():null,
    chordDetail:validChordDetail(identity?.detail)?String(identity.detail).trim():null
  };
}

function markAnonymousRollStarted(){
  if(state.session?.user||state.externalReplay)return;
  writeJson(ANON_ROLL_BROWSER_KEY,{roll_day:localDayKey(),started_at:Date.now()});
}

function clearAnonymousRollClaim(){
  try{localStorage.removeItem(PENDING_ANON_ROLL_KEY);}catch{}
  try{localStorage.removeItem(ANON_ROLL_BROWSER_KEY);}catch{}
}

function captureAnonymousRoll({requireComplete=true}={}){
  if(state.session?.user)return null;
  const previous=readJson(PENDING_ANON_ROLL_KEY);
  const marker=readJson(ANON_ROLL_BROWSER_KEY);
  const today=localDayKey();
  const eligible=previous?.roll_day===today||marker?.roll_day===today;
  if(!eligible)return null;

  const notes=currentDailyNotes();
  const analysis=canonicalRollAnalysis(notes);
  const next=document.getElementById('nextChord');
  const complete=!!next?.classList.contains('visible');
  if(!notes||!analysis||(requireComplete&&!complete))return null;

  const pending={
    roll_day:localDayKey(),
    notes,
    score:analysis.score,
    chord_name:analysis.chordName||previous?.chord_name||null,
    chord_detail:analysis.chordDetail||previous?.chord_detail||null,
    rarity:analysis.rarity,
    badges:analysis.badges.map(b=>({
      key:String(b.key||b.name||'unknown'),
      name:String(b.name||'Badge'),
      desc:String(nativeApp()?.badgeDescription?.(b)||b.desc||''),
      rarity:String(b.rarity||'common').toLowerCase(),
      points:Math.max(0,Math.round(Number(b.points)||0)),
      special:!!b.special
    })),
    complete:complete||previous?.complete===true,
    captured_at:Date.now()
  };
  writeJson(PENDING_ANON_ROLL_KEY,pending);
  return pending;
}

async function persistPendingAnonymousRoll(){
  if(!state.session?.user)return null;
  const pending=readJson(PENDING_ANON_ROLL_KEY);
  if(!pending)return null;
  if(pending.roll_day!==localDayKey()){
    clearAnonymousRollClaim();
    return null;
  }

  const notes=Array.isArray(pending.notes)?pending.notes.map(Number):[];
  if(notes.length!==6||!notes.every(n=>Number.isInteger(n)&&n>=0&&n<=36))return null;
  const analysis=canonicalRollAnalysis(notes);
  if(!analysis)return null;

  let roll=await getTodayRoll();
  if(roll){
    const sameNotes=Array.isArray(roll.notes)&&roll.notes.length===6&&
      roll.notes.map(Number).every((note,index)=>note===notes[index]);
    if(!sameNotes){
      clearAnonymousRollClaim();
      return roll;
    }
  }else{
    const payload={
      user_id:state.session.user.id,
      roll_day:pending.roll_day,
      notes,
      score:analysis.score,
      chord_name:analysis.chordName||pending.chord_name||null,
      chord_detail:analysis.chordDetail||pending.chord_detail||null,
      rarity:analysis.rarity
    };
    const {data,error}=await supabase.from('chordle_rolls').insert(payload).select('*').single();
    if(error){
      roll=await getTodayRoll();
      if(!roll)throw error;
      const sameNotes=Array.isArray(roll.notes)&&roll.notes.length===6&&
        roll.notes.map(Number).every((note,index)=>note===notes[index]);
      if(!sameNotes){
        clearAnonymousRollClaim();
        return roll;
      }
    }else{
      roll=data;
    }
  }

  const badges=analysis.badges;
  if(roll&&badges.length){
    const existing=await getRollBadges(roll.id);
    const existingKeys=new Set(existing.map(b=>String(b.badge_key)));
    const rows=badges.filter(b=>!existingKeys.has(String(b.key||b.name||'unknown'))).map(b=>({
      roll_id:roll.id,
      user_id:state.session.user.id,
      badge_key:String(b.key||b.name||'unknown'),
      badge_name:String(b.name||'Badge'),
      badge_description:String(nativeApp()?.badgeDescription?.(b)||b.desc||''),
      rarity:String(b.rarity||'common').toLowerCase(),
      points:Math.max(0,Math.round(Number(b.points)||0)),
      special:!!b.special
    }));
    if(rows.length){
      const {error}=await supabase.from('chordle_roll_badges').insert(rows);
      if(error)throw error;
    }
  }

  clearAnonymousRollClaim();
  await syncFirstDiscoveryTags({allowProvisional:false,all:true});
  return roll||null;
}

async function persistCompletedRoll(){
  if(state.externalReplay||state.restoring||state.persisting||!state.session?.user)return;
  const next=document.getElementById('nextChord');
  if(!next?.classList.contains('visible'))return;
  const notes=currentDailyNotes();
  if(!notes)return;
  const analysis=canonicalRollAnalysis(notes);
  if(!analysis)return;

  state.persisting=true;
  try{
    let roll=await getTodayRoll();
    if(!roll){
      const payload={
        user_id:state.session.user.id,
        roll_day:localDayKey(),
        notes,
        score:analysis.score,
        chord_name:analysis.chordName||String(document.getElementById('chordName')?.textContent||'').trim()||null,
        chord_detail:analysis.chordDetail||String(document.getElementById('chordDetail')?.textContent||'').trim()||null,
        rarity:analysis.rarity
      };
      const {data,error}=await supabase.from('chordle_rolls').insert(payload).select('*').single();
      if(error){
        roll=await getTodayRoll();
        if(!roll)throw error;
      }else roll=data;
    }

    const badges=analysis.badges;
    if(roll&&badges.length){
      const existing=await getRollBadges(roll.id);
      const existingKeys=new Set(existing.map(b=>String(b.badge_key)));
      const rows=badges.filter(b=>!existingKeys.has(String(b.key||b.name||'unknown'))).map(b=>({
        roll_id:roll.id,
        user_id:state.session.user.id,
        badge_key:String(b.key||b.name||'unknown'),
        badge_name:String(b.name||'Badge'),
        badge_description:String(nativeApp()?.badgeDescription?.(b)||b.desc||''),
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
    clearAnonymousRollClaim();
    await loadProfile(state.session.user,2);
    await syncOwnedBadgesToLocal();
    await syncFirstDiscoveryTags({allowProvisional:false,all:true});
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
    setTimeout(syncShareButton,0);
    setTimeout(()=>void syncFirstDiscoveryTags({allowProvisional:false,all:true}),120);
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
    slot.querySelector('[data-ca="signup"]').onclick=()=>showSignup();
    slot.querySelector('[data-ca="login"]').onclick=()=>showLogin();
  }else{
    slot.innerHTML='<div class="ca-account-title">Chordle Account</div><div class="ca-account-row"><div class="ca-account-user">Logged in as '+esc(username())+'</div><button class="ca-btn" data-ca="logout">Log Out</button></div>';
    slot.querySelector('[data-ca="logout"]').onclick=()=>logout();
  }
  syncAnonymousAccountAttention();
}

function renderBestRoll(best,targetProfile=null){
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
    addReplayRollButton(card,summary,targetProfile||{id:best.user_id,username:'Player'},best.id);
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

function mountFirstDiscoveriesPanel(){
  const page=document.getElementById('profilePage');
  const badgesPanel=page?.querySelector('.profile-badges-panel');
  if(!page||!badgesPanel)return null;
  let panel=document.getElementById('profileFirstDiscoveriesPanel');
  if(!panel){
    panel=document.createElement('section');
    panel.id='profileFirstDiscoveriesPanel';
    panel.className='profile-first-discoveries-panel';
    panel.innerHTML='<h2 class="profile-first-discoveries-title">First Discoveries</h2><div class="profile-first-discoveries-list"></div>';
  }
  badgesPanel.insertAdjacentElement('afterend',panel);
  return panel;
}

function firstDiscoveryMeta(saved){
  const key=String(saved?.badge_key||'');
  const catalog=key?nativeApp()?.getCatalogBadgeByKey?.(key):null;
  const points=Math.max(0,Number(catalog?.points??saved?.points)||0);
  const rarity=String(
    window.__CHORDLE_SIM__?.badgeRarityFromPoints?.(points)
    ||catalog?.rarity
    ||saved?.rarity
    ||'common'
  ).toLowerCase();
  const rank=Math.max(0,RARITY_ORDER.indexOf(rarity));
  const title=String(catalog?.name||saved?.badge_name||key||'Badge');
  return {key,catalog,points,rarity,rank,title};
}

async function renderFirstDiscoveries(targetProfile,badgeRows=[]){
  const panel=mountFirstDiscoveriesPanel();
  if(!panel)return;
  const list=panel.querySelector('.profile-first-discoveries-list');
  list.replaceChildren();

  if(!targetProfile){
    panel.hidden=true;
    return;
  }
  panel.hidden=false;

  const rows=(badgeRows||[]).filter(row=>row?.badge_key);
  const keys=[...new Set(rows.map(row=>String(row.badge_key)))];
  if(!keys.length){
    list.innerHTML='<div class="profile-first-discoveries-empty">No first discoveries yet.</div>';
    return;
  }

  const chunks=[];
  for(let i=0;i<keys.length;i+=40)chunks.push(keys.slice(i,i+40));
  const results=await Promise.all(chunks.map(chunk=>
    supabase.from('chordle_user_badges')
      .select('user_id,badge_key,discovered_at')
      .in('badge_key',chunk)
      .order('discovered_at',{ascending:true})
  ));

  const owners=[];
  for(const result of results){
    if(result.error){
      console.warn('Chordle profile first discoveries:',result.error.message);
      continue;
    }
    owners.push(...(result.data||[]));
  }

  owners.sort((a,b)=>{
    const at=Date.parse(a.discovered_at||0)||0;
    const bt=Date.parse(b.discovered_at||0)||0;
    return at-bt||String(a.user_id||'').localeCompare(String(b.user_id||''));
  });

  const firstByKey=new Map();
  for(const owner of owners){
    const key=String(owner.badge_key||'');
    if(key&&!firstByKey.has(key))firstByKey.set(key,owner);
  }

  const uniqueOwnedRows=[...new Map(rows.map(row=>[String(row.badge_key),row])).values()];
  const confirmed=uniqueOwnedRows.filter(row=>firstByKey.get(String(row.badge_key))?.user_id===targetProfile.id);

  const byTitle=new Map();
  for(const row of confirmed){
    const meta=firstDiscoveryMeta(row);
    const titleKey=meta.title.trim().toLocaleLowerCase();
    const prior=byTitle.get(titleKey);
    if(!prior||firstDiscoveryMeta(prior).points<meta.points)byTitle.set(titleKey,row);
  }

  const discovered=[...byTitle.values()];
  discovered.sort((a,b)=>{
    const am=firstDiscoveryMeta(a);
    const bm=firstDiscoveryMeta(b);
    return bm.rank-am.rank
      ||bm.points-am.points
      ||am.title.localeCompare(bm.title);
  });

  if(!discovered.length){
    list.innerHTML='<div class="profile-first-discoveries-empty">No first discoveries yet.</div>';
    return;
  }

  discovered.forEach((saved,index)=>{
    const meta=firstDiscoveryMeta(saved);
    const key=meta.key;
    const catalog=meta.catalog;
    const rarity=meta.rarity;

    const item=document.createElement('span');
    item.className='profile-first-discovery-item';

    const button=document.createElement('button');
    button.type='button';
    button.className='profile-first-discovery-link rarity-text-'+rarity;
    button.textContent=meta.title;
    button.addEventListener('click',()=>nativeApp()?.openBadgeDetailByKey?.(key));
    item.appendChild(button);

    if(index<discovered.length-1){
      const separator=document.createElement('span');
      separator.className='profile-first-discovery-separator';
      separator.textContent='⋅';
      separator.setAttribute('aria-hidden','true');
      item.appendChild(separator);
    }

    list.appendChild(item);
  });
}

function mountRollHistoryEntry(ownProfile){
  const page=document.getElementById('profilePage');
  const badgesPanel=page?.querySelector('.profile-badges-panel');
  if(!page||!badgesPanel)return null;
  let button=document.getElementById('chordleRollHistoryEntry');
  if(!ownProfile){
    button?.remove();
    return null;
  }
  if(!button){
    button=document.createElement('button');
    button.id='chordleRollHistoryEntry';
    button.type='button';
    button.className='chordle-roll-history-entry';
    button.textContent='View Roll History';
    button.addEventListener('click',()=>{location.hash='#roll-history';});
  }
  badgesPanel.insertAdjacentElement('afterend',button);
  return button;
}

function mountRollHistoryPage(){
  let page=document.getElementById('chordleRollHistoryPage');
  if(page)return page;
  page=document.createElement('main');
  page.id='chordleRollHistoryPage';
  page.className='chordle-roll-history-page';
  page.innerHTML='<h1 class="roll-history-title">Roll History</h1><div class="roll-history-list" id="rollHistoryList"></div>';
  document.body.insertBefore(page,document.getElementById('chordleFooter')||null);
  return page;
}

function formatRollHistoryDate(day){
  const raw=String(day||'');
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date=match?new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),20,0,0)):new Date(raw);
  if(Number.isNaN(date.getTime()))return raw||'Unknown date';
  return pacificDisplayDate(date);
}

async function renderRollHistoryRoute(){
  const active=location.hash==='#roll-history';
  document.documentElement.classList.toggle('chordle-roll-history-route',active);
  if(!active)return false;

  const page=mountRollHistoryPage();
  const list=page.querySelector('#rollHistoryList');
  const seq=++state.rollHistoryRenderSeq;
  if(!list)return true;

  if(!state.session?.user){
    list.innerHTML='<div class="profile-badges-empty">Sign in to view your roll history.</div>';
    return true;
  }

  const hadExisting=list.children.length>0;
  const [{data:rolls,error},profile]=await Promise.all([
    supabase.from('chordle_rolls').select('*').eq('user_id',state.session.user.id)
      .order('roll_day',{ascending:false}).order('created_at',{ascending:false}),
    state.profile?.id===state.session.user.id?Promise.resolve(state.profile):fetchProfileTarget(state.session.user.id)
  ]);
  if(seq!==state.rollHistoryRenderSeq||location.hash!=='#roll-history')return true;
  if(error){
    console.warn('Chordle roll history:',error.message);
    if(!hadExisting)list.innerHTML='<div class="profile-badges-empty">Could not load roll history.</div>';
    return true;
  }

  const fragment=document.createDocumentFragment();
  for(const roll of (rolls||[])){
    const item=document.createElement('section');
    item.className='roll-history-item';

    const date=document.createElement('div');
    date.className='roll-history-date';
    date.textContent=formatRollHistoryDate(roll.roll_day);
    item.appendChild(date);

    const summary=rollSummary(roll);
    const card=summary?nativeApp()?.createRollCard?.(summary,{showRarity:true}):null;
    if(card){
      addReplayRollButton(card,summary,profile||{id:roll.user_id,username:'Player'},roll.id);
      item.appendChild(card);
    }
    fragment.appendChild(item);
  }

  if(!(rolls||[]).length){
    const empty=document.createElement('div');
    empty.className='profile-badges-empty';
    empty.textContent='No completed rolls yet.';
    fragment.appendChild(empty);
  }
  list.replaceChildren(fragment);
  nativeApp()?.queueMockScoreFit?.(page);
  window.scrollTo({top:0,left:0,behavior:'auto'});
  return true;
}

function mountProfileLikeControl(){
  const colorControl=document.getElementById('profileColorControl');
  if(!colorControl?.parentElement)return null;
  let control=document.getElementById('profileLikeControl');
  if(!control){
    control=document.createElement('div');
    control.id='profileLikeControl';
    control.className='profile-like-control';
    control.hidden=true;
    control.innerHTML='<button type="button" class="profile-like-heart" aria-label="Like profile" title="Like profile">'+chordleHeartSvg()+'</button><span class="profile-like-count">0</span>';
    colorControl.insertAdjacentElement('afterend',control);
  }
  return control;
}

async function renderProfileLikeControl(targetProfile,ownProfile){
  const control=mountProfileLikeControl();
  if(!control)return;
  const seq=++state.profileLikeRenderSeq;
  const button=control.querySelector('.profile-like-heart');
  const countEl=control.querySelector('.profile-like-count');

  control.hidden=!targetProfile;
  if(control.hidden)return;

  const uid=state.session?.user?.id||null;
  const countPromise=supabase.from('chordle_profile_likes').select('*',{count:'exact',head:true}).eq('profile_id',targetProfile.id);
  const likedPromise=(uid&&!ownProfile)
    ?supabase.from('chordle_profile_likes').select('profile_id').eq('profile_id',targetProfile.id).eq('liker_id',uid).maybeSingle()
    :Promise.resolve({data:null,error:null});
  const [countResult,likedResult]=await Promise.all([countPromise,likedPromise]);
  if(seq!==state.profileLikeRenderSeq||control.hidden)return;
  if(countResult.error)console.warn('Chordle profile likes count:',countResult.error.message);
  if(likedResult.error)console.warn('Chordle profile like state:',likedResult.error.message);

  let count=Math.max(0,Number(countResult.count)||0);
  let liked=!!likedResult.data;
  button.disabled=!!ownProfile;
  button.classList.toggle('is-count-display',!!ownProfile);

  const paint=()=>{
    button.classList.toggle('is-liked',!ownProfile&&liked);
    button.setAttribute('aria-label',ownProfile?(String(count)+' profile likes'):(liked?'Unlike profile':'Like profile'));
    button.title=ownProfile?(String(count)+' profile likes'):(liked?'Unlike profile':'Like profile');
    countEl.textContent=String(count);
  };
  paint();

  if(ownProfile){
    button.onclick=null;
    return;
  }

  button.onclick=async()=>{
    if(!state.session?.user){showLogin();return;}
    button.disabled=true;
    try{
      if(liked){
        const {error}=await supabase.from('chordle_profile_likes').delete()
          .eq('profile_id',targetProfile.id).eq('liker_id',state.session.user.id);
        if(error)throw error;
        liked=false;count=Math.max(0,count-1);
      }else{
        const {error}=await supabase.from('chordle_profile_likes').insert({
          profile_id:targetProfile.id,
          liker_id:state.session.user.id
        });
        if(error)throw error;
        liked=true;count+=1;
      }
      paint();
    }catch(error){
      console.warn('Chordle profile like:',error?.message||error);
    }finally{
      button.disabled=false;
    }
  };
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
    mountRollHistoryEntry(false);
    void renderProfileLikeControl(null,false);
    renderBestRoll(null,null);
    renderTopBadges([]);
    await renderFirstDiscoveries(null,[]);
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
  mountRollHistoryEntry(ownProfile);
  void renderProfileLikeControl(target,ownProfile);

  const [{data:best},{data:badges}]=await Promise.all([
    supabase.from('chordle_rolls').select('*').eq('user_id',target.id).order('score',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('chordle_user_badges').select('*').eq('user_id',target.id).order('points',{ascending:false})
  ]);
  renderBestRoll(best||null,target);
  renderTopBadges(badges||[]);
  await renderFirstDiscoveries(target,badges||[]);
  mountAccountControls();
}

function mountReplayPanel(profileName){
  const banner=document.querySelector('.piano-banner');
  if(!banner)return;
  let panel=document.getElementById('chordleReplayPanel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='chordleReplayPanel';
    panel.className='chordle-replay-panel';
    banner.appendChild(panel);
  }
  panel.textContent=`${profileName||'Player'}'s chord replay`;
}

function clearReplayPanel(){
  document.getElementById('chordleReplayPanel')?.remove();
}

function isMainHash(){
  const hash=location.hash||'#home';
  return hash==='#home'||hash===''||hash==='#';
}

function isReplayHash(hash=location.hash||''){
  return /^#replay\/[^/]+\/[^/]+$/.test(hash);
}

function replayTargetFromHash(hash=location.hash||''){
  const match=hash.match(/^#replay\/([^/]+)\/([^/]+)$/);
  if(!match)return null;
  try{
    return {
      userKey:decodeURIComponent(match[1]),
      rollId:decodeURIComponent(match[2])
    };
  }catch{
    return null;
  }
}

function replayHref(profile,rollId){
  const userKey=profile?.public_id??profile?.id;
  if(userKey===undefined||userKey===null||!rollId)return '#home';
  return '#replay/'+encodeURIComponent(String(userKey))+'/'+encodeURIComponent(String(rollId));
}

function captureOwnMainSummary(){
  if(state.todayRoll){
    const summary=rollSummary(state.todayRoll);
    if(summary)return summary;
  }

  const pending=readJson(PENDING_ANON_ROLL_KEY);
  if(pending?.roll_day===localDayKey()&&Array.isArray(pending.notes)&&pending.notes.length===6){
    const notes=pending.notes.map(Number);
    const analysis=canonicalRollAnalysis(notes);
    if(analysis){
      return {
        notes,
        badges:analysis.badges,
        score:analysis.score,
        rarity:analysis.rarity,
        rarityLabel:titleCaseRarity(analysis.rarity),
        chordName:pending.chord_name||'Chord',
        chordDetail:pending.chord_detail||''
      };
    }
  }

  const notes=currentDailyNotes();
  const next=document.getElementById('nextChord');
  const analysis=canonicalRollAnalysis(notes);
  if(notes&&analysis&&next?.classList.contains('visible')){
    return {
      notes,
      badges:analysis.badges,
      score:analysis.score,
      rarity:analysis.rarity,
      rarityLabel:String(document.getElementById('scoreRarity')?.textContent||titleCaseRarity(analysis.rarity)).trim(),
      chordName:String(document.getElementById('chordName')?.textContent||'Chord').trim()||'Chord',
      chordDetail:String(document.getElementById('chordDetail')?.textContent||'').trim()
    };
  }
  return null;
}

function exitExternalReplay({restoreOwn=true}={}){
  const prior=state.externalReplay;
  state.replayLoadSeq++;
  if(!prior&&!document.documentElement.classList.contains('chordle-external-replay')&&!isReplayHash())return;

  nativeApp()?.stopAllAudio?.();
  state.externalReplay=null;
  document.documentElement.classList.remove('chordle-external-replay');
  clearReplayPanel();

  if(restoreOwn){
    const own=prior?.returnSummary||captureOwnMainSummary();
    if(own){
      nativeApp()?.restoreCompletedRoll?.(own);
      state.homeNeedsReset=false;
    }else{
      state.homeNeedsReset=true;
    }
  }

  applyCachedDiscoveryTags();
  syncShareButton();
}

async function loadReplayFromHash(){
  const target=replayTargetFromHash();
  if(!target)return false;
  const requestedHash=location.hash;
  const loadSeq=++state.replayLoadSeq;
  if(!/^\d+$/.test(String(target.rollId))){
    console.warn('Chordle replay: invalid roll id');
    return false;
  }

  nativeApp()?.stopAllAudio?.();
  document.documentElement.classList.remove('chordle-roll-history-route','chordle-info-route');

  const [profileResult,rollResult]=await Promise.all([
    fetchProfileTarget(target.userKey),
    supabase.from('chordle_rolls').select('*').eq('id',target.rollId).maybeSingle()
  ]);

  if(loadSeq!==state.replayLoadSeq||location.hash!==requestedHash)return false;

  const profile=profileResult;
  const roll=rollResult?.data||null;
  if(rollResult?.error){
    console.warn('Chordle replay roll lookup:',rollResult.error.message);
    return false;
  }
  if(!profile||!roll||roll.user_id!==profile.id){
    console.warn('Chordle replay: profile/roll mismatch or unavailable');
    return false;
  }

  const summary=rollSummary(roll);
  if(!summary)return false;

  const existingRouteKey=state.externalReplay?.routeKey;
  const routeKey=String(target.userKey)+':'+String(target.rollId);
  if(existingRouteKey===routeKey)return true;

  const returnSummary=state.externalReplay?.returnSummary||captureOwnMainSummary();
  state.externalReplay={
    userId:profile.id,
    publicId:profile.public_id??null,
    username:profile.username||'Player',
    rollId:roll.id,
    routeKey,
    returnSummary,
    summary
  };
  state.homeNeedsReset=false;
  document.documentElement.classList.add('chordle-external-replay');
  mountReplayPanel(state.externalReplay.username);
  applyCachedDiscoveryTags();
  syncShareButton();

  window.scrollTo({top:0,left:0,behavior:'auto'});
  await nativeApp()?.startExternalReplay?.(summary);
  syncShareButton();
  return true;
}

function startOtherRollReplay(profile,summary,rollId){
  if(!summary||!Array.isArray(summary.notes)||summary.notes.length!==6||!rollId)return;
  const href=replayHref(profile,rollId);
  if(href==='#home')return;

  if(location.hash===href){
    void loadReplayFromHash();
  }else{
    location.hash=href;
  }
}

function addReplayRollButton(root,summary,profile,rollId){
  const card=root?.classList?.contains('mock-roll-card')?root:root?.querySelector?.('.mock-roll-card');
  const head=card?.querySelector?.('.roll-detail-head');
  const play=head?.querySelector?.('.roll-detail-play');
  if(!card||!head||!play||head.querySelector('.roll-detail-replay')||!rollId)return card;

  let actions=head.querySelector('.roll-detail-actions');
  if(!actions){
    actions=document.createElement('div');
    actions.className='roll-detail-actions';
    head.appendChild(actions);
    actions.appendChild(play);
  }

  const replay=document.createElement('button');
  replay.type='button';
  replay.className='roll-detail-replay';
  replay.textContent='↻ Replay chord roll';
  replay.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    startOtherRollReplay(profile,summary,rollId);
  });
  actions.insertBefore(replay,play);
  return card;
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

function decorateLeaderboardRoll(root,summary,{winner=false}={}){
  const card=root?.classList?.contains('mock-roll-card')?root:root?.querySelector?.('.mock-roll-card');
  if(!card||!summary)return root;
  card.classList.add('chordle-tight-leaderboard-card');

  const rarityId=String(summary.rarity||'common').toLowerCase();
  card.querySelectorAll('.leaderboard-roll-rarity,.leaderboard-winner-meta-row').forEach(el=>{
    if(el.classList.contains('leaderboard-winner-meta-row')){
      const percentile=el.querySelector('.mock-roll-percentile');
      if(percentile)el.replaceWith(percentile);
      else el.remove();
    }else{
      el.remove();
    }
  });

  const rarity=document.createElement('div');
  rarity.className='leaderboard-roll-rarity rarity-text-'+rarityId;
  rarity.textContent=titleCaseRarity(rarityId);

  if(winner){
    const percentile=card.querySelector('.mock-roll-percentile');
    if(percentile){
      const row=document.createElement('div');
      row.className='leaderboard-winner-meta-row';
      percentile.replaceWith(row);
      row.append(percentile,rarity);
    }else{
      card.appendChild(rarity);
      rarity.classList.add('leaderboard-roll-rarity-corner');
    }
  }else{
    rarity.classList.add('leaderboard-roll-rarity-corner');
    card.appendChild(rarity);
  }

  return root;
}

function polishMainScoreLayout(){
  const box=document.getElementById('scoreBox');
  if(!box)return;
  const candidates=[...box.querySelectorAll('*')];
  for(const el of candidates){
    if(el.children.length)continue;
    const label=String(el.textContent||'').trim().toUpperCase();
    if(label==='SCORE')el.classList.add('chordle-score-heading');
    if(label==='RARITY')el.classList.add('chordle-rarity-heading');
  }

  const rarityText=String(document.getElementById('scoreRarity')?.textContent||'').trim().toLowerCase();
  const tierIndex=RARITY_ORDER.indexOf(rarityText);
  box.classList.toggle('chordle-standard-score-tier',tierIndex>=0&&tierIndex<=RARITY_ORDER.indexOf('mythic'));
}

function badgeIndexPoints(entry){
  const row=entry?.querySelector?.('.badge-index-row[data-badge-key]');
  const key=String(row?.dataset?.badgeKey||'');
  const badge=key?nativeApp()?.getCatalogBadgeByKey?.(key):null;
  return Math.max(0,Number(badge?.points)||0);
}

function sortBadgeIndexEntries(order=state.badgeSortOrder){
  const entries=[...document.querySelectorAll('.badge-index-entry')];
  if(!entries.length)return;
  const groups=new Map();
  for(const entry of entries){
    const parent=entry.parentElement;
    if(!parent)continue;
    if(!groups.has(parent))groups.set(parent,[]);
    groups.get(parent).push(entry);
  }

  for(const [parent,group] of groups){
    group.sort((a,b)=>{
      const diff=badgeIndexPoints(a)-badgeIndexPoints(b);
      if(diff!==0)return order==='asc'?diff:-diff;
      const an=String(a.querySelector('.badge-index-row')?.dataset?.badgeKey||'');
      const bn=String(b.querySelector('.badge-index-row')?.dataset?.badgeKey||'');
      return an.localeCompare(bn);
    });
    group.forEach(entry=>parent.appendChild(entry));
  }
}

function mountBadgeSortControl(){
  const entries=[...document.querySelectorAll('.badge-index-entry')];
  if(!entries.length)return null;
  const list=entries[0].parentElement;
  const host=list?.parentElement||document.querySelector('.badges-index-page');
  if(!host)return null;
  host.classList.add('chordle-badge-sort-host');

  let control=document.getElementById('chordleBadgeSortControl');
  if(!control){
    control=document.createElement('label');
    control.id='chordleBadgeSortControl';
    control.className='chordle-badge-sort-control';
    control.innerHTML='<select aria-label="Sort badges by score"><option value="desc">Score descending</option><option value="asc">Score ascending</option></select>';
    host.appendChild(control);
    const select=control.querySelector('select');
    select.value=state.badgeSortOrder;
    select.addEventListener('change',()=>{
      state.badgeSortOrder=select.value==='asc'?'asc':'desc';
      sortBadgeIndexEntries(state.badgeSortOrder);
    });
  }else if(control.parentElement!==host){
    host.appendChild(control);
  }
  control.querySelector('select').value=state.badgeSortOrder;
  return control;
}

function renderedLeaderboardRow(profile,rank,summary,roll=null){
  const account={id:profile.id,name:profile.username||'Player'};
  const row=nativeApp()?.createLeaderboardRow?.(account,rank,summary);
  if(row){
    decorateLeaderboardRoll(row,summary);
    patchRenderedProfileLink(row,profile);
    addReplayRollButton(row,summary,profile,roll?.id);
  }
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
  return [roll.id,roll.user_id,roll.score,roll.chord_name,roll.rarity,...(Array.isArray(roll.notes)?roll.notes:[])].join(':');
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
    if(card&&Array.isArray(winner.notes)){
      decorateLeaderboardRoll(card,summary,{winner:true});
      const exactPiano=nativeApp()?.createLeaderboardMiniPiano?.(winner.notes.map(Number),summary.rarity);
      const existingPiano=card.querySelector('.leaderboard-mini-piano');
      if(exactPiano){
        if(existingPiano)existingPiano.replaceWith(exactPiano);
        else card.prepend(exactPiano);
      }
      addReplayRollButton(card,summary,profile,winner.id);
    }
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

  // Keep the current rows visible while fresh data is fetched. The replacement
  // is built off-DOM and swapped in only when the whole ranking is ready.
  const nextList=document.createDocumentFragment();
  let nextCount=0;
  const appendRow=row=>{
    if(!row)return;
    nextList.appendChild(row);
    nextCount++;
  };

  if(titleEl)titleEl.textContent="Today's Leaderboard";
  if(dateEl)dateEl.textContent=pacificDisplayDate();

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
      const profile=todayProfiles.get(roll.user_id)||{id:roll.user_id,username:'Player',name_color:'#ffffff'};
      appendRow(renderedLeaderboardRow(profile,index+2,rollSummary(roll),roll));
    });
  }else if(state.leaderboardTab==='alltime'){
    const rolls=await bestRollsByUser(true);
    if(seq!==state.leaderboardRenderSeq)return;
    const profiles=await profileMapFor(rolls.map(r=>r.user_id));
    if(seq!==state.leaderboardRenderSeq)return;
    rolls.forEach((roll,index)=>{
      const profile=profiles.get(roll.user_id)||{id:roll.user_id,username:'Player',name_color:'#ffffff'};
      appendRow(renderedLeaderboardRow(profile,index+1,rollSummary(roll),roll));
    });
  }else if(state.leaderboardTab==='lifetime'){
    const {data,error}=await supabase.from('profiles')
      .select('id,public_id,username,name_color,lifetime_score')
      .order('lifetime_score',{ascending:false})
      .limit(100);
    if(seq!==state.leaderboardRenderSeq)return;
    if(error)console.warn('Chordle lifetime leaderboard:',error.message);
    (data||[]).forEach((profile,index)=>{
      appendRow(renderedMetricRow(profile,index+1,formatScore(profile.lifetime_score)));
    });
  }else if(state.leaderboardTab==='badges'){
    const {data}=await supabase.from('chordle_user_badges').select('user_id,badge_key');
    if(seq!==state.leaderboardRenderSeq)return;
    const badgesByUser=new Map();
    for(const b of (data||[])){
      if(!badgesByUser.has(b.user_id))badgesByUser.set(b.user_id,new Set());
      badgesByUser.get(b.user_id).add(String(b.badge_key));
    }
    const ids=[...badgesByUser.keys()];
    const profiles=await profileMapFor(ids);
    if(seq!==state.leaderboardRenderSeq)return;
    const ranked=ids.map(id=>({profile:profiles.get(id)||{id,username:'Player',name_color:'#ffffff'},count:badgesByUser.get(id)?.size||0}))
      .sort((a,b)=>b.count-a.count||String(a.profile.username).localeCompare(String(b.profile.username)));
    ranked.forEach((entry,index)=>{
      appendRow(renderedMetricRow(entry.profile,index+1,entry.count.toLocaleString()+' badges'));
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
      appendRow(renderedMetricRow(entry.profile,index+1,entry.count.toLocaleString()+' discovered'));
    });
  }

  if(seq!==state.leaderboardRenderSeq)return;
  if(!nextCount){
    const empty=document.createElement('div');
    empty.className='profile-badges-empty';
    empty.textContent='No results yet.';
    nextList.appendChild(empty);
  }
  list.replaceChildren(nextList);

  document.getElementById('leaderboardTabs')?.querySelectorAll('.leaderboard-tab').forEach(btn=>{
    const active=btn.dataset.leaderboardTab===state.leaderboardTab;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-selected',active?'true':'false');
  });
  nativeApp()?.queueMockScoreFit?.(document);
  requestAnimationFrame(()=>document.querySelectorAll('#leaderboardPage .mock-profile-link').forEach(fitProfileName));
}

const BADGE_EXIST_PAGE_SIZE=1000;
const BADGE_EXIST_CACHE_MS=15000;
const badgeExistCache={fetchedAt:0,counts:null,inFlight:null};

async function fetchGlobalBadgeExistCounts({force=false}={}){
  const now=Date.now();
  if(!force&&badgeExistCache.counts&&now-badgeExistCache.fetchedAt<BADGE_EXIST_CACHE_MS){
    return {counts:badgeExistCache.counts,error:null};
  }
  if(badgeExistCache.inFlight)return badgeExistCache.inFlight;

  const task=(async()=>{
    const counts=new Map();
    for(let from=0;;from+=BADGE_EXIST_PAGE_SIZE){
      const {data,error}=await supabase.from("chordle_roll_badges")
        .select("badge_key")
        .order("roll_id",{ascending:true})
        .order("badge_key",{ascending:true})
        .range(from,from+BADGE_EXIST_PAGE_SIZE-1);
      if(error)return {counts:null,error};
      const rows=data||[];
      for(const row of rows){
        const key=String(row.badge_key);
        counts.set(key,(counts.get(key)||0)+1);
      }
      if(rows.length<BADGE_EXIST_PAGE_SIZE)break;
    }
    badgeExistCache.counts=counts;
    badgeExistCache.fetchedAt=Date.now();
    return {counts,error:null};
  })();

  badgeExistCache.inFlight=task;
  try{
    return await task;
  }finally{
    if(badgeExistCache.inFlight===task)badgeExistCache.inFlight=null;
  }
}

async function refreshBadgeExistCounts(){
  mountBadgeSortControl();
  sortBadgeIndexEntries(state.badgeSortOrder);

  const uid=state.session?.user?.id||null;
  const ownedQuery=uid
    ?supabase.from("chordle_user_badges").select("badge_key").eq("user_id",uid)
    :Promise.resolve({data:[],error:null});
  const [instanceResult,ownedResult]=await Promise.all([
    fetchGlobalBadgeExistCounts(),
    ownedQuery
  ]);
  if(instanceResult.error){
    console.warn('Chordle badge existence:',instanceResult.error.message);
    return;
  }
  if(ownedResult.error)console.warn('Chordle owned badge tint:',ownedResult.error.message);

  const counts=instanceResult.counts||new Map();
  const ownedKeys=new Set((ownedResult.data||[]).map(row=>String(row.badge_key)));

  document.querySelectorAll(".badge-index-row[data-badge-key]").forEach(row=>{
    const key=String(row.dataset.badgeKey||"");
    const entry=row.closest(".badge-index-entry");
    const exists=entry?.querySelector(".badge-index-exists");
    const count=counts.get(key)||0;
    if(exists)exists.textContent=count.toLocaleString()+" "+(count===1?"Exists":"Exist");
    if(!entry)return;

    const badge=nativeApp()?.getCatalogBadgeByKey?.(key);
    const rarity=String(badge?.rarity||'common').toLowerCase();
    entry.dataset.chordleRarity=rarity;
    const discoveredBySomeone=count>0;
    const ownedByViewer=ownedKeys.has(key);
    entry.classList.toggle('chordle-publicly-discovered',discoveredBySomeone&&!ownedByViewer);
    entry.classList.toggle('chordle-never-discovered',!discoveredBySomeone&&!ownedByViewer);
  });
}

async function renderBadgeDetailFromSupabase(){
  if(!location.hash.startsWith('#badges/'))return;
  const app=nativeApp();
  const badge=app?.getBadgeFromHash?.();
  const panel=document.getElementById('badgeDetailPanel');
  if(!badge||!panel)return;

  const [instanceResult,discoveryResult]=await Promise.all([
    supabase.from('chordle_roll_badges').select('user_id').eq('badge_key',String(badge.key)),
    supabase.from('chordle_user_badges').select('user_id,discovered_at').eq('badge_key',String(badge.key)).order('discovered_at',{ascending:true})
  ]);
  if(instanceResult.error){console.warn('Chordle badge detail instances:',instanceResult.error.message);return;}
  if(discoveryResult.error){console.warn('Chordle badge detail discoveries:',discoveryResult.error.message);return;}
  const instances=instanceResult.data||[];
  const rows=discoveryResult.data||[];
  const exists=instances.length;
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
  const desc=document.createElement('p');
  desc.className='badge-detail-description';
  desc.textContent=app?.badgeDescription?.(badge)||badge.desc||'This badge has a defined Chordle rule, but its description could not be loaded.';

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
  return '<h2>Create account</h2><p class="ca-sub">Create your Chordle account. If you just rolled a chord, it will be saved when you sign in.</p><form><div class="ca-field"><label>Username</label><input name="username" minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" title="3–16 letters, numbers, or underscores" autocomplete="username" required></div><div class="ca-field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="ca-field"><label>Password</label><input name="password" type="password" minlength="6" autocomplete="new-password" required></div><div class="ca-actions"><button class="ca-btn ca-primary" type="submit">Create account</button></div><div class="ca-msg"></div></form>';
}

function showLogin(existingOverlay=null){
  captureAnonymousRoll({requireComplete:false});
  clearProfileLoginHighlight();
  const o=existingOverlay||modal('');
  o.classList.remove('ca-save-overlay');
  setModalContent(o,loginFormMarkup());
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();
    const submit=f.querySelector('button[type="submit"]');
    if(submit?.disabled)return;
    if(submit)submit.disabled=true;
    msg.textContent="Signing in…";
    captureAnonymousRoll({requireComplete:false});
    const fd=new FormData(f);
    const {data,error}=await supabase.auth.signInWithPassword({email:String(fd.get("email")).trim(),password:String(fd.get("password"))});
    if(error){
      const message=String(error.message||'');
      msg.textContent=/email.*not.*confirm/i.test(message)
        ?"This account exists, but its email is not confirmed yet. Check the confirmation email and spam folder, then sign in again."
        :message;
      if(submit)submit.disabled=false;
      return;
    }
    state.session=data.session;
    await initializeSignedInUser(data.user);
    o.remove();
    renderProfile();
  };
  return o;
}

function showSignup(existingOverlay=null){
  captureAnonymousRoll({requireComplete:false});
  clearProfileLoginHighlight();
  const o=existingOverlay||modal('');
  o.classList.remove('ca-save-overlay');
  setModalContent(o,signupFormMarkup());
  const f=o.querySelector("form"),msg=o.querySelector(".ca-msg");
  f.onsubmit=async e=>{
    e.preventDefault();
    const submit=f.querySelector('button[type="submit"]');
    if(submit?.disabled)return;
    const fd=new FormData(f),uname=String(fd.get("username")).trim();
    if(!/^[A-Za-z0-9_]{3,16}$/.test(uname)){
      msg.textContent="Username must be 3–16 characters using only letters, numbers, or underscores.";
      if(submit)submit.disabled=false;
      return;
    }
    const email=String(fd.get("email")).trim().toLowerCase();
    const previous=readJson(SIGNUP_COOLDOWN_KEY);
    const elapsed=Date.now()-Number(previous?.at||0);
    if(previous?.email===email && elapsed>=0 && elapsed<SIGNUP_COOLDOWN_MS){
      const seconds=Math.max(1,Math.ceil((SIGNUP_COOLDOWN_MS-elapsed)/1000));
      msg.textContent=`A confirmation request was just sent for this email. Check your inbox/spam or use Sign in. Try another signup request in ${seconds}s.`;
      return;
    }

    if(submit)submit.disabled=true;
    captureAnonymousRoll({requireComplete:false});
    msg.textContent="Checking username…";
    const usernamePattern=uname.replace(/[\\%_]/g,'\\$&');
    const {data:usernameMatches,error:usernameError}=await supabase.from('profiles')
      .select('username').ilike('username',usernamePattern).limit(20);
    if(usernameError){
      msg.textContent="Could not check that username right now. Please try again.";
      if(submit)submit.disabled=false;
      return;
    }
    const usernameTaken=(usernameMatches||[]).some(row=>
      String(row.username||'').toLowerCase()===uname.toLowerCase()
    );
    if(usernameTaken){
      msg.textContent="That username is already taken. Choose another one.";
      if(submit)submit.disabled=false;
      return;
    }

    msg.textContent="Creating account…";
    writeJson(SIGNUP_COOLDOWN_KEY,{email,at:Date.now()});
    const {data,error}=await supabase.auth.signUp({email,password:String(fd.get("password")),options:{data:{username:uname}}});
    if(error){
      const message=String(error.message||'');
      if(/rate.?limit|too many/i.test(message)){
        msg.textContent="Email sending is temporarily rate-limited. Do not keep creating accounts. If this email already has an account, use Sign in; otherwise check your inbox/spam and wait before requesting another confirmation email.";
      }else{
        msg.textContent=message;
      }
      if(submit)submit.disabled=false;
      return;
    }
    if(data.session){
      state.session=data.session;
      await initializeSignedInUser(data.user);
      o.remove();
      renderProfile();
    }else{
      msg.className="ca-msg ok";
      msg.textContent="Account created. Check your email to confirm it, then sign in. Your chord is waiting to be saved.";
      if(submit)submit.disabled=false;
    }
  };
  return o;
}

function showAnonymousSavePrompt(){
  if(state.externalReplay||state.session?.user)return;
  highlightProfileLogin();
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
  syncAnonymousAccountAttention();
  await renderProfile();
}

async function initializeSignedInUser(user,{allowLocalReset=false}={}){
  clearProfileLoginHighlight();

  // Supabase can emit auth/session refresh events while the browser tab is
  // backgrounded. A replay must remain an isolated spectator state: never
  // hydrate the signed-in user's profile/lifetime/badges/chord into its DOM.
  if(isReplayHash()||state.externalReplay){
    state.todayRoll=await getTodayRoll(user.id);
    return;
  }

  await loadProfile(user,2);
  await syncOwnedBadgesToLocal();
  state.todayRoll=await getTodayRoll(user.id);

  const pending=readJson(PENDING_ANON_ROLL_KEY);
  if(pending?.roll_day===localDayKey()){
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

  if(state.todayRoll){
    clearAnonymousRollClaim();
    restoreDailyRoll(state.todayRoll);
    return;
  }

  // For signed-in players, Supabase is authoritative. If an admin reset has
  // removed today's server roll, do not silently recreate it from stale local
  // reveal state on the next load. Clear that local day so the player can roll
  // again. Anonymous rolls use PENDING_ANON_ROLL_KEY above and are preserved.
  const next=document.getElementById("nextChord");
  if(allowLocalReset&&currentDailyNotes()&&next?.classList.contains("visible")){
    try{localStorage.removeItem(DAILY_LOCAL_KEY);}catch{}
    location.reload();
  }
}

function replayNavTarget(id){
  if(id==='homeLink')return '#home';
  if(id==='leaderboardNavBtn')return '#leaderboard';
  if(id==='badgesNavBtn')return '#badges';
  if(id==='settingsBtn')return '#settings';
  if(id==='profileNavBtn')return profileHref(state.profile||state.session?.user?.id);
  return '#home';
}

function hardExitReplay(targetHash='#home'){
  nativeApp()?.stopAllAudio?.();
  state.replayLoadSeq++;
  state.externalReplay=null;
  document.documentElement.classList.remove('chordle-external-replay');
  clearReplayPanel();

  // A spectator reveal has its own async note/badge/score timers inside the
  // original game engine. A full document restart is intentional here: it
  // destroys every replay timer/animation/audio node before loading the user's
  // real route, so no spectator state can bleed into their daily chord.
  const cleanHash=String(targetHash||'#home').startsWith('#')?String(targetHash||'#home'):'#home';
  const url=location.origin+location.pathname+location.search+cleanHash;
  location.replace(url);
  setTimeout(()=>location.reload(),0);
}

function wireReplayExitNavigation(){
  document.addEventListener('click',event=>{
    if(!(state.externalReplay||isReplayHash()))return;
    const nav=event.target.closest?.('#homeLink,#leaderboardNavBtn,#badgesNavBtn,#profileNavBtn,#settingsBtn');
    if(!nav)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    hardExitReplay(replayNavTarget(nav.id));
  },true);
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
    nativeApp()?.stopAllAudio?.();

    if(!isReplayHash()&&state.externalReplay){
      hardExitReplay(location.hash||'#home');
      return;
    }

    setTimeout(async()=>{
      if(isReplayHash()){
        await loadReplayFromHash();
        return;
      }

      if(isMainHash()&&state.homeNeedsReset){
        location.reload();
        return;
      }

      if(await renderRollHistoryRoute())return;
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
      syncShareButton();
      if(!next.classList.contains("visible")||state.restoring||state.externalReplay)return;
      if(state.session?.user)setTimeout(persistCompletedRoll,0);
      else{
        markAnonymousRollStarted();
        captureAnonymousRoll({requireComplete:true});
        setTimeout(showAnonymousSavePrompt,180);
      }
    });
    observer.observe(next,{attributes:true,attributeFilter:["class"]});
  }

  document.getElementById('revealBtn')?.addEventListener('click',event=>{
    if(!state.session?.user&&!state.todayRoll&&!state.externalReplay){
      markAnonymousRollStarted();
      setTimeout(()=>captureAnonymousRoll({requireComplete:false}),0);
    }
    if(state.todayRoll){
      event.preventDefault();
      event.stopImmediatePropagation();
      const summary=rollSummary(state.todayRoll);
      if(summary)void nativeApp()?.replayCompletedRoll?.(summary);
    }
  },true);
}

async function boot(){
  installChordleFavicon();
  mountDiscordLink();
  polishMainScoreLayout();
  unlockExistingPages();
  configureLeaderboardTabs();
  mountSiteFooter();
  mountInfoPage();
  mountShareButton();
  wireFirstDiscoveryBadges();
  wireReplayExitNavigation();
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
  // Capture a browser-owned anonymous roll before adopting a restored session.
  // This covers email-confirmation redirects and reloads after account creation.
  if(data.session?.user)captureAnonymousRoll({requireComplete:false});
  state.session=data.session;
  if(data.session?.user)await initializeSignedInUser(data.session.user,{allowLocalReset:true});
  syncLifetimeDisplay();
  syncAnonymousAccountAttention();
  syncShareButton();
  if(!data.session?.user){
    captureAnonymousRoll({requireComplete:false});
    if(document.getElementById("nextChord")?.classList.contains("visible")){
      setTimeout(showAnonymousSavePrompt,250);
    }
  }

  if(isReplayHash())await loadReplayFromHash();
  else if(await renderRollHistoryRoute()){}
  else if(renderInfoRoute()){}
  else if(location.hash.startsWith('#profile'))await renderProfile();
  else if(location.hash==='#leaderboard')await renderLeaderboard(state.leaderboardTab,{refreshWinner:true});
  else if(location.hash==='#badges')await refreshBadgeExistCounts();
  else if(location.hash.startsWith('#badges/'))await renderBadgeDetailFromSupabase();

  supabase.auth.onAuthStateChange((_event,session)=>{
    setTimeout(async()=>{
      if(session?.user&&!state.session?.user)captureAnonymousRoll({requireComplete:false});
      state.session=session;
      if(session?.user)await initializeSignedInUser(session.user);
      else{state.profile=null;state.todayRoll=null;}
      syncAnonymousAccountAttention();
      if(isReplayHash()){await loadReplayFromHash();return;}
      if(await renderRollHistoryRoute())return;
      if(renderInfoRoute())return;
      if(location.hash.startsWith('#profile'))renderProfile();
      if(location.hash==='#leaderboard')renderLeaderboard(state.leaderboardTab,{refreshWinner:true});
      if(location.hash==='#badges')refreshBadgeExistCounts();
      if(location.hash.startsWith('#badges/'))renderBadgeDetailFromSupabase();
    },0);
  });

  syncGlobalResetCountdown();
  setInterval(()=>{
    const day=localDayKey();
    if(day!==state.dayKey){location.reload();return;}
    syncGlobalResetCountdown();
    polishMainScoreLayout();
    if(location.hash==='#badges')refreshBadgeExistCounts();
  },1000);
}

boot();

window.chordleSupabase=supabase;
window.chordleAuth={showLogin,showSignup,showAnonymousSavePrompt,logout,renderProfile,renderLeaderboard,renderRollHistoryRoute,persistCompletedRoll,persistPendingAnonymousRoll,refreshBadgeExistCounts,renderBadgeDetailFromSupabase,currentShareText,startOtherRollReplay,loadReplayFromHash,exitExternalReplay,hardExitReplay};
