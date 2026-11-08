/* ==========================================================================
   BLACK LIST — main.js
   Components: GrainOverlay · Flash · Sound · FitText · GlitchText · LogoReveal
   (HeroSection) · Scenes (scroll choreography) · ProductTeaser · ManifestoSection
   · LaunchCountdown · EmailCapture · FinalWarning · CustomCursor · Magnetic
   Requires: gsap + ScrollTrigger (optional — the page degrades to static without them)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- setup ---------------- */
  var d = document, root = d.documentElement;
  var DEFAULTS = {
    launchDate: null,
    instagramUrl: "",
    signup: { endpoint: "", format: "json", emailField: "email", headers: {}, extraFields: {}, timeoutMs: 12000 }
  };
  var USER = window.BLACKLIST_CONFIG || {};
  var CFG = Object.assign({}, DEFAULTS, USER, { signup: Object.assign({}, DEFAULTS.signup, USER.signup || {}) });

  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var MOTION = !RM && !!gsap && !!ST;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  root.classList.add("booted");
  if (MOTION) { root.classList.add("motion"); gsap.registerPlugin(ST); }
  else { root.classList.remove("js-intro"); }

  /* ---------------- GrainOverlay ---------------- */
  function GrainOverlay() {
    try {
      var c = d.createElement("canvas"); c.width = c.height = 180;
      var x = c.getContext("2d"), img = x.createImageData(180, 180);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      $(".fx-grain").style.setProperty("--grain", "url(" + c.toDataURL() + ")");
    } catch (e) { /* grain is decorative */ }
  }

  /* ---------------- Flash (strobe-safe: never more than one per 1.4s) ---------------- */
  var flashEl = $(".fx-flash"), lastFlash = -1e9;
  function flash(strength, dur) {
    if (!MOTION) return;
    var now = performance.now();
    if (now - lastFlash < 1400) return;
    lastFlash = now;
    gsap.fromTo(flashEl, { opacity: strength || 0.85 }, { opacity: 0, duration: dur || 0.4, ease: "power3.out", overwrite: true });
  }

  /* ---------------- Sound (opt-in only, Web Audio, no files) ---------------- */
  var Sound = (function () {
    var ctx = null, master = null, on = false;
    var btn = $("#sound-toggle"), txt = btn ? $(".bar__btn-text", btn) : null;
    function ensure() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.7;
        var comp = ctx.createDynamicsCompressor();
        master.connect(comp); comp.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function noise(len, decay) {
      var n = Math.floor(ctx.sampleRate * len), buf = ctx.createBuffer(1, n, ctx.sampleRate), ch = buf.getChannelData(0);
      for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
      var src = ctx.createBufferSource(); src.buffer = buf; return src;
    }
    function impact(level) {
      if (!on || !ensure()) return;
      level = level || 1;
      var t = ctx.currentTime + 0.01;
      // body: pitched-down sine through soft clipping
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.1);
      var sh = ctx.createWaveShaper(), curve = new Float32Array(1024);
      for (var i = 0; i < 1024; i++) { var xx = i * 2 / 1024 - 1; curve[i] = Math.tanh(3 * xx); }
      sh.curve = curve;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * level, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o.connect(sh); sh.connect(g); g.connect(master); o.start(t); o.stop(t + 1.6);
      // sub
      var sub = ctx.createOscillator(); sub.type = "sine";
      sub.frequency.setValueAtTime(48, t); sub.frequency.exponentialRampToValueAtTime(27, t + 1.4);
      var sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.7 * level, t + 0.03); sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      sub.connect(sg); sg.connect(master); sub.start(t); sub.stop(t + 1.9);
      // transient
      var ns = noise(0.35, 3), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
      var ng = ctx.createGain(); ng.gain.value = 0.5 * level;
      ns.connect(lp); lp.connect(ng); ng.connect(master); ns.start(t);
    }
    function glitch() {
      if (!on || !ensure()) return;
      var t = ctx.currentTime + 0.005, ns = noise(0.07, 1), hp = ctx.createBiquadFilter();
      hp.type = "bandpass"; hp.frequency.value = rand(1800, 4200); hp.Q.value = 2;
      var g = ctx.createGain(); g.gain.value = 0.08;
      ns.connect(hp); hp.connect(g); g.connect(master); ns.start(t);
    }
    function set(v) {
      on = v;
      if (btn) btn.setAttribute("aria-pressed", String(v));
      if (txt) txt.textContent = v ? "Sound on" : "Sound off";
    }
    if (btn) btn.addEventListener("click", function () { set(!on); if (on) { ensure(); impact(0.9); } });
    return { impact: impact, glitch: glitch };
  })();

  /* ---------------- FitText: each .fit fills its line exactly ---------------- */
  function fitAll() {
    $$(".fit").forEach(function (el) {
      var w = el.parentElement.clientWidth;
      if (!w) return;
      el.style.fontSize = "100px";
      var nw = el.offsetWidth;
      if (nw) el.style.fontSize = (100 * w / nw * 0.995).toFixed(2) + "px";
    });
  }

  /* ---------------- GlitchText ---------------- */
  var Glitch = { hit: function () {} };
  function GlitchText() {
    var els = $$("[data-glitch]");
    els.forEach(function (el) { el.setAttribute("data-text", el.textContent); });
    if (!MOTION) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    });
    els.forEach(function (el) { io.observe(el); });
    function hit(el, kind) {
      if (!kind) {
        var pool = el.classList.contains("fit--box") ? ["glitch", "gone"] : ["glitch", "glitch", "gone", "invert"];
        kind = pool[(Math.random() * pool.length) | 0];
      }
      var cls = { glitch: "is-glitching", gone: "is-gone", invert: "is-inverted" }[kind];
      el.classList.add(cls);
      setTimeout(function () { el.classList.remove(cls); }, kind === "gone" ? 200 : kind === "invert" ? 380 : 330);
      if (kind === "glitch") Sound.glitch();
    }
    (function loop() {
      var arr = Array.from(visible);
      if (arr.length && !d.hidden) hit(arr[(Math.random() * arr.length) | 0]);
      setTimeout(loop, rand(1400, 3200));
    })();
    Glitch.hit = hit;
  }

  /* ---------------- LogoReveal / HeroSection ---------------- */
  function LogoReveal() {
    var wrap = $("#logo-reveal");
    if (!MOTION) { wrap.setAttribute("aria-label", "BLACK LIST"); wrap.tabIndex = -1; return; }
    var black = $(".logo-reveal__black"), list = $(".logo-reveal__list");
    var ga = $(".logo-reveal__ghost--a"), gb = $(".logo-reveal__ghost--b"), line = $(".logo-reveal__line");
    var introEls = $$("[data-intro]"), bar = $(".bar");
    var LIST_IN = 23.15; // % from the right where the handwritten "list" begins in the asset
    var busy = false;

    function ghostBurst(tl, at, n, amp, withBlack) {
      for (var i = 0; i < n; i++) {
        var t = at + i * 0.055;
        if (withBlack) {
          var top = rand(0, 70), bot = rand(0, 100 - top - 10);
          tl.set(black, { opacity: 1, x: rand(-amp, amp), clipPath: "inset(" + top + "% 0% " + bot + "% 0%)" }, t);
        }
        tl.set(ga, { opacity: 0.95, x: rand(-amp * 1.6, amp * 1.6), clipPath: "inset(" + rand(0, 60) + "% 0% " + rand(0, 30) + "% 0%)" }, t);
        tl.set(gb, { opacity: 0.7, x: rand(-amp, amp), clipPath: "inset(" + rand(20, 80) + "% 0% " + rand(0, 15) + "% 0%)" }, t);
      }
      var end = at + n * 0.055;
      tl.set([ga, gb], { opacity: 0, x: 0, clipPath: "inset(0% 0% 0% 0%)" }, end);
      if (withBlack) tl.set(black, { x: 0, clipPath: "inset(0% 0% 0% 0%)" }, end);
      return end;
    }
    function distort(tl, at) {
      ghostBurst(tl, at, 5, 34, false);
      tl.to(wrap, {
        keyframes: [
          { x: -14, skewX: -9, scale: 1.05, duration: 0.05 },
          { x: 13, skewX: 7, scaleY: 0.9, duration: 0.05 },
          { x: -8, skewX: -3, scaleY: 1.07, duration: 0.05 },
          { x: 6, skewX: 2, duration: 0.05 },
          { x: 0, skewX: 0, scale: 1, scaleY: 1, duration: 0.55, ease: "expo.out" }
        ]
      }, at);
      tl.call(function () { Sound.impact(1); flash(0.35, 0.3); }, null, at + 0.2);
      return at + 0.75;
    }

    function finishIntro() {
      if (!root.classList.contains("js-intro")) return;
      gsap.set([black, list, bar].concat(introEls), { opacity: 1, clearProps: "transform,clipPath" });
      gsap.set(wrap, { clearProps: "transform" });
      root.classList.remove("js-intro");
      ["keydown", "pointerdown", "wheel", "touchstart"].forEach(function (ev) { removeEventListener(ev, skip); });
      ST.refresh();
    }
    var intro;
    function skip(e) {
      if (e && e.type === "keydown" && e.key === "Tab") return;
      if (intro) intro.progress(1);
      finishIntro();
    }

    // Intro sequence
    if (root.classList.contains("js-intro")) {
      if (!location.hash) { try { history.scrollRestoration = "manual"; } catch (e) {} window.scrollTo(0, 0); }
      var tl = intro = gsap.timeline({ onComplete: finishIntro });
      tl.set([black, list, bar].concat(introEls), { opacity: 0 });
      // 1. black silence, 2. horizontal white flash
      tl.fromTo(line, { scaleX: 0, opacity: 1, height: 2, marginTop: -1 }, { scaleX: 1, duration: 0.22, ease: "expo.out" }, 0.45);
      tl.call(function () { flash(0.5, 0.35); }, null, 0.62);
      tl.to(line, { height: "28vh", marginTop: "-14vh", opacity: 0, duration: 0.3, ease: "power2.in" }, 0.66);
      // 3. BLACK glitches into view
      var at = ghostBurst(tl, 0.95, 9, 26, true);
      tl.set(black, { opacity: 1 }, at);
      // 4. "list" is written on — uneven, hand-speed reveal
      tl.set(list, { opacity: 1, clipPath: "inset(0% " + LIST_IN + "% 0% 0%)", rotate: -3, transformOrigin: "88% 60%" }, at + 0.06);
      tl.to(list, {
        keyframes: [
          { clipPath: "inset(0% 18.5% 0% 0%)", duration: 0.09 },
          { clipPath: "inset(0% 16.8% 0% 0%)", duration: 0.05 },
          { clipPath: "inset(0% 11.5% 0% 0%)", duration: 0.09 },
          { clipPath: "inset(0% 8.2% 0% 0%)", duration: 0.11 },
          { clipPath: "inset(0% 3.4% 0% 0%)", duration: 0.07 },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.08 }
        ], ease: "none"
      }, at + 0.06);
      tl.to(list, { rotate: 0, duration: 0.5, ease: "expo.out" }, at + 0.3);
      // 5. distort, shake, snap (+ impact if sound is on)
      at = distort(tl, at + 0.62);
      // reveal the rest
      tl.fromTo(introEls, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "expo.out" }, at - 0.3);
      tl.to(bar, { opacity: 1, duration: 0.4 }, at);
      ["keydown", "pointerdown", "wheel", "touchstart"].forEach(function (ev) { addEventListener(ev, skip, { passive: true }); });
    }

    // Replay on click
    wrap.addEventListener("click", function () {
      if (busy || root.classList.contains("js-intro")) return;
      busy = true;
      var tl = gsap.timeline({ onComplete: function () { busy = false; } });
      var at = ghostBurst(tl, 0, 6, 22, true);
      distort(tl, at);
    });

    // Idle micro-glitch while the hero is on screen
    var heroOn = true;
    new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; }).observe(wrap);
    (function idle() {
      setTimeout(function () {
        if (heroOn && !busy && !d.hidden && !root.classList.contains("js-intro")) {
          var tl = gsap.timeline(); ghostBurst(tl, 0, 4, 14, Math.random() > 0.5);
        }
        idle();
      }, rand(5200, 9800));
    })();
  }

  /* ---------------- Scenes: scroll choreography ---------------- */
  function Scenes() {
    if (!MOTION) return;

    // SHOUT — lines slam up from their masks
    $$(".shout .line > .fit").forEach(function (el) {
      gsap.from(el, { yPercent: 108, skewY: 7, duration: 0.75, ease: "expo.out", scrollTrigger: { trigger: el.parentElement, start: "top 90%" } });
    });

    // SILENCE — one line, a pause, then the answer
    gsap.from(".silence__a", { opacity: 0, duration: 1, scrollTrigger: { trigger: ".silence", start: "top 60%" } });
    gsap.from(".silence__b", { opacity: 0, y: 24, duration: 0.5, delay: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".silence", start: "top 60%" } });

    // EVIDENCE
    gsap.from(".evidence__title", { yPercent: 40, opacity: 0, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: ".evidence__head", start: "top 85%" } });
    $$(".ev").forEach(function (ev, i) {
      var frame = $(".ev__frame", ev), img = $("img", ev);
      gsap.timeline({
        scrollTrigger: {
          trigger: ev, start: "top 86%",
          onEnter: function () { if (i === 2 || i === 4) flash(0.4, 0.3); }
        }
      })
        .fromTo(frame, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" })
        .fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.2, ease: "expo.out" }, 0.15);
    });

    // INTERRUPT — hard cut, rows slam in
    gsap.from(".interrupt__row", {
      xPercent: function (i) { return i % 2 ? 30 : -30; }, skewX: -12, opacity: 0, duration: 0.55, stagger: 0.12, ease: "expo.out",
      scrollTrigger: {
        trigger: ".interrupt", start: "top 55%",
        onEnter: function () { Sound.impact(0.6); gsap.fromTo(".interrupt", { backgroundColor: "#000" }, { backgroundColor: "#fff", duration: 0.18, ease: "steps(1)" }); }
      }
    });

    // MANIFESTO — pinned, scrubbed, abrupt cuts between statements
    ManifestoSection();

    // COUNTDOWN
    gsap.from(".count__title", { yPercent: 60, opacity: 0, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: ".count", start: "top 80%" } });
    gsap.from(".count__unit", { y: 40, opacity: 0, duration: 0.7, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".count__clock", start: "top 85%" } });

    // WARNED
    gsap.from(".warned .fit", {
      yPercent: 110, duration: 0.6, stagger: 0.14, ease: "expo.out",
      scrollTrigger: { trigger: ".warned", start: "top 70%", onEnter: function () { flash(0.8, 0.35); Sound.impact(0.7); } }
    });

    // SIGNUP
    gsap.from(".signup__copy > *", { y: 30, opacity: 0, duration: 0.7, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".signup", start: "top 75%" } });

    // FINAL
    FinalWarning();
  }

  /* ---------------- ManifestoSection ---------------- */
  function ManifestoSection() {
    gsap.set([".m2", ".m3"], { autoAlpha: 0 });
    var tl = gsap.timeline({
      scrollTrigger: { trigger: ".manifesto", start: "top top", end: "+=280%", pin: ".manifesto__stage", scrub: 0.5, anticipatePin: 1 }
    });
    tl.from(".m1", { yPercent: 25, autoAlpha: 0, duration: 1, ease: "power2.out" })
      .to({}, { duration: 0.9 })
      .set(".m1", { autoAlpha: 0 })
      .call(function () { flash(0.85, 0.35); Sound.impact(0.9); })
      .fromTo(".m2", { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power4.in" })
      .to({}, { duration: 1 })
      .set(".m2", { autoAlpha: 0 })
      .set(".m3", { autoAlpha: 1 })
      .from(".m3__line", { autoAlpha: 0, y: 30, duration: 0.6, stagger: 0.55 })
      .from(".m3__welcome", { autoAlpha: 0, scale: 1.35, duration: 0.5, ease: "power4.in" }, "+=0.35")
      .call(function () { Sound.impact(0.7); })
      .to({}, { duration: 1.1 });
  }

  /* ---------------- FinalWarning ---------------- */
  function FinalWarning() {
    var logo = $(".final__logo");
    gsap.timeline({ scrollTrigger: { trigger: ".final", start: "top 60%" } })
      .from(logo, { opacity: 0, scale: 0.9, duration: 0.9, ease: "expo.out" })
      .to(logo, { keyframes: [{ x: -10, skewX: -8, duration: 0.05 }, { x: 8, skewX: 5, duration: 0.05 }, { x: 0, skewX: 0, duration: 0.4, ease: "expo.out" }] }, 0.5)
      .from(".final__a", { opacity: 0, y: 16, duration: 0.6, ease: "expo.out" }, 0.7)
      .from(".final__b", { opacity: 0, y: 24, duration: 0.6, ease: "expo.out" }, 1.4);
  }

  /* ---------------- Marquee: skews with scroll velocity ---------------- */
  function Marquee() {
    if (!MOTION) return;
    var items = $$(".marquee__item"), timer;
    var skewTo = gsap.quickTo(items, "skewX", { duration: 0.4, ease: "power3" });
    ST.create({
      onUpdate: function (self) {
        skewTo(gsap.utils.clamp(-14, 14, self.getVelocity() / -260));
        clearTimeout(timer); timer = setTimeout(function () { skewTo(0); }, 120);
      }
    });
  }

  /* ---------------- ProductTeaser ---------------- */
  function ProductTeaser() {
    var evs = $$(".ev"), clocks = $$(".ev__clock");
    var pad = function (n) { return String(n).padStart(2, "0"); };
    function tick() {
      var t = new Date(), s = pad(t.getHours()) + ":" + pad(t.getMinutes()) + ":" + pad(t.getSeconds());
      clocks.forEach(function (c) { c.textContent = s; });
    }
    tick(); setInterval(tick, 1000);

    $$(".ev--corrupt").forEach(function (ev) {
      var img = $("img", ev);
      var set = function () { ev.style.setProperty("--src", 'url("' + (img.currentSrc || img.src) + '")'); };
      if (img.complete) set(); else img.addEventListener("load", set, { once: true });
    });

    // Touch + keyboard: toggle the designation panel
    evs.forEach(function (ev) {
      ev.addEventListener("click", function () { if (!FINE) ev.classList.toggle("is-open"); });
      ev.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ev.classList.toggle("is-open"); }
      });
    });

    if (!MOTION) return;

    function tear(ev, times) {
      var tears = $$(".ev__tear", ev);
      (function once(n) {
        tears.forEach(function (t) {
          var top = rand(5, 85), h = rand(3, 12);
          t.style.clipPath = "inset(" + top + "% 0% " + Math.max(0, 100 - top - h) + "% 0%)";
          t.style.transform = "translateX(" + rand(-10, 10) + "%)";
        });
        ev.classList.add("is-tearing");
        setTimeout(function () {
          ev.classList.remove("is-tearing");
          if (n > 1) setTimeout(function () { once(n - 1); }, 220);
        }, 160);
      })(times || 1);
    }

    // Hover: displacement distortion + zoom snap
    var disp = $("#bl-distort feDisplacementMap");
    if (FINE) evs.forEach(function (ev) {
      var img = $("img", ev);
      ev.addEventListener("pointerenter", function () {
        img.style.filter = "url(#bl-distort) contrast(1.05)";
        gsap.fromTo(disp, { attr: { scale: 70 } }, { attr: { scale: 0 }, duration: 0.6, ease: "expo.out", onComplete: function () { img.style.filter = ""; } });
        gsap.fromTo(img, { scale: 1.07 }, { scale: 1, duration: 0.55, ease: "expo.out" });
        Sound.glitch();
      });
    });

    // Ambient: flicker / zoom-snap / tear on whatever is on screen
    var vis = new Set();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) vis.add(e.target); else vis.delete(e.target); });
    }, { threshold: 0.35 });
    evs.forEach(function (ev) { io.observe(ev); });
    (function loop() {
      var arr = Array.from(vis);
      if (arr.length && !d.hidden) {
        var ev = arr[(Math.random() * arr.length) | 0], r = Math.random();
        if (ev.classList.contains("ev--corrupt") && r < 0.6) tear(ev, 2);
        else if (r < 0.55) { ev.classList.add("is-flicker"); setTimeout(function () { ev.classList.remove("is-flicker"); }, 220); }
        else gsap.fromTo($("img", ev), { scale: 1.09 }, { scale: 1, duration: 0.45, ease: "expo.out" });
      }
      setTimeout(loop, rand(1700, 3800));
    })();
  }

  /* ---------------- LaunchCountdown ---------------- */
  function LaunchCountdown() {
    var nums = { d: $('[data-unit="d"]'), h: $('[data-unit="h"]'), m: $('[data-unit="m"]'), s: $('[data-unit="s"]') };
    var status = $("#count-status"), clock = $("#count-clock");
    var raw = CFG.launchDate;
    try { var q = new URLSearchParams(location.search).get("launch"); if (q) raw = q; } catch (e) {}
    var target = raw ? Date.parse(raw) : NaN;

    if (isNaN(target)) {
      Object.keys(nums).forEach(function (k) { nums[k].textContent = "00"; nums[k].classList.add("is-redacted"); nums[k].setAttribute("aria-hidden", "true"); });
      clock.setAttribute("aria-label", "Launch date classified");
      status.hidden = false; status.textContent = "The date is classified.";
      return;
    }
    var prev = {}, timer;
    function render() {
      var diff = Math.max(0, target - Date.now()), s = Math.floor(diff / 1000);
      var v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
      Object.keys(v).forEach(function (k) {
        var str = String(v[k]).padStart(2, "0");
        if (prev[k] !== str) {
          nums[k].textContent = str;
          if (MOTION && prev[k] !== undefined) { nums[k].classList.remove("tick"); void nums[k].offsetWidth; nums[k].classList.add("tick"); }
          prev[k] = str;
        }
      });
      clock.setAttribute("aria-label", v.d + " days, " + v.h + " hours, " + v.m + " minutes until launch");
      if (diff <= 0) { status.hidden = false; status.textContent = "It's here. The damage is done."; clearInterval(timer); }
    }
    render(); timer = setInterval(render, 1000);
  }

  /* ---------------- EmailCapture ---------------- */
  function EmailCapture() {
    var form = $("#signup-form"), input = $("#signup-email"), consent = $("#signup-consent"), hp = $("#signup-company");
    var btn = $("#signup-submit"), msg = $("#signup-msg");
    var view = $('[data-state-view="form"]'), done = $('[data-state-view="done"]');
    var RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, inflight = false;

    function say(t, err) { msg.textContent = t; msg.classList.toggle("is-error", !!err); }
    function invalid(t, el) { (el || input).setAttribute("aria-invalid", "true"); say(t, true); (el || input).focus(); }
    function showDone(already) {
      if (already) {
        $(".form__done-title").textContent = "You're already on the list.";
        $(".form__done-sub").textContent = "We heard you the first time. Sit tight.";
      }
      view.hidden = true; done.hidden = false; done.focus();
      if (MOTION) { gsap.from(done, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.6, ease: "expo.out" }); flash(0.5, 0.3); }
      Sound.impact(0.6);
    }

    input.addEventListener("input", function () { if (input.hasAttribute("aria-invalid")) { input.removeAttribute("aria-invalid"); say(""); } });
    consent.addEventListener("change", function () { consent.removeAttribute("aria-invalid"); if (msg.classList.contains("is-error")) say(""); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (inflight) return;
      var email = input.value.trim().toLowerCase();
      if (!email) return invalid("Type an email first. That's all we need.");
      if (email.length > 254 || !RE.test(email)) return invalid("That's not an email address. Check it and try again.");
      if (!consent.checked) return invalid("Tick the box so we're allowed to email you.", consent);
      if (hp.value) return; // bot
      if (store.get("bl:listed") === email) return showDone(true);

      var S = CFG.signup;
      if (!S.endpoint) { say("Signup isn't connected yet, so nothing was saved. Try again soon.", true); return; }

      inflight = true; btn.disabled = true; form.classList.add("is-loading"); form.setAttribute("aria-busy", "true");
      say("Transmitting");

      var payload = Object.assign({}, S.extraFields);
      payload[S.emailField] = email;
      payload.consent = true;
      payload.consentText = $(".form__consent-text").textContent.trim();
      payload.consentAt = new Date().toISOString();

      var headers = Object.assign({ Accept: "application/json" }, S.headers), body;
      if (S.format === "form") {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(Object.keys(payload).map(function (k) { return [k, String(payload[k])]; })).toString();
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(payload);
      }
      var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, S.timeoutMs || 12000);

      fetch(S.endpoint, { method: "POST", headers: headers, body: body, signal: ctrl.signal, credentials: "omit" })
        .then(function (res) {
          if (res.status === 409) { store.set("bl:listed", email); say(""); showDone(true); return; }
          if (!res.ok) {
            if (res.status === 400 || res.status === 422) say("That email was rejected. Check it and try again.", true);
            else if (res.status === 429) say("Too many attempts. Wait a minute, then try again.", true);
            else say("Something broke on our side and nothing was saved. Try again in a minute.", true);
            return;
          }
          // Some providers answer 200 with an error body — don't trust the status alone.
          return res.text().then(function (txt) {
            var data = null; try { data = txt ? JSON.parse(txt) : null; } catch (err) { data = null; }
            if (data && (data.ok === false || data.success === false || data.error || data.errors)) {
              say("Your email wasn't accepted, so nothing was saved. Check it and try again.", true); return;
            }
            store.set("bl:listed", email); say(""); showDone(false);
          });
        })
        .catch(function (err) {
          say(err && err.name === "AbortError" ? "The request timed out and nothing was saved. Try again." : "Couldn't reach the server, so nothing was saved. Check your connection and try again.", true);
        })
        .then(function () {
          clearTimeout(to); inflight = false; btn.disabled = false;
          form.classList.remove("is-loading"); form.removeAttribute("aria-busy");
        });
    });
  }

  /* ---------------- Footer: Instagram from config ---------------- */
  function Footer() {
    var el = $("#foot-ig"), url = String(CFG.instagramUrl || "").trim();
    if (!/^https:\/\//i.test(url)) return;
    var svg = $("svg", el), a = d.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.setAttribute("aria-label", "BLACK LIST on Instagram (opens in a new tab)");
    a.appendChild(svg);
    var s = d.createElement("span"); s.className = "mono"; s.textContent = "Instagram"; a.appendChild(s);
    el.textContent = ""; el.appendChild(a);
  }

  /* ---------------- CustomCursor ---------------- */
  function CustomCursor() {
    if (!FINE) return;
    root.classList.add("has-cursor");
    var c = $(".cursor"), lbl = $(".cursor__label");
    var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, moved = false;
    addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY;
      if (!moved) { moved = true; cx = x; cy = y; c.style.opacity = "1"; }
      if (RM) c.style.transform = "translate(" + x + "px," + y + "px)";
    }, { passive: true });
    if (!RM) (function raf() {
      cx += (x - cx) * 0.24; cy += (y - cy) * 0.24;
      c.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      requestAnimationFrame(raf);
    })();
    d.addEventListener("pointerover", function (e) {
      var t = e.target.closest ? e.target.closest("[data-cursor], a, button, label") : null;
      c.classList.toggle("is-big", !!(t && t.dataset.cursor));
      c.classList.toggle("is-mid", !!(t && !t.dataset.cursor));
      lbl.textContent = t && t.dataset.cursor ? t.dataset.cursor : "";
    });
    d.documentElement.addEventListener("pointerleave", function () { c.style.opacity = "0"; });
    d.documentElement.addEventListener("pointerenter", function () { if (moved) c.style.opacity = "1"; });
  }

  /* ---------------- Magnetic CTA ---------------- */
  function Magnetic() {
    if (!FINE || !MOTION) return;
    $$(".magnetic").forEach(function (el) {
      var kids = Array.from(el.children);
      var xTo = gsap.quickTo(kids, "x", { duration: 0.5, ease: "power3" }), yTo = gsap.quickTo(kids, "y", { duration: 0.5, ease: "power3" });
      var sx = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        xTo(dx * 0.22); yTo(dy * 0.3); sx(dx * 0.05);
      });
      el.addEventListener("pointerleave", function () { xTo(0); yTo(0); sx(0); });
    });
  }

  /* ---------------- boot ---------------- */
  GrainOverlay();
  fitAll();
  GlitchText();
  Footer();
  CustomCursor();
  LaunchCountdown();
  EmailCapture();
  ProductTeaser();
  if (MOTION) {
    ST.addEventListener("refreshInit", fitAll);
    LogoReveal();
    Scenes();
    Marquee();
    Magnetic();
  } else {
    LogoReveal();
    var rz; addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(fitAll, 120); });
  }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { fitAll(); if (MOTION) ST.refresh(); });
})();
