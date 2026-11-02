/* Platform behaviour: navigation, reveal-on-scroll, case-study TOC, copy actions. */
(function () {
  "use strict";

  var doc = document;
  var header = doc.querySelector(".site-header");
  var toggle = doc.querySelector(".menu-toggle");
  var links = doc.querySelector(".nav-links");

  /* Header state on scroll */
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("is-open", !open);
    });

    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("is-open");
      }
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && links.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("is-open");
        toggle.focus();
      }
    });
  }

  /* Reveal on scroll */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealItems = doc.querySelectorAll(".reveal");
  if (revealItems.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      revealItems.forEach(function (el) { observer.observe(el); });
    }
  }

  /* Case-study table of contents */
  var tocLinks = Array.prototype.slice.call(doc.querySelectorAll(".toc-link"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var sections = tocLinks.map(function (link) {
      var id = link.getAttribute("href");
      return id && id.charAt(0) === "#" ? doc.querySelector(id) : null;
    }).filter(Boolean);

    if (sections.length) {
      var active = null;
      var initial = location.hash ? tocLinks.filter(function (link) {
        return link.getAttribute("href") === location.hash;
      })[0] : null;
      (initial || tocLinks[0]).classList.add("is-active");

      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = "#" + entry.target.id;
          if (active === id) return;
          active = id;
          tocLinks.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("href") === id);
          });
        });
      }, { rootMargin: "-18% 0px -65% 0px", threshold: 0 });
      sections.forEach(function (section) { spy.observe(section); });
    }
  }

  /* Copy-to-clipboard (email) */
  doc.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var value = button.getAttribute("data-copy");
      var original = button.getAttribute("data-label") || button.textContent;
      if (!value) return;
      var done = function () {
        button.textContent = "Copied";
        window.setTimeout(function () { button.textContent = original; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(function () {});
      } else {
        var temp = doc.createElement("textarea");
        temp.value = value;
        temp.setAttribute("readonly", "");
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        doc.body.appendChild(temp);
        temp.select();
        try { doc.execCommand("copy"); done(); } catch (e) {}
        doc.body.removeChild(temp);
      }
    });
  });

  /* Stagger: neighbours in the same container enter one after another */
  revealItems.forEach(function (el) {
    if (!el.parentElement) return;
    var siblings = Array.prototype.filter.call(el.parentElement.children, function (node) {
      return node.classList && node.classList.contains("reveal");
    });
    var index = siblings.indexOf(el);
    if (index > 0) el.style.setProperty("--d", String(Math.min(index, 6)));
  });

  /* Theme toggle. The pages hardcode data-theme="light" as the default;
     a visitor who toggles dark has that choice re-applied before first
     meaningful paint. */
  var root = doc.documentElement;
  try {
    var storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      root.setAttribute("data-theme", storedTheme);
    }
  } catch (e) {}
  var themeToggle = doc.querySelector(".theme-toggle");
  var themeMeta = doc.querySelector('meta[name="theme-color"]');

  function syncThemeUi() {
    var light = root.getAttribute("data-theme") === "light";
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      themeToggle.setAttribute("aria-pressed", String(light));
    }
    if (themeMeta) themeMeta.setAttribute("content", light ? "#f6f7f9" : "#030308");
  }

  syncThemeUi();

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncThemeUi();
    });
  }

  /* The path: draw the rail as far as the reader has scrolled */
  var path = doc.querySelector(".path");
  var pathLine = path ? path.querySelector(".path-line") : null;
  if (path && pathLine) {
    var updatePath = function () {
      var rect = path.getBoundingClientRect();
      var trigger = window.innerHeight * 0.62;
      var progress = (trigger - rect.top) / rect.height;
      progress = Math.max(0, Math.min(1, progress));
      pathLine.style.setProperty("--path-progress", progress.toFixed(3));
    };
    window.addEventListener("scroll", updatePath, { passive: true });
    window.addEventListener("resize", updatePath);
    updatePath();
  }

  /* Hero typewriter */
  var typeTarget = doc.querySelector(".type-target");
  if (typeTarget) {
    var typed = [];
    try { typed = JSON.parse(typeTarget.getAttribute("data-words") || "[]"); } catch (e) { typed = []; }
    if (typed.length) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        typeTarget.textContent = typed[0];
      } else {
        typeTarget.textContent = "";
        var wordIndex = 0;
        var charIndex = 0;
        var deleting = false;
        var step = function () {
          var word = typed[wordIndex];
          if (!deleting) {
            charIndex += 1;
            typeTarget.textContent = word.slice(0, charIndex);
            if (charIndex === word.length) {
              deleting = true;
              window.setTimeout(step, 1900);
              return;
            }
          } else {
            charIndex -= 1;
            typeTarget.textContent = word.slice(0, charIndex);
            if (charIndex === 0) {
              deleting = false;
              wordIndex = (wordIndex + 1) % typed.length;
              window.setTimeout(step, 320);
              return;
            }
          }
          window.setTimeout(step, deleting ? 38 : 62);
        };
        window.setTimeout(step, 800);
      }
    }
  }

  /* Current year */
  doc.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();

