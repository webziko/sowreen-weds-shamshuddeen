/* =========================================================================
   Sowreen weds Shamshuddeen — interactions
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* -----------------------------------------------------------------------
     Music (single audio track — the only sound on the site)
     ----------------------------------------------------------------------- */
  var bgMusic = $("#bg-music");
  var soundToggle = $("#sound-toggle");
  var musicAvailable = true;

  function setToggleState(on) {
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    soundToggle.setAttribute("aria-label", on ? "Turn music off" : "Turn music on");
  }

  function startMusic() {
    if (!bgMusic) return;
    var p = bgMusic.play();
    if (p && p.then) {
      p.then(function () { setToggleState(true); })
       .catch(function () {
         // Autoplay blocked or file missing — leave it off; toggle can retry.
         setToggleState(false);
       });
    }
  }

  if (bgMusic) {
    bgMusic.addEventListener("error", function () { musicAvailable = false; });
  }

  soundToggle.addEventListener("click", function () {
    if (!bgMusic) return;
    if (bgMusic.paused) {
      var p = bgMusic.play();
      if (p && p.then) { p.then(function () { setToggleState(true); }).catch(function () { setToggleState(false); }); }
      else { setToggleState(true); }
    } else {
      bgMusic.pause();
      setToggleState(false);
    }
  });

  /* -----------------------------------------------------------------------
     Section 1 — Envelope cover
     ----------------------------------------------------------------------- */
  var cover = $("#cover");
  var coverVideo = $("#cover-video");
  var coverOpen = $("#cover-open");
  var coverSkip = $("#cover-skip");
  var heroVideo = $("#hero-video");
  var opened = false;
  var revealed = false;
  var REVEAL_AT = 9; // seconds into the envelope video to crossfade to the hero

  document.body.classList.add("cover-active");

  function ensureHeroPlaying() {
    if (heroVideo) {
      var hp = heroVideo.play();
      if (hp && hp.catch) hp.catch(function () {});
    }
  }

  // Reveal the hero: white flash, fade the cover out, unlock scroll.
  function revealHero() {
    if (revealed) return;
    revealed = true;
    // Play the hero from the start so it runs once and freezes on the final
    // (balcony) frame — no loop.
    if (heroVideo) { try { heroVideo.loop = false; heroVideo.currentTime = 0; } catch (e) {} }
    ensureHeroPlaying();
    soundToggle.classList.remove("is-hidden");

    // Unlock scrolling and snap to the top NOW, while the cover is still fully
    // opaque — so the page reflow can't flash a lower section (the scratch heart)
    // as the cover fades away.
    document.body.classList.remove("cover-active");
    window.scrollTo(0, 0);

    if (prefersReduced) {
      cover.classList.add("is-gone");
      hideCover();
      return;
    }
    cover.classList.add("is-flashing");
    setTimeout(function () { cover.classList.add("is-gone"); }, 350);
    setTimeout(hideCover, 1250);
  }

  function hideCover() {
    cover.style.display = "none";
    if (coverVideo) { try { coverVideo.pause(); } catch (e) {} }
  }

  // Tap to open: start music (user gesture), play envelope video, then reveal.
  function openInvitation() {
    if (opened) return;
    opened = true;
    startMusic();
    soundToggle.classList.remove("is-hidden");
    ensureHeroPlaying();

    // Reduced motion, or no video: go straight to hero.
    if (prefersReduced || !coverVideo || !coverVideo.canPlayType) {
      revealHero();
      return;
    }

    cover.classList.add("is-opening");
    var played = false;
    try {
      var pr = coverVideo.play();
      if (pr && pr.then) {
        pr.then(function () { played = true; }).catch(function () { revealHero(); });
      } else { played = true; }
    } catch (e) { revealHero(); return; }

    // Begin the crossfade to the hero at the 9-second mark.
    coverVideo.addEventListener("timeupdate", function onTU() {
      if (coverVideo.currentTime >= REVEAL_AT) {
        coverVideo.removeEventListener("timeupdate", onTU);
        revealHero();
      }
    });
    coverVideo.addEventListener("ended", revealHero);
    // Safety fallback in case timing events never fire.
    setTimeout(function () { if (!revealed) revealHero(); }, 12000);
  }

  coverOpen.addEventListener("click", openInvitation);
  coverSkip.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!opened) { startMusic(); }
    opened = true;
    soundToggle.classList.remove("is-hidden");
    revealHero();
  });

  // If the envelope video fails to load, still let a tap open the hero.
  if (coverVideo) {
    coverVideo.addEventListener("error", function () {
      if (opened && !revealed) revealHero();
    });
  }

  /* -----------------------------------------------------------------------
     Reveal-on-scroll
     ----------------------------------------------------------------------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* -----------------------------------------------------------------------
     Countdown to the Nikah — 26 Sep 2026, 5:45 PM IST (UTC+5:30)
     17:45 IST == 12:15 UTC
     ----------------------------------------------------------------------- */
  var TARGET = Date.UTC(2026, 8, 26, 12, 15, 0); // 26 Sep 2026 17:45 IST
  var elDays = $("#cd-days"), elHours = $("#cd-hours"),
      elMins = $("#cd-mins"), elSecs = $("#cd-secs");
  var cdTitle = $("#cd-title"), cdSub = $("#cd-sub");
  var cdL = [$("#cd-l1"), $("#cd-l2"), $("#cd-l3"), $("#cd-l4")];
  var cdMode = null;

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function setNum(el, val) {
    var s = pad2(val);
    if (el && el.textContent !== s) {
      el.textContent = s;
      if (!prefersReduced) {
        el.classList.remove("tick");
        void el.offsetWidth; // reflow to restart animation
        el.classList.add("tick");
      }
    }
  }

  function setLabels(a, b, c, d) {
    if (cdL[0]) cdL[0].textContent = a;
    if (cdL[1]) cdL[1].textContent = b;
    if (cdL[2]) cdL[2].textContent = c;
    if (cdL[3]) cdL[3].textContent = d;
  }

  // Calendar-aware elapsed time (years / months / days / hours).
  function diffYMDH(from, to) {
    var y = to.getFullYear() - from.getFullYear();
    var mo = to.getMonth() - from.getMonth();
    var d = to.getDate() - from.getDate();
    var h = to.getHours() - from.getHours();
    if (h < 0) { h += 24; d -= 1; }
    if (d < 0) { d += new Date(to.getFullYear(), to.getMonth(), 0).getDate(); mo -= 1; }
    if (mo < 0) { mo += 12; y -= 1; }
    return { y: y, mo: mo, d: d, h: h };
  }

  function tickCountdown() {
    var now = Date.now();
    if (now < TARGET) {
      // Counting down to the Nikah
      if (cdMode !== "down") {
        cdMode = "down";
        if (cdTitle) cdTitle.textContent = "Counting Down to the Nikah";
        if (cdSub) cdSub.innerHTML = "Saturday, 26 September 2026 &middot; 5:45 PM (IST)";
        setLabels("Days", "Hours", "Minutes", "Seconds");
      }
      var s = Math.floor((TARGET - now) / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600);  s -= h * 3600;
      var m = Math.floor(s / 60);    s -= m * 60;
      setNum(elDays, d); setNum(elHours, h); setNum(elMins, m); setNum(elSecs, s);
    } else {
      // After the Nikah — count up the blessed journey together
      if (cdMode !== "up") {
        cdMode = "up";
        if (cdTitle) cdTitle.textContent = "Our Journey Together";
        if (cdSub) cdSub.innerHTML = "Married on 26 September 2026 &middot; Alhamdulillah";
        setLabels("Years", "Months", "Days", "Hours");
      }
      var e = diffYMDH(new Date(TARGET), new Date(now));
      setNum(elDays, e.y); setNum(elHours, e.mo); setNum(elMins, e.d); setNum(elSecs, e.h);
    }
  }
  if (elDays) {
    tickCountdown();
    setInterval(tickCountdown, 1000);
  }

  /* -----------------------------------------------------------------------
     Calendar — Google Calendar links + .ics download (start-anchored)
     ----------------------------------------------------------------------- */
  var EVENTS = {
    nikah: {
      title: "Nikah Ceremony — Sowreen & CA Shamshuddeen BM",
      startUTC: "20260926T121500Z", // 26 Sep 2026 17:45 IST
      endUTC:   "20260926T131500Z", // + 1h
      location: "Indian Auditorium, Neralkatte, Mani",
      details:  "Nikah ceremony at 5:45 PM. Insha Allah. Followed by Dinner. Your dua and blessings are the best gift for us."
    },
    reception: {
      title: "Wedding Dinner — Sowreen & CA Shamshuddeen BM",
      startUTC: "20260926T133000Z", // 26 Sep 2026 19:00 IST
      endUTC:   "20260926T153000Z", // + 2h
      location: "Indian Auditorium, Neralkatte, Mani",
      details:  "Wedding Dinner following the Nikah ceremony. Indian Auditorium, Neralkatte, Mani. Insha Allah."
    }
  };

  function gcalUrl(ev) {
    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(ev.title) +
      "&dates=" + ev.startUTC + "/" + ev.endUTC +
      "&details=" + encodeURIComponent(ev.details) +
      "&location=" + encodeURIComponent(ev.location);
  }

  var gN = $("#gcal-nikah"), gR = $("#gcal-reception");
  if (gN) gN.href = gcalUrl(EVENTS.nikah);
  if (gR) gR.href = gcalUrl(EVENTS.reception);

  function icsBlock(ev, uid) {
    return [
      "BEGIN:VEVENT",
      "UID:" + uid + "@sowreen-weds-shamshuddeen",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
      "DTSTART:" + ev.startUTC,
      "DTEND:" + ev.endUTC,
      "SUMMARY:" + ev.title,
      "LOCATION:" + ev.location,
      "DESCRIPTION:" + ev.details,
      "END:VEVENT"
    ].join("\r\n");
  }

  function buildIcs() {
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//sowreen-weds-shamshuddeen//Wedding//EN",
      "CALSCALE:GREGORIAN",
      icsBlock(EVENTS.nikah, "nikah"),
      icsBlock(EVENTS.reception, "dinner"),
      "END:VCALENDAR"
    ].join("\r\n");
  }

  var icsBtn = $("#ics-both");
  if (icsBtn) {
    icsBtn.addEventListener("click", function () {
      var blob = new Blob([buildIcs()], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "sowreen-weds-shamshuddeen.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    });
  }

  /* -----------------------------------------------------------------------
     Section 4 — Scratch to reveal
     ----------------------------------------------------------------------- */
  var scratchCard = $("#scratch-card");
  var scratchCanvas = $("#scratch-canvas");
  var scratchHint = $("#scratch-hint");
  var foreverHeading = $("#forever-heading");
  // Same heart geometry as the SVG revealed underneath, so the foil lines up.
  var HEART_PATH = "M100 175S12 122 12 60C12 30 36 12 62 12c18 0 31 10 38 24 7-14 20-24 38-24 26 0 50 18 50 48 0 62-88 115-88 115z";

  function countOpaque(ctx, canvas) {
    try {
      var d = ctx.getImageData(0, 0, canvas.width, canvas.height).data, n = 0;
      for (var i = 3; i < d.length; i += 64) { if (d[i] >= 128) n++; }
      return n;
    } catch (e) { return 0; }
  }

  function initScratch() {
    if (!scratchCanvas || !scratchCard) return;
    var ctx = scratchCanvas.getContext("2d");
    var rect = scratchCard.getBoundingClientRect();
    if (!rect.width) { setTimeout(initScratch, 200); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(rect.width), h = Math.round(rect.height);
    scratchCanvas.width = w * dpr;
    scratchCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    // Draw the glittery rose foil, clipped to the heart shape.
    var vbW = 200, vbH = 190;
    var scale = Math.min(w / vbW, h / vbH);
    var offX = (w - vbW * scale) / 2, offY = (h - vbH * scale) / 2;
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    ctx.clip(new Path2D(HEART_PATH));

    var g = ctx.createLinearGradient(0, 0, vbW, vbH);
    g.addColorStop(0, "#e3a7ad");
    g.addColorStop(0.45, "#cf8a92");
    g.addColorStop(0.7, "#c17982");
    g.addColorStop(1, "#d99aa1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vbW, vbH);

    var rg = ctx.createRadialGradient(vbW * 0.4, vbH * 0.32, 4, vbW * 0.4, vbH * 0.32, vbW * 0.62);
    rg.addColorStop(0, "rgba(255,255,255,0.55)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, vbW, vbH);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (var i = 0; i < 90; i++) {
      var rx = Math.random() * vbW, ry = Math.random() * vbH, rr = Math.random() * 1.3 + 0.3;
      ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Opaque erase so each pass fully clears the foil.
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.globalCompositeOperation = "destination-out";

    var initialOpaque = countOpaque(ctx, scratchCanvas);
    var drawing = false;
    var revealedScratch = false;

    function pos(e) {
      var r = scratchCanvas.getBoundingClientRect();
      var pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return { x: pt.clientX - r.left, y: pt.clientY - r.top };
    }
    function scratchAt(x, y) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(16, Math.min(w, h) * 0.11), 0, Math.PI * 2);
      ctx.fill();
    }
    function doReveal() {
      if (revealedScratch) return;
      revealedScratch = true;
      scratchCard.classList.add("is-revealed");
      if (foreverHeading) foreverHeading.textContent = "Our forever begins";
      if (scratchHint) scratchHint.textContent = "♥";
      if (foreverField) foreverField.celebrate(); // petal celebration burst
      // Subtle celebratory haptic on phones that support it
      if (navigator.vibrate) { try { navigator.vibrate([15, 35, 25]); } catch (e) {} }
    }

    var checkCtr = 0;
    function maybeReveal() {
      if (revealedScratch) return;
      if ((++checkCtr) % 5 !== 0) return;
      var now = countOpaque(ctx, scratchCanvas);
      // Reveal once ~60% of the heart's foil has been scratched off.
      if (initialOpaque && now / initialOpaque < 0.4) doReveal();
    }

    function down(e) { drawing = true; var p = pos(e); scratchAt(p.x, p.y); if (e.cancelable) e.preventDefault(); }
    function move(e) { if (!drawing) return; var p = pos(e); scratchAt(p.x, p.y); maybeReveal(); if (e.cancelable) e.preventDefault(); }
    function up() { drawing = false; maybeReveal(); }

    scratchCanvas.addEventListener("pointerdown", down);
    scratchCanvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    // touch fallback for older iOS
    scratchCanvas.addEventListener("touchstart", down, { passive: false });
    scratchCanvas.addEventListener("touchmove", move, { passive: false });
    scratchCanvas.addEventListener("touchend", up);

    // Reduced motion / accessibility: reveal without requiring a drag.
    if (prefersReduced) doReveal();
  }

  /* -----------------------------------------------------------------------
     Particle systems (ambient + forever petals)
     ----------------------------------------------------------------------- */
  function makePetalField(canvas, opts) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var parts = [];
    var running = false, rafId = null;

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    function spawn(initial) {
      return {
        x: rnd(0, W),
        y: initial ? rnd(0, H) : rnd(-40, -6),
        r: rnd(opts.minR, opts.maxR),
        vy: rnd(opts.minV, opts.maxV),
        vx: rnd(-0.35, 0.35),
        rot: rnd(0, Math.PI * 2),
        vr: rnd(-0.02, 0.02),
        hue: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        a: rnd(opts.minA, opts.maxA),
        sparkle: Math.random() < (opts.sparkleRatio || 0)
      };
    }
    function build() {
      parts = [];
      for (var i = 0; i < opts.count; i++) parts.push(spawn(true));
    }

    function petal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.hue;
      if (p.sparkle) {
        // 4-point sparkle
        ctx.beginPath();
        for (var k = 0; k < 4; k++) {
          var ang = k * Math.PI / 2;
          ctx.lineTo(Math.cos(ang) * p.r, Math.sin(ang) * p.r);
          ctx.lineTo(Math.cos(ang + Math.PI / 4) * p.r * 0.32, Math.sin(ang + Math.PI / 4) * p.r * 0.32);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // soft petal (teardrop-ish)
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function step() {
      ctx.clearRect(0, 0, W, H);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        if (p.g) p.vy += p.g;               // gravity for celebration burst
        p.y += p.vy;
        p.x += p.vx + Math.sin((p.y + p.x) * 0.01) * 0.3;
        p.rot += p.vr;
        petal(p);
        if (p.y - p.r > H) {
          if (parts.length > opts.count) parts.splice(i, 1); // shed burst extras
          else parts[i] = spawn(false);
        }
      }
      rafId = requestAnimationFrame(step);
    }

    // Confetti/petal burst from a point — the "celebration" pop.
    function burst(cx, cy, n) {
      for (var i = 0; i < n; i++) {
        parts.push({
          x: cx + rnd(-28, 28), y: cy + rnd(-18, 18),
          r: rnd(opts.minR, opts.maxR + 3),
          vy: rnd(-7.5, -2), vx: rnd(-4.5, 4.5), g: 0.14,
          rot: rnd(0, Math.PI * 2), vr: rnd(-0.06, 0.06),
          hue: opts.colors[Math.floor(Math.random() * opts.colors.length)],
          a: rnd(0.6, 0.95), sparkle: Math.random() < 0.42
        });
      }
      if (!running) start();
    }

    function celebrate() {
      start();
      burst(W / 2, H * 0.44, 46);
      setTimeout(function () { burst(W * 0.33, H * 0.4, 24); }, 170);
      setTimeout(function () { burst(W * 0.67, H * 0.4, 24); }, 330);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) petal(parts[i]);
    }

    function start() {
      if (running) return; running = true;
      if (prefersReduced) { drawStatic(); return; }
      step();
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId); rafId = null;
    }

    resize();
    build();
    window.addEventListener("resize", function () { resize(); build(); if (running && prefersReduced) drawStatic(); });
    return { start: start, stop: stop, burst: burst, celebrate: celebrate };
  }

  // Ambient (whole page, subtle gold + blush)
  var ambientCanvas = $("#ambient");
  var ambientField = null;
  if (ambientCanvas) {
    ambientField = makePetalField(ambientCanvas, {
      count: prefersReduced ? 10 : 16,
      minR: 3, maxR: 8, minV: 0.15, maxV: 0.5,
      minA: 0.12, maxA: 0.4,
      colors: ["#e6cf94", "#f7dcdc", "#cf8a92", "#fff4e0"],
      sparkleRatio: 0.5
    });
    ambientField.start();
  }

  // Forever section petals (denser, blush + gold confetti) — runs when visible
  var petalCanvas = $("#petals");
  var foreverField = null;
  if (petalCanvas) {
    foreverField = makePetalField(petalCanvas, {
      count: prefersReduced ? 16 : 42,
      minR: 5, maxR: 13, minV: 0.6, maxV: 1.8,
      minA: 0.35, maxA: 0.9,
      colors: ["#f7dcdc", "#e9b7bc", "#cf8a92", "#e6cf94", "#ffffff", "#d98f98"],
      sparkleRatio: 0.3
    });
    var foreverSection = $("#scratch");
    if ("IntersectionObserver" in window && foreverSection) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) foreverField.start();
          else foreverField.stop();
        });
      }, { threshold: 0.05 });
      io2.observe(foreverSection);
    } else {
      foreverField.start();
    }
  }

  /* -----------------------------------------------------------------------
     Init on load
     ----------------------------------------------------------------------- */
  window.addEventListener("load", function () {
    ensureHeroPlaying();
    initScratch();
  });

  // Pause music if tab hidden; do not auto-resume (respect user).
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && bgMusic && !bgMusic.paused) {
      // leave playing state intact; browsers usually auto-pause media on hide
    }
  });
})();
