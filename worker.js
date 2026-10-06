export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;

    let html = await response.text();

    const socialMeta = `
<meta name="description" content="Generate one random six-note chord each day. Discover badges, compare scores, and climb the leaderboard." />
<meta name="theme-color" content="#ff72c6" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Chordle" />
<meta property="og:title" content="Chordle — Daily Random Chord Game" />
<meta property="og:description" content="Generate one random six-note chord each day. Discover badges, compare scores, and climb the leaderboard." />
<meta property="og:url" content="https://chordle.org/" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Chordle — Daily Random Chord Game" />
<meta name="twitter:description" content="Generate one random six-note chord each day. Discover badges, compare scores, and climb the leaderboard." />
<link rel="canonical" href="https://chordle.org/" />`;
    if (html.includes("</head>") && !html.includes('property="og:title"')) {
      html = html.replace("</head>", socialMeta + "\n</head>");
    }
    const anonymousAntiAbuseStyle = `
<style id="chordle-anonymous-anti-abuse-style">
.badge.anonymous-undiscovered{
  background:#292b30 !important;
  border-color:#4a4d54 !important;
  box-shadow:none !important;
  filter:none !important;
}
.badge.anonymous-undiscovered::before,
.badge.anonymous-undiscovered::after{display:none !important;}
.badge.anonymous-undiscovered .badge-name{
  color:#d4d6db !important;
  -webkit-text-fill-color:#d4d6db !important;
  background:none !important;
  filter:none !important;
  text-shadow:none !important;
}
.badge.anonymous-undiscovered .points{color:#f2f3f5 !important;}
</style>`;
    if (html.includes("</head>") && !html.includes('chordle-anonymous-anti-abuse-style')) {
      html = html.replace("</head>", anonymousAntiAbuseStyle + "\n</head>");
    }
    html = html.replace("return hash==='#home' || hash==='' || hash==='#';", "return hash==='#home' || hash==='' || hash==='#' || hash.startsWith('#replay/');");
    // Global Chordle day: midnight in America/Los_Angeles for every player.
    // The helper is injected before dailyRoll/localDayKey are defined. The date
    // heading itself uses a literal time zone because refreshChordDate runs earlier.
    const pacificHelperMarker = "  const LOCAL_DAILY_ROLL_KEY='chordle_generated_daily_roll_v1';";
    if (html.includes(pacificHelperMarker) && !html.includes('CHORDLE_PACIFIC_DAY_FORMATTER')) {
      const pacificHelpers = `
  const CHORDLE_PACIFIC_DAY_FORMATTER=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
  const CHORDLE_PACIFIC_CLOCK_FORMATTER=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  function chordlePacificParts(date=new Date(),clock=false){
    const out={};
    const formatter=clock?CHORDLE_PACIFIC_CLOCK_FORMATTER:CHORDLE_PACIFIC_DAY_FORMATTER;
    for(const part of formatter.formatToParts(date)) if(part.type!=='literal') out[part.type]=part.value;
    return out;
  }
  function chordlePacificDayKey(date=new Date()){
    const p=chordlePacificParts(date,false);
    return p.year+'-'+p.month+'-'+p.day;
  }
  function chordleNextPacificMidnight(now=new Date()){
    const p=chordlePacificParts(now,false);
    const tomorrow=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+1,12,0,0));
    const y=tomorrow.getUTCFullYear(),m=tomorrow.getUTCMonth()+1,d=tomorrow.getUTCDate();
    for(let utcHour=6;utcHour<=10;utcHour++){
      const candidate=new Date(Date.UTC(y,m-1,d,utcHour,0,0));
      const q=chordlePacificParts(candidate,true);
      if(Number(q.year)===y&&Number(q.month)===m&&Number(q.day)===d&&Number(q.hour)===0&&Number(q.minute)===0) return candidate;
    }
    return new Date(Date.UTC(y,m-1,d,8,0,0));
  }
`;
      html = html.replace(pacificHelperMarker, pacificHelpers + '\n' + pacificHelperMarker);
    }

    html = html.replace(
      "    chordDateEl.textContent = new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});",
      "    chordDateEl.textContent = new Date().toLocaleDateString(undefined,{timeZone:'America/Los_Angeles',weekday:'long',year:'numeric',month:'long',day:'numeric'});"
    );
    html = html.replace(
      /    const d=new Date\(\);\n    const day=`\$\{d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\)\+1\)\.padStart\(2,'0'\)\}-\$\{String\(d\.getDate\(\)\)\.padStart\(2,'0'\)\}`;/,
      "    const day=chordlePacificDayKey();"
    );

    // Anonymous anti-farming: guests can still experience the full game, but
    // their browser-owned daily roll is always kept below the 5,000,000 Godly
    // threshold. Signed-in users are never filtered.
    html = html.replace(
      /  function dailyRoll\(\) \{[\s\S]*?\n  \}\n\n  function randomRoll\(\)/,
      `  const ANON_MAX_SCORE_EXCLUSIVE=5000000;

  function chordleHasPersistedAuthSession(){
    try{
      const stored=JSON.parse(localStorage.getItem('sb-cpfmiszujdyrtadqtdbj-auth-token')||'null');
      return !!(stored?.access_token || stored?.refresh_token || stored?.user?.id);
    }catch{
      return false;
    }
  }

  function chordleAnonymousRollGuardActive(){
    if(window.chordleAuth?.isAuthenticated?.()===true) return false;
    // The inline game script runs before auth.js finishes restoring Supabase.
    // A persisted session means this browser is a signed-in player even if the
    // async auth state has not populated window.chordleAuth yet.
    if(chordleHasPersistedAuthSession()) return false;
    return true;
  }

  function chordleApplyAnonymousScoreCap(notes){
    const clean=Array.isArray(notes)?notes.map(Number):[];
    if(clean.length!==6 || !clean.every(n=>Number.isInteger(n)&&n>=0&&n<=36)) return clean;
    if(!chordleAnonymousRollGuardActive()) return clean;

    let candidate=clean;
    while(calculateRollTotal(candidate)>=ANON_MAX_SCORE_EXCLUSIVE){
      candidate=randomRoll();
    }
    return candidate;
  }

  function dailyRoll() {
    const day=chordlePacificDayKey();
    try{
      const stored=JSON.parse(localStorage.getItem(LOCAL_DAILY_ROLL_KEY)||'null');
      if(stored?.day===day && Array.isArray(stored.notes) && stored.notes.length===6){
        const notes=stored.notes.map(Number);
        if(notes.every(n=>Number.isInteger(n)&&n>=0&&n<=36)){
          const guarded=chordleApplyAnonymousScoreCap(notes);
          if(guarded.some((note,index)=>note!==notes[index])){
            try{ localStorage.setItem(LOCAL_DAILY_ROLL_KEY,JSON.stringify({day,notes:guarded})); }catch{}
          }
          return guarded;
        }
      }
    }catch{}

    const notes=chordleApplyAnonymousScoreCap(randomRoll());
    try{ localStorage.setItem(LOCAL_DAILY_ROLL_KEY,JSON.stringify({day,notes})); }catch{}
    return notes;
  }

  function randomRoll()`
    );
    html = html.replace(
      /  function localDayKey\(d=new Date\(\)\)\{ return `\$\{d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\)\+1\)\.padStart\(2,'0'\)\}-\$\{String\(d\.getDate\(\)\)\.padStart\(2,'0'\)\}`; \}/g,
      "  function localDayKey(d=new Date()){ return chordlePacificDayKey(d); }"
    );
    html = html.replace(
      "    const next=new Date(now); next.setHours(24,0,0,0);",
      "    const next=chordleNextPacificMidnight(now);"
    );

    html = html.replace(
      "  async function showBadge(badge,nextBadge=null){",
      "  function chordleShouldConcealAnonymousBadge(badge){\n    if(window.chordleAuth?.isAuthenticated?.()===true || badge?.special) return false;\n    const key=badgeSeenKey(badge);\n    const discovered=window.chordleAuth?.isBadgeGloballyDiscovered?.(key);\n    if(discovered===false) return true;\n    const rarity=String(badge?.rarity||'common').toLowerCase();\n    return (discovered===null || discovered===undefined) && (RANK[rarity]??-1)>=RANK.godly;\n  }\n\n  function chordleShouldConcealAnonymousRarity(rarity){\n    if(window.chordleAuth?.isAuthenticated?.()===true) return false;\n    const discovered=window.chordleAuth?.isRarityGloballyDiscovered?.(rarity);\n    if(discovered===false) return true;\n    const r=String(rarity||'common').toLowerCase();\n    return (discovered===null || discovered===undefined) && (RANK[r]??-1)>=RANK.godly;\n  }\n\n  async function showBadge(badge,nextBadge=null){\n    if(chordleShouldConcealAnonymousBadge(badge)){\n      const badgeViewportAnchor=captureBadgeViewportAnchor();\n      const el=document.createElement('div');\n      el.className='badge anonymous-undiscovered show';\n      el.setAttribute('aria-label','Undiscovered badge');\n      el.innerHTML=`<div class=\"badge-row\"><div><div class=\"badge-name-line\"><div class=\"badge-name\">???</div></div></div><div class=\"badge-meta\"><div class=\"points\">+${Number(badge.points||0).toLocaleString()}</div></div></div>`;\n      badgesEl.insertBefore(el,badgesEl.firstChild);\n      restoreBadgeViewportAnchor(badgeViewportAnchor);\n      badgeImpactMoments.set(badge,performance.now());\n      return false;\n    }"
    );

    html = html.replace(
      "    if(!currentBadge || !nextBadge || scheduledBadgePrestarts.has(nextBadge)) return false;",
      "    if(!currentBadge || !nextBadge || scheduledBadgePrestarts.has(nextBadge) || chordleShouldConcealAnonymousBadge(nextBadge)) return false;"
    );

    html = html.replace(
      "    revealLifetime(total,countLifetime);\n    flashFinalScore();\n  }",
      "    const concealAnonymousRarity=chordleShouldConcealAnonymousRarity(tier.id);\n    if(concealAnonymousRarity){\n      applyUnifiedRarity(notes,'common');\n      for(const panel of [chordCard,scoreBox]){\n        panel.classList.remove(...FINAL_RARITY_CLASSES.map(r=>`rarity-${r}`));\n        panel.classList.add('finalized','rarity-common');\n      }\n      scoreEl.textContent='???';\n      scoreRarityEl.textContent='???';\n      scorePercentileEl.textContent='';\n      scorePercentileEl.classList.remove('visible','top','bottom');\n      fitScoreToPanel();\n      revealLifetime(0,false);\n    }else{\n      revealLifetime(total,countLifetime);\n      flashFinalScore();\n    }\n  }"
    );

    // De-duplicate only the two final whole-chord analysis badges. The existing
    // rarity-based reveal cadence and all waits remain untouched.
    html = html.replace(
      "    const finalBadges=wholeChordBadges(notes);",
      "    const finalBadges=[...new Map(wholeChordBadges(notes).map(b=>[String(b?.key||b?.name||''),b])).values()];"
    );

    // Expose the refined v0.90/v0.91 UI renderers that already live inside
    // Chordle's main IIFE. auth.js uses these instead of recreating those panels.
    // Match the SIM export by its stable prefix instead of the entire object.
    // The export gains helpers over time; exact-string matching can silently disable
    // the renderer bridge and make every Supabase-backed view appear empty.
    const simMarkerMatch = html.match(/window\.__CHORDLE_SIM__=\{analyze,wholeChordBadges,calculateRollTotal,randomRoll,badgeRarityFromPoints[^;]*\};/);
    const simMarker = simMarkerMatch ? simMarkerMatch[0] : null;
    if (simMarker) {
      const bridge = `
  function chordlePrepareCompletedAudio(notes){
    const clean=Array.isArray(notes)?notes.map(Number):[];
    if(clean.length!==6 || !clean.every(n=>Number.isInteger(n)&&n>=0&&n<=36)) return false;

    // The static HTML ships #audioBtn disabled. Restore the synth state first,
    // before any badge/panel work that could fail, so a completed chord is
    // always playable immediately when the homepage reconstructs it.
    stopAudio(true);
    audioSuppressed=false;
    currentNotes=[...clean];
    revealedCount=clean.length;
    audioBtn.disabled=false;
    updateAudioButton();
    return true;
  }

  function chordleRestoreCompletedRoll(summary){
    try{
      if(!summary || !Array.isArray(summary.notes) || summary.notes.length!==6) return false;

      const notes=summary.notes.map(Number);
      chordlePrepareCompletedAudio(notes);

      const badges=(Array.isArray(summary.badges) && summary.badges.length)
        ? summary.badges
        : [...analyze(notes),...wholeChordBadges(notes)];
      const total=Math.max(0,Math.round(Number(summary.score)||calculateRollTotal(notes)));
      const named=identifyChord(notes);

      currentBadges=[...badges];
      displayedScore=total;
      persistCurrentRevealProgress=false;

      resetFinalPresentation();
      clearKeyStyles();
      renderSlots();

      [...noteSlots.children].forEach((pill,index)=>{
        pill.textContent=noteName(notes[index],true);
        pill.classList.remove('generating');
        pill.classList.add('revealed');
      });

      chordNameTypingToken++;
      chordNameEl.classList.remove('finish-pop');
      chordNameEl.textContent=summary.chordName || named.name;
      chordDetailEl.textContent=summary.chordDetail || named.detail || '';

      runningTierId=null;
      const tier=updateRunningScoreTier(notes,total);
      scoreEl.textContent=total.toLocaleString();
      scoreTallyLockedFontSize='';
      scoreEl.style.fontSize='';
      scoreRarityEl.textContent=tier.label;
      showScorePercentile(total,badges,notes);
      chordCard.classList.add('metadata-visible');
      scoreBox.classList.add('metadata-visible');

      badgesEl.replaceChildren();
      // showBadge() inserts each newly revealed badge at the top. Reversing
      // here reproduces the exact finished ordering without replaying animations.
      for(const badge of [...badges].reverse()){
        const el=document.createElement('div');
        const seenKey=badgeSeenKey(badge);
        el.className=\`badge \${badge.rarity}\${badge.special?' analysis-final':''} show\`;
        if(!badge.special) el.dataset.badgeKey=seenKey;
        el.innerHTML=\`<div class="badge-row"><div><div class="badge-name-line"><div class="badge-name">\${badge.name}</div></div>\${badgeMiniNotes(badge)}<div class="badge-desc">\${badge.desc||''}</div></div><div class="badge-meta"><div class="rarity">\${badge.rarity}</div><div class="points">+\${Number(badge.points||0).toLocaleString()}</div></div></div>\`;
        el.addEventListener('mouseenter',()=>focusBadge(badge));
        el.addEventListener('mouseleave',clearFocus);
        badgesEl.appendChild(el);
        if((RANK[badge.rarity]??0)>=RANK.supreme) syncRarityGradient(el);
      }

      nextChordEl.classList.add('visible');
      updateNextChordCountdown();

      revealBtn.disabled=false;
      revealBtn.textContent='Replay chord';
      rerollBtn.disabled=true;
      audioBtn.disabled=false;
      updateAudioButton();

      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        fitScoreToPanel();
        fitChordName();
        refitMainScoreLive();
      }));

      return true;
    }catch(error){
      console.warn('Chordle native roll restore failed:',error);
      return false;
    }
  }

  const __legacyRenderMockProfile=renderMockProfile;
  const __legacyRenderMockLeaderboard=renderMockLeaderboard;
  renderMockProfile=(...args)=>window.__CHORDLE_SUPABASE_OWNS_UI__ ? undefined : __legacyRenderMockProfile(...args);
  renderMockLeaderboard=(...args)=>window.__CHORDLE_SUPABASE_OWNS_UI__ ? undefined : __legacyRenderMockLeaderboard(...args);

  async function chordleReplayCompletedRoll(summary){
    if(!summary || !Array.isArray(summary.notes) || summary.notes.length!==6) return false;
    try{
      revealBtn.disabled=true;
      revealBtn.textContent='Replay chord';
      await reveal(summary.notes.map(Number),false);
      revealBtn.disabled=false;
      revealBtn.textContent='Replay chord';
      rerollBtn.disabled=true;
      // reveal() temporarily locks the chord audio control while notes are
      // generating. A completed daily-roll replay must hand that control back
      // so the player can immediately play/stop the finished chord hum.
      audioBtn.disabled=false;
      updateAudioButton();
      return true;
    }catch(error){
      console.warn('Chordle replay failed:',error);
      revealBtn.disabled=false;
      revealBtn.textContent='Replay chord';
      rerollBtn.disabled=true;
      // Do not leave the main-page audio control permanently locked if a replay
      // exits through an error after reveal() disabled it.
      audioBtn.disabled=false;
      updateAudioButton();
      return false;
    }
  }

  function chordleBadgeDescription(badge){
    if(!badge) return '';
    const key=String(badge.key||'');
    const parts=key.split(':');
    const mode=parts[1]||'';
    const def=(CHORD_BADGE_DEFS||[]).find(item=>String(item.id)===parts[0]);

    const pitchClassesFromDef=(item)=>{
      if(Array.isArray(item?.pitchClasses) && item.pitchClasses.length){
        return [...new Set(item.pitchClasses.map(pc=>((Number(pc)%12)+12)%12))];
      }
      const mask=Number(item?.mask);
      if(Number.isFinite(mask)){
        const pcs=[];
        for(let pc=0;pc<12;pc++) if(mask & (1<<pc)) pcs.push(pc);
        return pcs;
      }
      return [];
    };

    const orderFromLabel=(item,pcs)=>{
      if(!pcs.length) return pcs;
      const rootToken=String(item?.label||'').trim().split(/\\s+/)[0];
      let root=NOTE_NAMES_FLAT.indexOf(rootToken);
      if(root<0) root=NOTE_NAMES_SHARP.indexOf(rootToken);
      if(root<0 || !pcs.includes(root)) return pcs;
      return [...pcs].sort((a,b)=>(((a-root)+12)%12)-(((b-root)+12)%12));
    };

    const noteListFor=(pcs)=>{
      const allowed=new Set(pcs);
      const values=[];
      for(let n=0;n<=36;n++) if(allowed.has(((n%12)+12)%12)) values.push(noteName(n,true));
      return values;
    };

    if(def && (mode==='pure' || mode==='balance')){
      const pcs=orderFromLabel(def,pitchClassesFromDef(def));
      const pitchNames=pcs.map(pc=>NOTE_NAMES_FLAT[pc]);
      const playable=noteListFor(pcs);
      if(mode==='pure'){
        return 'All six generated notes must belong only to the pitch classes '+pitchNames.join(', ')+'. Allowed physical notes in Chordle\\'s C2–C5 range are '+playable.join(', ')+'. Octave placement and duplication are allowed, but no other pitch class may appear.';
      }
      return 'The six-note roll must contain exactly two generated notes from each of these pitch classes: '+pitchNames.join(', ')+'. Valid physical notes come from '+playable.join(', ')+'; octave placement may vary as long as the final count is exactly two of each pitch class.';
    }

    const existing=String(badge.desc||'').trim();
    if(existing) return existing;
    return 'Earned when the roll satisfies Chordle\\'s “'+String(badge.name||'badge')+'” rule.';
  }

  function chordleCreateIsolatedLeaderboardMiniPiano(notes,rarity){
    const mini=createLeaderboardMiniPiano((notes||[]).map(Number),rarity);
    mini.querySelectorAll('.key').forEach(key=>{
      key.classList.remove('key');
      key.classList.add('leaderboard-static-key');
    });
    return mini;
  }

  function chordleStopAllAudio(){
    try{ stopRollPreview(); }catch{}
    try{ stopAudio(); }catch{}
  }

  async function chordleStartExternalReplay(summary){
    if(!summary || !Array.isArray(summary.notes) || summary.notes.length!==6) return false;
    const notes=summary.notes.map(Number);
    const badges=(Array.isArray(summary.badges) && summary.badges.length)
      ? summary.badges
      : [...analyze(notes),...wholeChordBadges(notes)];
    const temporaryKeys=[];
    try{
      stopRollPreview();
      stopAudio(true);

      // Prevent another player's badges from ever rendering as "New" during a
      // spectator replay. These keys are temporary and never written to storage.
      for(const badge of badges){
        if(badge?.special) continue;
        const key=badgeSeenKey(badge);
        if(!seenBadges.has(key)){
          seenBadges.add(key);
          temporaryKeys.push(key);
        }
      }

      await reveal(notes,false);
      return true;
    }catch(error){
      console.warn('Chordle external roll replay failed:',error);
      return false;
    }finally{
      for(const key of temporaryKeys) seenBadges.delete(key);
    }
  }

  window.__CHORDLE_APP__={
    createRollCard:createMockRollCard,
    createLeaderboardMiniPiano:chordleCreateIsolatedLeaderboardMiniPiano,
    createLeaderboardRow,
    createLeaderboardMetricRow,
    createProfileBadgeRow,
    openBadgeDetailByKey,
    getCatalogBadgeByKey:badgeCatalogEntryByKey,
    badgeDescription:chordleBadgeDescription,
    getBadgeFromHash:()=>{
      const id=badgeDetailIdFromHash();
      return id===null?null:(badgeCatalogByPublicId().get(id)||null);
    },
    formatBadgeProbability,
    badgeIndexLabel:rarity=>BADGE_INDEX_LABELS[rarity]||rarity,
    queueBadgeDetailStatFit,
    syncRarityGradient,
    queueMockScoreFit,
    queueCompactBadgeTitleFit,
    scoreTier,
    stopRollPreview,
    stopAllAudio:chordleStopAllAudio,
    startExternalReplay:chordleStartExternalReplay,
    setOwnedBadgeKeys:keys=>{
      seenBadges.clear();
      for(const key of (keys||[])) seenBadges.add(String(key));
      writeSeenBadges();
      if(location.hash==='#badges') renderBadgeIndexPage();
    },
    prepareCompletedAudio:chordlePrepareCompletedAudio,
    restoreCompletedRoll:chordleRestoreCompletedRoll,
    replayCompletedRoll:chordleReplayCompletedRoll
  };
  ${simMarker}`;
      html = html.replace(simMarker, bridge);
    }

    const tag = '<script type="module" src="/auth.js?v=mobile-leaderboard-cards-20261004-1"></script>';
    const body = html.includes("</body>") ? html.replace("</body>", tag + "</body>") : html + tag;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    // HTML must not stay cached across daily-reset fixes. The versioned auth.js
    // URL handles module caching separately; this keeps the boot code current.
    headers.set("cache-control","no-store, no-cache, must-revalidate");
    headers.set("pragma","no-cache");
    headers.set("expires","0");
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  }
};