/* ---------------------------------------------------------------------
   CV-HUD cursor: object-detection framing for the pointer.
   A bounding box tracks the cursor; hovering project cards / modules
   locks the box onto the element like a tracked object. Runs in both
   themes (palette per theme), fine pointers only, disabled under
   prefers-reduced-motion.
   --------------------------------------------------------------------- */
(function () {
  if (!window.matchMedia) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var box = document.createElement("div");
  var dot = document.createElement("div");
  var tag = document.createElement("div");
  box.className = "cv-box";
  dot.className = "cv-dot";
  tag.className = "cv-tag";
  document.body.appendChild(box);
  document.body.appendChild(dot);
  document.body.appendChild(tag);

  var els = [box, dot, tag];

  /* [selector, class label, confidence, lock onto element] */
  var CLASSES = [
    [".work-card", "project", 0.97, true],
    [".next-project", "next_case", 0.95, true],
    [".metric-card, .decision, .flow-node, .mini-card, .contact-card", "module", 0.92, true],
    [".callout", "note", 0.91, true],
    [".btn, button, .theme-toggle, .menu-toggle", "control", 0.96, false],
    ["a", "link", 0.93, false],
    [".chip", "label", 0.94, false]
  ];

  function classify(node) {
    for (var i = 0; i < CLASSES.length; i++) {
      var el = node && node.closest ? node.closest(CLASSES[i][0]) : null;
      if (el) return { el: el, cls: CLASSES[i][1], conf: CLASSES[i][2], locked: CLASSES[i][3] };
    }
    return { el: null, cls: "visitor", conf: 0.99, locked: false };
  }

  var cx = 0, cy = 0, raf = 0, everMoved = false;

  function frame() {
    raf = 0;
    var hit = classify(document.elementFromPoint(cx, cy) || document.body);
    var bx, by, w, h;
    if (hit.locked) {
      var r = hit.el.getBoundingClientRect();
      bx = r.left - 6; by = r.top - 6; w = r.width + 12; h = r.height + 12;
      box.classList.add("is-locked");
    } else {
      bx = cx - 22; by = cy - 22; w = 44; h = 44;
      box.classList.remove("is-locked");
    }
    var conf = Math.max(0.4, hit.conf - Math.random() * 0.025).toFixed(2);
    tag.textContent = 'class: "' + hit.cls + '"  conf: ' + conf;
    var hot = hit.cls === "link" || hit.cls === "control";
    tag.classList.toggle("is-hot", hot);
    box.classList.toggle("is-hot", hot);
    box.style.width = w + "px";
    box.style.height = h + "px";
    box.style.transform = "translate(" + bx + "px," + by + "px)";
    dot.style.transform = "translate(" + cx + "px," + cy + "px)";
    tag.style.transform = "translate(" + (cx + 26) + "px," + (cy - 28) + "px)";
  }

  function show() {
    if (!everMoved) {
      everMoved = true;
      els.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  function sync() {
    els.forEach(function (el) { el.classList.toggle("is-visible", everMoved); });
    if (everMoved && !raf) raf = requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", function (e) {
    cx = e.clientX; cy = e.clientY;
    show();
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });

  document.addEventListener("mouseleave", function () {
    everMoved = false;
    els.forEach(function (el) { el.classList.remove("is-visible"); });
    document.body.classList.remove("cv-hud-on");
  });

})();

/* ---------------------------------------------------------------------
   Background scene: a neural-network synapse field behind the whole
   site (glowing nodes and links, cursor-reactive, ported from the
   helper portfolio's neural canvas). The kept floating items are drawn
   over it, still read through the computer-vision overlay: the star
   with its two planets and moons pinned to the top-left (dark theme),
   the floating alien in the bottom-right corner, and the astronaut.
   Nothing follows the cursor except the synapse field itself.
   Runs in both themes with a per-theme palette; static single frame
   under reduced motion.
   --------------------------------------------------------------------- */
(function () {
  if (!window.matchMedia) return;

  var root = document.documentElement;
  function lightOn() { return root.getAttribute("data-theme") === "light"; }

  var canvas = document.createElement("canvas");
  canvas.className = "space-canvas";
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var w = 0, h = 0, raf = 0;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initNeural();
    if (!raf) { render(false); }
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  /* 1. Starfield */
  var stars = [];
  for (var i = 0; i < 150; i++) {
    stars.push({
      x: rand(0, 1), y: rand(0, 1),
      radius: Math.random() * 1.2 + 0.1,
      opacity: Math.random() * 0.5 + 0.2,
      speedY: Math.random() * 0.08 + 0.02,
      twinkleSpeed: Math.random() * 0.04 + 0.008,
      twinklePhase: Math.random() * Math.PI
    });
  }

  /* 2. Neural synapse field (port of the helper portfolio's neural
     canvas): drifting glowing nodes that link up when close and
     scatter from the cursor. */
  var neural = [];
  var mouse = { x: -9999, y: -9999, radius: 150 };

  function initNeural() {
    neural = [];
    var count = Math.min(80, Math.max(35, Math.floor((w * h) / 18000)));
    for (var n = 0; n < count; n++) {
      neural.push({
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-0.4, 0.4),
        vy: rand(-0.4, 0.4),
        radius: rand(1, 3),
        color: Math.random() > 0.3 ? "#00f2fe" : "#9d4edd"
      });
    }
  }

  /* 3. The star and its planets, pinned to the top-left of the screen.
     Orbit radii scaled down so the system sits inside the corner. */
  var planets = [
    { radius: 60, speed: 0.004,  angle: Math.random() * 10, size: 6, color: "#ff007f",  glow: "rgba(255, 0, 127, 0.4)",   moons: [{ orbitRadius: 10, speed: 0.04, angle: 0, size: 1.4, color: "#ffffff" }] },
    { radius: 88, speed: 0.0025, angle: Math.random() * 10, size: 7, color: "#7a22ff",  glow: "rgba(122, 34, 255, 0.4)",  moons: [
      { orbitRadius: 12, speed: 0.03,  angle: 0,        size: 1.8, color: "#a366ff" },
      { orbitRadius: 18, speed: -0.02, angle: Math.PI,  size: 1.1, color: "#ffffff" }
    ] }
  ];

  var nebulae = [
    { x: 0.15, y: 0.25, r: 190, color: "rgba(77, 0, 153, 0.05)" },
    { x: 0.85, y: 0.75, r: 230, color: "rgba(0, 210, 255, 0.04)" }
  ];

  var shockRadius = 25, shockAlpha = 0.3;
  var sunPulse = 25, sunPulseDir = 1;
  var coronaAngle = 0;
  var t = 0;

  /* The pointer only drives the neural field reaction. */
  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener("mouseleave", function () {
    mouse.x = -9999;
    mouse.y = -9999;
  }, { passive: true });

  /* 6. Detector readouts: confidences re-sampled a few times a second
     so the chips read as live inference instead of a static label. */
  var DET = {
    star:  { base: 1.0,  val: "1.00" },
    astro: { base: 0.96, val: "0.96" },
    kite:  { base: 0.94, val: "0.94" },
    alien: { base: 0.93, val: "0.93" }
  };
  var WIND = { base: 3.2, val: "3.2" };
  var DET_BASE = [0.97, 0.94];                  /* per-planet confidence */

  function jitterDets() {
    for (var key in DET) {
      DET[key].val = Math.max(0.4, DET[key].base - Math.random() * 0.045).toFixed(2);
    }
    planets.forEach(function (p, i) {
      p.c = Math.max(0.4, DET_BASE[i] - Math.random() * 0.045).toFixed(2);
    });
    WIND.val = Math.max(1.2, WIND.base + rand(-0.8, 0.8)).toFixed(1);
  }
  jitterDets();

  function step() {
    t++;
    if (t % 12 === 0) jitterDets();

    shockRadius += 1.2;
    shockAlpha -= 0.0018;
    if (shockAlpha <= 0) { shockRadius = 25; shockAlpha = 0.35; }
    sunPulse += 0.15 * sunPulseDir;
    if (sunPulse > 50 || sunPulse < 30) sunPulseDir *= -1;
    coronaAngle += 0.0012;
    /* neural synapse nodes: drift, bounce off the edges, scatter from
       the cursor's 150px influence radius */
    neural.forEach(function (n) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      var mdx = mouse.x - n.x, mdy = mouse.y - n.y;
      var mdist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
      if (mdist < mouse.radius) {
        var force = (mouse.radius - mdist) / mouse.radius;
        n.x -= (mdx / mdist) * force * 3;
        n.y -= (mdy / mdist) * force * 3;
      }
    });
    planets.forEach(function (p) { p.angle += p.speed; });
    planets.forEach(function (p) { p.moons.forEach(function (m) { m.angle += m.speed; }); });
    stars.forEach(function (s) {
      s.y += s.speedY / h;
      s.twinklePhase += s.twinkleSpeed;
      if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
    });
  }



  /* ---- CV overlay: detector brackets, confidence chips, sprites ---- */

  function rr(x, y, rw, rh, r) {
    r = Math.min(r, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
  }

  /* corner-bracket detection box, top-left origin, washed with a light
     tint of the detection colour — same treatment as the .alert-chip
     fill (rgba(colour, ~0.1)) in the case-study visuals */
  function hudBox(bx, by, bw, bh, color) {
    var arm = Math.max(6, Math.min(14, bw * 0.3, bh * 0.3));

    /* light fill of the box's own colour, under the brackets */
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= 0.12;
    ctx.fillRect(bx, by, bw, bh);
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx, by + arm); ctx.lineTo(bx, by); ctx.lineTo(bx + arm, by);
    ctx.moveTo(bx + bw - arm, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + arm);
    ctx.moveTo(bx + bw, by + bh - arm); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - arm, by + bh);
    ctx.moveTo(bx + arm, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - arm);
    ctx.stroke();
  }

  /* label chip in the CV-HUD style */
  function hudChip(x, y, text, color) {
    ctx.font = "9px \"JetBrains Mono\", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    var cw = ctx.measureText(text).width + 10;
    var ch = 14;
    if (x + cw > w - 4) x = Math.max(4, x - cw);
    if (y < 4) y = 4;
    if (y + ch > h - 4) y = h - ch - 4;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = "rgba(3, 3, 8, 0.92)";
    ctx.fillText(text, x + 5, y + ch / 2 + 0.5);
  }

  /* Drifting astronaut: suit, backpack, visor and a slack tether. */
  function drawAstronaut(x, y, rot, alpha) {
    var light = lightOn();
    var suit = light ? {
      /* dark-suit variant so the sprite reads on the pale background */
      tether: "rgba(14, 22, 35, 0.25)",
      legs: "#405268", boots: "#3d4e62",
      arms: "#4d5f75", gloves: "#39495d",
      pack: "#5a6b7d", torso: "#586b81",
      helmet: "#6b7d91"
    } : {
      tether: "rgba(255,255,255,0.16)",
      legs: "#dde5ef", boots: "#8fa0b4",
      arms: "#e6ecf5", gloves: "#cbd6e4",
      pack: "#9fb0c4", torso: "#e9eff7",
      helmet: "#f2f6fb"
    };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = suit.tether;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 3);
    ctx.quadraticCurveTo(-26, 8 + Math.sin(t * 0.05) * 5, -46, 4 + Math.sin(t * 0.05 + 1.4) * 7);
    ctx.stroke();

    /* legs + boots */
    ctx.lineCap = "round";
    ctx.strokeStyle = suit.legs;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-15, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-15, -7); ctx.stroke();
    ctx.fillStyle = suit.boots;
    ctx.beginPath(); ctx.arc(-16.5, 9, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-16.5, -8, 2.8, 0, Math.PI * 2); ctx.fill();

    /* arms + gloves */
    ctx.strokeStyle = suit.arms;
    ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(3, -5); ctx.lineTo(9, -13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(8, 13); ctx.stroke();
    ctx.fillStyle = suit.gloves;
    ctx.beginPath(); ctx.arc(10, -14.5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 14.5, 2.6, 0, Math.PI * 2); ctx.fill();

    /* life-support backpack */
    ctx.fillStyle = suit.pack;
    rr(-7, 6, 15, 5.5, 2.5);
    ctx.fill();

    /* torso */
    ctx.fillStyle = suit.torso;
    rr(-6, -7.5, 16, 15, 6.5);
    ctx.fill();

    /* chest pack */
    ctx.fillStyle = "#0a1119";
    rr(-1, -4, 7.5, 8.5, 2);
    ctx.fill();
    ctx.fillStyle = "#00d2ff";
    ctx.beginPath(); ctx.arc(4.6, -1.6, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5ad9a6";
    ctx.beginPath(); ctx.arc(4.6, 2.2, 1.2, 0, Math.PI * 2); ctx.fill();

    /* helmet + visor */
    ctx.fillStyle = suit.helmet;
    ctx.beginPath(); ctx.arc(13, 0, 8.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#04070e";
    ctx.beginPath(); ctx.arc(14.4, 0, 5.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,210,255,0.5)";
    ctx.beginPath(); ctx.arc(16.4, -2, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,210,255,0.28)";
    ctx.beginPath(); ctx.arc(15, 2.6, 1, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  /* ---------------- Cast additions ----------------
     The kite owns the top-left corner in light theme, standing in for
     the star system; the alien replaced the binary black holes in
     both themes. */

  /* Kite tethered to the true top-left corner of the viewport. */
  function drawKite() {
    var kx = w * 0.13 + Math.sin(t * 0.0011) * 16;
    var ky = h * 0.165 + Math.sin(t * 0.0016 + 1.1) * 10;
    var krot = 0.18 + Math.sin(t * 0.0013) * 0.12;

    /* slack tether with wind-dependent sag */
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.quadraticCurveTo(kx * 0.55, ky + 26 + Math.sin(t * 0.0009) * 8, kx, ky + 16);
    ctx.strokeStyle = "rgba(20, 34, 52, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(krot);

    /* tail first, under the body */
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(4 + Math.sin(t * 0.002) * 3, 38, -2 + Math.sin(t * 0.002 + 1.5) * 4, 56);
    ctx.strokeStyle = "rgba(20, 34, 52, 0.45)";
    ctx.stroke();
    var bows = [3, 36, 1, 46, -2, 55];
    for (var b = 0; b < 6; b += 2) {
      ctx.beginPath();
      ctx.arc(bows[b], bows[b + 1], 2.2, 0, Math.PI * 2);
      ctx.fillStyle = (b % 4 === 0) ? "rgba(255, 0, 127, 0.75)" : "rgba(0, 210, 255, 0.75)";
      ctx.fill();
    }

    /* diamond kite: dark sail over white spars */
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(11, 0); ctx.lineTo(0, 22); ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(28, 64, 92, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(0, 22);
    ctx.moveTo(-11, 0); ctx.lineTo(11, 0);
    ctx.stroke();
    ctx.restore();

    ctx.globalAlpha = 0.8;
    hudBox(kx - 18, ky - 24, 36, 52, "#7a22ff");
    hudChip(kx - 18, ky - 41, "kite " + DET.kite.val + " · wind " + WIND.val + " m/s", "#7a22ff");
  }

  /* Floating alien head parked where the binary black holes used to
     hover, in the bottom-right corner — both themes' new occupant. */
  function drawAlien() {
    var ax = w - 150, ay = h * 0.76;
    var fx = ax + Math.sin(t * 0.0013) * 14;
    var fy = ay + Math.sin(t * 0.0019 + 0.7) * 10;
    var light = lightOn();
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(t * 0.0011) * 0.16);

    /* antennae with bobbing tips */
    var tipA = Math.sin(t * 0.0028) * 2, tipB = Math.sin(t * 0.0028 + 1.2) * 2;
    ctx.strokeStyle = light ? "rgba(20, 44, 28, 0.9)" : "rgba(159, 230, 173, 0.8)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, -13); ctx.lineTo(-7, -22 + tipA);
    ctx.moveTo(5, -13); ctx.lineTo(7, -22 + tipB);
    ctx.stroke();
    ctx.fillStyle = "#3c9a6e";
    ctx.beginPath(); ctx.arc(-7, -23 + tipA, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -23 + tipB, 2, 0, Math.PI * 2); ctx.fill();

    /* head */
    ctx.fillStyle = "#7fcf8a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    /* big black almond eyes with glints */
    [-1, 1].forEach(function (sx) {
      ctx.save();
      ctx.translate(sx * 5.5, -1);
      ctx.rotate(sx * 0.55);
      ctx.fillStyle = "#0b1c12";
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath(); ctx.arc(sx * 1.2, -0.8, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    /* tiny smile */
    ctx.strokeStyle = "rgba(20, 44, 28, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 7, 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();

    ctx.globalAlpha = 0.8;
    hudBox(fx - 17, fy - 30, 34, 44, "#3c9a6e");
    hudChip(fx - 17, fy - 47, "alien " + DET.alien.val, "#3c9a6e");
  }

  /* What the detector sees in the scene: the star system pinned top-left
     (dark theme), the alien in the bottom-right corner, and the drifting
     astronaut. */
  function drawCvOverlay(cx, cy) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    if (lightOn()) {
      ctx.save();
      drawKite();
      ctx.restore();
    }

    if (!lightOn()) {

    /* planets */
    planets.forEach(function (p) {
      var px = cx + Math.cos(p.angle) * p.radius;
      var py = cy + Math.sin(p.angle) * p.radius;
      var s = (p.size + 7) * 2;
      hudBox(px - s / 2, py - s / 2, s, s, "#00d2ff");
      hudChip(px - s / 2, py - s / 2 - 17, "planet " + p.c, "#00d2ff");
    });

    /* star core */
    hudBox(cx - 34, cy - 34, 68, 68, "#ffb45c");
    hudChip(cx - 34, cy - 51, "star " + DET.star.val, "#ffb45c");

    }

    /* the alien rides in the corner where the black holes used to be,
       in both themes */
    drawAlien();

    /* astronaut on a slow lissajous drift */
    var ax = w * (0.5 + 0.34 * Math.sin(t * 0.0016));
    var ay = h * (0.52 + 0.28 * Math.sin(t * 0.0023 + 1.2));
    var arot = Math.sin(t * 0.0011) * 0.35 + 0.2;
    drawAstronaut(ax, ay, arot, 0.75);
    ctx.globalAlpha = 0.8;
    hudBox(ax - 30, ay - 24, 62, 48, "#5ad9a6");
    hudChip(ax - 30, ay - 41, "astronaut " + DET.astro.val, "#5ad9a6");

    ctx.restore();
  }

  function render() {
    var light = lightOn();   /* palette read per frame so theme toggles repaint */
    ctx.clearRect(0, 0, w, h);
    var cx = w * 0.09, cy = h * 0.18;   /* star system hugging the top-left */

    /* nebula dust */
    nebulae.forEach(function (neb) {
      var g = ctx.createRadialGradient(w * neb.x, h * neb.y, 10, w * neb.x, h * neb.y, neb.r);
      g.addColorStop(0, neb.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w * neb.x, h * neb.y, neb.r, 0, Math.PI * 2);
      ctx.fill();
    });

    /* neural synapse links */
    for (var a = 0; a < neural.length; a++) {
      for (var b = a + 1; b < neural.length; b++) {
        var ndx = neural[a].x - neural[b].x, ndy = neural[a].y - neural[b].y;
        var nl = Math.sqrt(ndx * ndx + ndy * ndy);
        if (nl < 130) {
          var la = (1 - nl / 130) * 0.22;
          ctx.strokeStyle = light
            ? "rgba(20, 110, 170, " + (la * 0.85).toFixed(3) + ")"
            : "rgba(0, 242, 254, " + la.toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(neural[a].x, neural[a].y);
          ctx.lineTo(neural[b].x, neural[b].y);
          ctx.stroke();
        }
      }
    }

    /* neural synapse nodes, glowing like the helper portfolio's */
    neural.forEach(function (n) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      var nc = light ? (n.color === "#00f2fe" ? "#0aa2c0" : "#7a22ff") : n.color;
      ctx.fillStyle = nc;
      ctx.shadowBlur = 8;
      ctx.shadowColor = nc;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    /* stars */
    stars.forEach(function (s) {
      var liveOpacity = Math.max(0.05, Math.min(1, s.opacity + Math.sin(s.twinklePhase) * 0.2));
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = light
        ? "rgba(30, 46, 66, " + (liveOpacity * 0.45).toFixed(3) + ")"
        : "rgba(255, 255, 255, " + liveOpacity + ")";
      ctx.fill();
    });

    /* light mode retires the star system early; the alien replaces the
       retired black holes in both themes via the CV overlay */
    if (light) { drawCvOverlay(cx, cy); return; }

    /* supernova shockwave */
    ctx.beginPath();
    ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 210, 255, " + shockAlpha + ")";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* solar corona */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(coronaAngle);
    for (var k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 30 + k * 5, 22 + k * 3, (k * Math.PI) / 4, 0, Math.PI * 2);
      ctx.strokeStyle = light ? "rgba(255, 0, 127, 0.05)" : "rgba(255, 0, 127, 0.02)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();

    /* pulsing sun core */
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = light ? "#00c0e8" : "#ffffff";
    ctx.shadowBlur = sunPulse;
    ctx.shadowColor = "#00d2ff";
    ctx.fill();
    ctx.shadowBlur = 0;

    /* planet orbits, bodies and moons */
    planets.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(cx, cy, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = light ? "rgba(20, 34, 52, 0.10)" : "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      ctx.stroke();
      var px = cx + Math.cos(p.angle) * p.radius;
      var py = cy + Math.sin(p.angle) * p.radius;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 18;
      ctx.shadowColor = p.glow;
      ctx.fill();
      ctx.shadowBlur = 0;
      p.moons.forEach(function (m) {
        ctx.beginPath();
        ctx.arc(px + Math.cos(m.angle) * m.orbitRadius, py + Math.sin(m.angle) * m.orbitRadius, m.size, 0, Math.PI * 2);
        ctx.fillStyle = (light && m.color === "#ffffff") ? "#2a3c52" : m.color;
        ctx.fill();
      });
    });

    drawCvOverlay(cx, cy);
  }

  function loop() {
    step();
    render();
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", resize);

  function sync() {
    canvas.style.display = "";
    if (reduced) { if (raf) { cancelAnimationFrame(raf); raf = 0; } render(); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  if (window.MutationObserver) {
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }
  sync();
})();
