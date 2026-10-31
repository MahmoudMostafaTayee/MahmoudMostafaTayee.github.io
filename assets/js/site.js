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

  /* Theme toggle */
  var root = doc.documentElement;
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
   locks the box onto the element like a tracked object. Dark theme only,
   fine pointers only, disabled for prefers-reduced-motion.
   --------------------------------------------------------------------- */
(function () {
  if (!window.matchMedia) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.documentElement;
  function darkOn() { return root.getAttribute("data-theme") !== "light"; }

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
    if (!darkOn()) return;
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
      if (darkOn()) {
        document.body.classList.add("cv-hud-on");
        els.forEach(function (el) { el.classList.add("is-visible"); });
      }
    }
  }

  function sync() {
    var on = darkOn() && everMoved;
    document.body.classList.toggle("cv-hud-on", darkOn());
    els.forEach(function (el) { el.classList.toggle("is-visible", on); });
    if (on && !raf) raf = requestAnimationFrame(frame);
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

  if (window.MutationObserver) {
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }
})();

/* ---------------------------------------------------------------------
   Space scene: canvas-based cosmos behind the whole site (port of the
   interstellar background — twinkling drifting stars, gravity comets,
   pulsing sun, orbiting planets with moons, asteroid belt, binary
   black holes, supernova shockwave, corona) read through a
   computer-vision overlay: detector brackets and confidence chips on
   every celestial object, speed readouts on the comets and on the
   scout ship, a drifting astronaut, and the mouse spaceship from the
   helper portfolio trailing the cursor while the DOM CV box frames it.
   Dark theme only; static single frame under reduced motion.
   --------------------------------------------------------------------- */
