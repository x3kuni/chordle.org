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

      revealBtn.disabled=true;
      revealBtn.textContent="Today's chord complete";
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

  window.__CHORDLE_APP__={
    createRollCard:createMockRollCard,
    createLeaderboardRow,
    createLeaderboardMetricRow,
    createProfileBadgeRow,
    openBadgeDetailByKey,
    getCatalogBadgeByKey:badgeCatalogEntryByKey,
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
    restoreCompletedRoll:chordleRestoreCompletedRoll
  };
  ${simMarker}`;
      html = html.replace(simMarker, bridge);
    }

    const tag = '<script type="module" src="/auth.js?v=refined-live-ui-1"></script>';
    const body = html.includes("</body>") ? html.replace("</body>", tag + "</body>") : html + tag;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  }
};
