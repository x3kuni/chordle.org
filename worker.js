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
    html = html.replace("return hash==='#home' || hash==='' || hash==='#';", "return hash==='#home' || hash==='' || hash==='#' || hash.startsWith('#replay/');");
    // Chordle's daily cycle is globally anchored to midnight in Los Angeles.
    // Patch the core engine before it executes so local storage, countdowns,
    // date labels, lifetime-day accounting, and Supabase roll_day agree.
    const pacificHelperMarker = "  const LOCAL_DAILY_ROLL_KEY='chordle_generated_daily_roll_v1';";
    if (html.includes(pacificHelperMarker) && !html.includes('CHORDLE_PACIFIC_TIME_ZONE')) {
      const pacificHelpers = `
  const CHORDLE_PACIFIC_TIME_ZONE='America/Los_Angeles';
  const CHORDLE_PACIFIC_DATE_FORMATTER=new Intl.DateTimeFormat('en-US',{timeZone:CHORDLE_PACIFIC_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
  const CHORDLE_PACIFIC_CLOCK_FORMATTER=new Intl.DateTimeFormat('en-US',{timeZone:CHORDLE_PACIFIC_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  function chordlePacificParts(date=new Date(),withClock=false){
    const out={};
    const formatter=withClock?CHORDLE_PACIFIC_CLOCK_FORMATTER:CHORDLE_PACIFIC_DATE_FORMATTER;
    for(const part of formatter.formatToParts(date)) if(part.type!=='literal') out[part.type]=part.value;
    return out;
  }
  function chordlePacificDayKey(date=new Date()){
    const p=chordlePacificParts(date,false);
    return p.year+'-'+p.month+'-'+p.day;
  }
  function chordleNextPacificMidnight(now=new Date()){
    const p=chordlePacificParts(now,false);
    const tomorrow=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+1));
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
      /    const d=new Date\(\);\n    const day=`\$\{d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\)\+1\)\.padStart\(2,'0'\)\}-\$\{String\(d\.getDate\(\)\)\.padStart\(2,'0'\)\}`;/,
      "    const day=chordlePacificDayKey();"
    );
    html = html.replace(
      /  function localDayKey\(d=new Date\(\)\)\{ return `\$\{d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\)\+1\)\.padStart\(2,'0'\)\}-\$\{String\(d\.getDate\(\)\)\.padStart\(2,'0'\)\}`; \}/g,
      "  function localDayKey(d=new Date()){ return chordlePacificDayKey(d); }"
    );
    html = html.replace(
      "    chordDateEl.textContent = new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});",
      "    chordDateEl.textContent = new Date().toLocaleDateString(undefined,{timeZone:'America/Los_Angeles',weekday:'long',year:'numeric',month:'long',day:'numeric'});"
    );
    html = html.replace(
      "    const next=new Date(now); next.setHours(24,0,0,0);",
      "    const next=chordleNextPacificMidnight(now);"
    );

    // Keep native badge timing, but never allow whole-chord analysis badges to duplicate.
    html = html.replace(
      "    const finalBadges=wholeChordBadges(notes);",
      "    const existingBadgeKeys=new Set(currentBadges.map(b=>String(b?.key||b?.name||'')));\n    const finalBadges=wholeChordBadges(notes).filter(b=>!existingBadgeKeys.has(String(b?.key||b?.name||'')));"
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
  function chordleRestoreCompletedRoll(summary){
    try{
      if(!summary || !Array.isArray(summary.notes) || summary.notes.length!==6) return false;

      const notes=summary.notes.map(Number);
      const badges=(Array.isArray(summary.badges) && summary.badges.length)
        ? summary.badges
        : [...analyze(notes),...wholeChordBadges(notes)];
      const total=Math.max(0,Math.round(Number(summary.score)||calculateRollTotal(notes)));
      const named=identifyChord(notes);

      stopAudio(true);
      audioSuppressed=false;
      currentNotes=[...notes];
      currentBadges=[...badges];
      revealedCount=notes.length;
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
      return true;
    }catch(error){
      console.warn('Chordle replay failed:',error);
      revealBtn.disabled=false;
      revealBtn.textContent='Replay chord';
      rerollBtn.disabled=true;
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
    restoreCompletedRoll:chordleRestoreCompletedRoll,
    replayCompletedRoll:chordleReplayCompletedRoll
  };
  ${simMarker}`;
      html = html.replace(simMarker, bridge);
    }

    const tag = '<script type="module" src="/auth.js?v=render-bridge-hotfix-20261003-1"></script>';
    const body = html.includes("</body>") ? html.replace("</body>", tag + "</body>") : html + tag;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  }
};
