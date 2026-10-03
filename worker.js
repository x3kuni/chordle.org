export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;

    let html = await response.text();

    // Expose the refined v0.90/v0.91 UI renderers that already live inside
    // Chordle's main IIFE. auth.js uses these instead of recreating those panels.
    const simMarker = 'window.__CHORDLE_SIM__={analyze,wholeChordBadges,calculateRollTotal,randomRoll,badgeRarityFromPoints};';
    if (html.includes(simMarker)) {
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

  window.__CHORDLE_APP__={
    createRollCard:createMockRollCard,
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

    const tag = '<script type="module" src="/auth.js?v=share-badges-auth-pr9-1"></script>';
    const body = html.includes("</body>") ? html.replace("</body>", tag + "</body>") : html + tag;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  }
};