(function () {
  if (!window.matchMedia) return;

  var root = document.documentElement;
  function darkOn() { return root.getAttribute("data-theme") !== "light"; }

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
    if (!ship.seeded) {
      ship.seeded = true;
      ship.x = ship.tx = w * 0.2;
      ship.y = ship.ty = h * 0.5;
    }
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

  /* 2. Gravity-slingshot comets */
  var comets = [
    { x: rand(0, 0.3), y: -0.05, vx: rand(3, 5), vy: rand(2, 4) },
    { x: rand(0, 0.3), y: -0.05, vx: rand(3, 5), vy: rand(1.5, 3.5) }
  ];

  /* 3. Planets with sub-moons */
  var planets = [
    { radius: 95,  speed: 0.007,  angle: Math.random() * 10, size: 4, color: "#00d2ff",  glow: "rgba(0, 210, 255, 0.4)",   moons: [] },
    { radius: 145, speed: 0.004,  angle: Math.random() * 10, size: 6, color: "#ff007f",  glow: "rgba(255, 0, 127, 0.4)",   moons: [{ orbitRadius: 12, speed: 0.04, angle: 0, size: 1.5, color: "#ffffff" }] },
    { radius: 215, speed: 0.0025, angle: Math.random() * 10, size: 8, color: "#7a22ff",  glow: "rgba(122, 34, 255, 0.4)",  moons: [
      { orbitRadius: 15, speed: 0.03,  angle: 0,        size: 2,   color: "#a366ff" },
      { orbitRadius: 22, speed: -0.02, angle: Math.PI,  size: 1.2, color: "#ffffff" }
    ] },
    { radius: 280, speed: 0.0018, angle: Math.random() * 10, size: 5, color: "#00ff41",  glow: "rgba(0, 255, 65, 0.4)",    moons: [] }
  ];

  /* 4. Asteroid belt */
  var asteroids = [];
  for (var a = 0; a < 80; a++) {
    asteroids.push({
      radius: Math.random() * 40 + 172,
      speed: Math.random() * 0.001 + 0.0006,
      angle: Math.random() * Math.PI * 2,
      size: Math.random() * 0.9 + 0.3,
      opacity: Math.random() * 0.4 + 0.1
    });
  }

  var nebulae = [
    { x: 0.15, y: 0.25, r: 190, color: "rgba(77, 0, 153, 0.05)" },
    { x: 0.85, y: 0.75, r: 230, color: "rgba(0, 210, 255, 0.04)" }
  ];

  var binaryAngle = 0, BINARY_SPEED = 0.02, SEPARATION = 35;
  var shockRadius = 25, shockAlpha = 0.3;
  var sunPulse = 25, sunPulseDir = 1;
  var coronaAngle = 0;
  var t = 0;

  /* 5. Mouse scout ship (ported from the helper portfolio's mouseShip):
     inertia-follows the pointer, then swings out to a core orbit. */
  var ship = { x: 0, y: 0, tx: 0, ty: 0, angle: 0, speed: 0.05, seeded: false, kmh: 0 };

  window.addEventListener("pointermove", function (e) {
    ship.tx = e.clientX;
    ship.ty = e.clientY;
  }, { passive: true });

  /* 6. Detector readouts: confidences re-sampled a few times a second
     so the chips read as live inference instead of a static label. */
  var DET = {
    star:  { base: 1.0,  val: "1.00" },
    bh:    { base: 0.99, val: "0.99" },
    belt:  { base: 0.87, val: "0.87" },
    astro: { base: 0.96, val: "0.96" }
  };
  var DET_BASE = [0.97, 0.94, 0.96, 0.93];      /* per-planet confidence */
  var COMET_BASE = [0.92, 0.88];                /* per-comet confidence */

  function jitterDets() {
    for (var key in DET) {
      DET[key].val = Math.max(0.4, DET[key].base - Math.random() * 0.045).toFixed(2);
    }
    planets.forEach(function (p, i) {
      p.c = Math.max(0.4, DET_BASE[i] - Math.random() * 0.045).toFixed(2);
    });
    comets.forEach(function (c, i) {
      c.c = Math.max(0.4, COMET_BASE[i] - Math.random() * 0.045).toFixed(2);
    });
  }
  jitterDets();

  function step() {
    t++;
    if (t % 12 === 0) jitterDets();

    /* scout ship: chase the pointer, orbit the core when it has arrived */
    var sdx = ship.tx - ship.x, sdy = ship.ty - ship.y;
    var sdist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
    if (sdist < 40) {
      ship.tx = w / 2 + Math.cos(binaryAngle * 0.4) * 340;
      ship.ty = h / 2 + Math.sin(binaryAngle * 0.4) * 340;
    }
    ship.x += sdx * ship.speed;
    ship.y += sdy * ship.speed;
    if (sdist > 2) ship.angle = Math.atan2(sdy, sdx);
    ship.kmh = sdist * ship.speed * 9.4;

    binaryAngle += BINARY_SPEED;
    shockRadius += 1.2;
    shockAlpha -= 0.0018;
    if (shockAlpha <= 0) { shockRadius = 25; shockAlpha = 0.35; }
    sunPulse += 0.15 * sunPulseDir;
    if (sunPulse > 50 || sunPulse < 30) sunPulseDir *= -1;
    coronaAngle += 0.0012;
    asteroids.forEach(function (ast) { ast.angle += ast.speed; });
    planets.forEach(function (p) { p.angle += p.speed; });
    planets.forEach(function (p) { p.moons.forEach(function (m) { m.angle += m.speed; }); });
    stars.forEach(function (s) {
      s.y += s.speedY / h;
      s.twinklePhase += s.twinkleSpeed;
      if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
      var b1 = binaryPos(0), b2 = binaryPos(Math.PI);
      [{ x: b1[0], y: b1[1] }, { x: b2[0], y: b2[1] }].forEach(function (bh) {
        var dx = bh.x - s.x * w, dy = bh.y - s.y * h;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 160) {
          var pull = (160 - dist) * 0.012;
          s.x += (dx / dist) * pull / w;
          s.y += (dy / dist) * pull / h;
          if (dist < 8) { s.x = Math.random(); s.y = 0; }
        }
      });
    });
    comets.forEach(function (c) {
      var dx = w / 2 - c.x, dy = h / 2 - c.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance < 380) {
        var force = (380 - distance) * 0.00018;
        c.vx += (dx / distance) * force;
        c.vy += (dy / distance) * force;
      }
      c.x += c.vx; c.y += c.vy;
      if (c.x > w + 60 || c.y > h + 60 || c.x < -60 || c.y < -60) {
        c.x = rand(0, w * 0.3); c.y = -40;
        c.vx = rand(3, 5); c.vy = rand(1.5, 4);
      }
    });
  }

  function binaryPos(offset) {
    var cx = w * 0.82, cy = h * 0.25;
    return [cx + Math.cos(binaryAngle + offset) * SEPARATION, cy + Math.sin(binaryAngle + offset) * SEPARATION];
  }

  function drawBlackHole(x, y, rotOffset) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(binaryAngle * rotOffset);
    for (var i = 3; i > 0; i--) {
      ctx.beginPath();
      ctx.ellipse(0, 0, i * 9, i * 3.5, (i * Math.PI) / 6, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 0, 127, 0.25)" : "rgba(77, 0, 153, 0.3)";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff007f";
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();
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

  /* corner-bracket detection box, top-left origin */
  function hudBox(bx, by, bw, bh, color) {
    var arm = Math.max(6, Math.min(14, bw * 0.3, bh * 0.3));
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
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 3);
    ctx.quadraticCurveTo(-26, 8 + Math.sin(t * 0.05) * 5, -46, 4 + Math.sin(t * 0.05 + 1.4) * 7);
    ctx.stroke();

    /* legs + boots */
    ctx.lineCap = "round";
    ctx.strokeStyle = "#dde5ef";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-15, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-15, -7); ctx.stroke();
    ctx.fillStyle = "#8fa0b4";
    ctx.beginPath(); ctx.arc(-16.5, 9, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-16.5, -8, 2.8, 0, Math.PI * 2); ctx.fill();

    /* arms + gloves */
    ctx.strokeStyle = "#e6ecf5";
    ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(3, -5); ctx.lineTo(9, -13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(8, 13); ctx.stroke();
    ctx.fillStyle = "#cbd6e4";
    ctx.beginPath(); ctx.arc(10, -14.5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 14.5, 2.6, 0, Math.PI * 2); ctx.fill();

    /* life-support backpack */
    ctx.fillStyle = "#9fb0c4";
    rr(-7, 6, 15, 5.5, 2.5);
    ctx.fill();

    /* torso */
    ctx.fillStyle = "#e9eff7";
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
    ctx.fillStyle = "#f2f6fb";
    ctx.beginPath(); ctx.arc(13, 0, 8.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#04070e";
    ctx.beginPath(); ctx.arc(14.4, 0, 5.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,210,255,0.5)";
    ctx.beginPath(); ctx.arc(16.4, -2, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,210,255,0.28)";
    ctx.beginPath(); ctx.arc(15, 2.6, 1, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  /* Mouse scout ship: arrow hull, cockpit glint, plasma trail. */
  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    var jet = ctx.createLinearGradient(-12, 0, -32, 0);
    jet.addColorStop(0, "rgba(255, 0, 127, 0.95)");
    jet.addColorStop(1, "rgba(77, 0, 153, 0)");
    ctx.fillStyle = jet;
    ctx.beginPath();
    ctx.moveTo(-8, -2.5);
    ctx.lineTo(-24 - Math.random() * 10, 0);
    ctx.lineTo(-8, 2.5);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00d2ff";
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(3, -1.5);
    ctx.lineTo(7, 0);
    ctx.lineTo(3, 1.5);
    ctx.closePath();
    ctx.fillStyle = "#00d2ff";
    ctx.fill();

    ctx.restore();
  }

  /* What the detector sees in the cosmos. The ship gets a velocity chip
     only — the DOM CV box already frames the cursor it flies to. */
  function drawCvOverlay(cx, cy) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    /* planets */
    planets.forEach(function (p) {
      var px = cx + Math.cos(p.angle) * p.radius;
      var py = cy + Math.sin(p.angle) * p.radius;
      var s = (p.size + 7) * 2;
      hudBox(px - s / 2, py - s / 2, s, s, "#00d2ff");
      hudChip(px - s / 2, py - s / 2 - 17, "planet " + p.c, "#00d2ff");
    });

    /* comets — speed detection */
    comets.forEach(function (c) {
      var kmh = Math.sqrt(c.vx * c.vx + c.vy * c.vy) * 9.4;
      hudBox(c.x - 15, c.y - 15, 30, 30, "#ffb45c");
      hudChip(c.x - 15, c.y + 17, "comet " + c.c + " · " + kmh.toFixed(1) + " km/s", "#ffb45c");
    });

    /* star core */
    hudBox(cx - 34, cy - 34, 68, 68, "#ffb45c");
    hudChip(cx - 34, cy - 51, "star " + DET.star.val, "#ffb45c");

    /* binary black holes */
    var bsx = w * 0.82, bsy = h * 0.25, bs = SEPARATION * 2 + 46;
    hudBox(bsx - bs / 2, bsy - bs / 2, bs, bs, "#ff007f");
    hudChip(bsx - bs / 2, bsy - bs / 2 - 17, "binary_bh " + DET.bh.val, "#ff007f");

    /* asteroid belt as one cluster detection */
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "rgba(0,210,255,0.7)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.strokeRect(cx - 224, cy - 224, 448, 448);
    ctx.setLineDash([]);
    hudChip(cx - 224, cy - 241, "cluster \"belt\" · " + asteroids.length + " obj " + DET.belt.val, "#00d2ff");
    ctx.restore();

    /* astronaut on a slow lissajous drift */
    var ax = w * (0.5 + 0.34 * Math.sin(t * 0.0016));
    var ay = h * (0.52 + 0.28 * Math.sin(t * 0.0023 + 1.2));
    var arot = Math.sin(t * 0.0011) * 0.35 + 0.2;
    drawAstronaut(ax, ay, arot, 0.75);
    ctx.globalAlpha = 0.8;
    hudBox(ax - 30, ay - 24, 62, 48, "#5ad9a6");
    hudChip(ax - 30, ay - 41, "astronaut " + DET.astro.val, "#5ad9a6");

    /* scout ship speed readout */
    drawShip();
    if (ship.kmh > 0.5) {
      ctx.globalAlpha = 0.9;
      hudChip(ship.x - 18, ship.y + 20, "scout_ship " + ship.kmh.toFixed(1) + " km/s", "#ffb45c");
    }

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var b1 = binaryPos(0), b2 = binaryPos(Math.PI);

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

    /* stars */
    stars.forEach(function (s) {
      var liveOpacity = Math.max(0.05, Math.min(1, s.opacity + Math.sin(s.twinklePhase) * 0.2));
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, " + liveOpacity + ")";
      ctx.fill();
    });

    /* comets with cyan→pink tails */
    comets.forEach(function (c) {
      var tail = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 15, c.y - c.vy * 15);
      tail.addColorStop(0, "rgba(0, 210, 255, 0.45)");
      tail.addColorStop(1, "rgba(255, 0, 127, 0)");
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x - c.vx * 15, c.y - c.vy * 15);
      ctx.strokeStyle = tail;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    /* binary black holes */
    drawBlackHole(b1[0], b1[1], 1);
    drawBlackHole(b2[0], b2[1], -1);

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
      ctx.strokeStyle = "rgba(255, 0, 127, 0.02)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();

    /* pulsing sun core */
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = sunPulse;
    ctx.shadowColor = "#00d2ff";
    ctx.fill();
    ctx.shadowBlur = 0;

    /* asteroid belt */
    asteroids.forEach(function (ast) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ast.angle) * ast.radius, cy + Math.sin(ast.angle) * ast.radius, ast.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(175, 200, 255, " + ast.opacity + ")";
      ctx.fill();
    });

    /* planet orbits, bodies and moons */
    planets.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(cx, cy, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
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
        ctx.fillStyle = m.color;
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
    var on = darkOn();
    canvas.style.display = on ? "" : "none";
    if (!on) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      return;
    }
    if (reduced) { if (raf) { cancelAnimationFrame(raf); raf = 0; } render(); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  if (window.MutationObserver) {
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }
  sync();
})();
