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
   Background scene: nebula dust and floating cast drawn through the
   computer-vision overlay (the kite/bug/saucer/coffee crew and the
   astronaut, shared by both themes; the duck floats in light theme only).
   Starfield and neural particles retired. Runs in both themes; static
   single frame under reduced motion.
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
    if (!raf) { render(false); }
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  var nebulae = [
    { x: 0.15, y: 0.25, r: 190, color: "rgba(77, 0, 153, 0.05)" },
    { x: 0.85, y: 0.75, r: 230, color: "rgba(0, 210, 255, 0.04)" }
  ];

  var t = 0;

  /* 6. Detector readouts: confidences re-sampled a few times a second
     so the chips read as live inference instead of a static label. */
  var DET = {
    astro: { base: 0.96, val: "0.96" },
    kite:  { base: 0.94, val: "0.94" },
    duck:  { base: 0.99, val: "0.99" },
    bug:   { base: 0.97, val: "0.97" },
    abduct:{ base: 0.97, val: "0.97" },
    coffee:{ base: 0.98, val: "0.98" }
  };
  var WIND = { base: 3.2, val: "3.2" };
  function jitterDets() {
    for (var key in DET) {
      DET[key].val = Math.max(0.4, DET[key].base - Math.random() * 0.045).toFixed(2);
    }
    WIND.val = Math.max(1.2, WIND.base + rand(-0.8, 0.8)).toFixed(1);
  }
  jitterDets();

  function step() {
    t++;
    if (t % 12 === 0) jitterDets();
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
     The kite owns the top-left corner in light theme; the duck, the
     bug, the saucer crew and the coffee run in both themes. The alien
     has moved on to probe elsewhere. */

  /* Kite tethered to the true top-left corner of the viewport. */
  function drawKite() {
    var light = lightOn();
    var kx = Math.max(70, w * 0.085) + Math.sin(t * 0.0011) * 14;
    var ky = h * 0.165 + Math.sin(t * 0.0016 + 1.1) * 10;
    var krot = 0.18 + Math.sin(t * 0.0013) * 0.12;

    /* slack tether with wind-dependent sag */
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.quadraticCurveTo(kx * 0.55, ky + 26 + Math.sin(t * 0.0009) * 8, kx, ky + 16);
    ctx.strokeStyle = light ? "rgba(20, 34, 52, 0.4)" : "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(krot);

    /* tail first, under the body */
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(4 + Math.sin(t * 0.002) * 3, 38, -2 + Math.sin(t * 0.002 + 1.5) * 4, 56);
    ctx.strokeStyle = light ? "rgba(20, 34, 52, 0.45)" : "rgba(255, 255, 255, 0.35)";
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
    ctx.fillStyle = light ? "rgba(28, 64, 92, 0.9)" : "#dfe9f2";
    ctx.fill();
    ctx.strokeStyle = light ? "rgba(255, 255, 255, 0.75)" : "rgba(10, 16, 24, 0.8)";
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

  /* Rubber duck: floats on the current, judging your loops until you
     explain them to it. */
  function drawDuck() {
    var dx = w * 0.10 + Math.sin(t * 0.0012) * 12;
    var dy = h * 0.80 + Math.sin(t * 0.0021 + 0.4) * 7;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(Math.sin(t * 0.0016) * 0.07);

    /* body */
    ctx.fillStyle = "#f6c94a";
    ctx.beginPath();
    ctx.ellipse(0, 2, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    /* tail flick */
    ctx.beginPath();
    ctx.moveTo(-12, -1);
    ctx.quadraticCurveTo(-18, -3, -15, -7);
    ctx.quadraticCurveTo(-11, -5, -9, -2);
    ctx.closePath();
    ctx.fill();

    /* head, beak, eye */
    ctx.beginPath(); ctx.arc(7, -8, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e8842c";
    ctx.beginPath();
    ctx.moveTo(12, -8); ctx.lineTo(17.5, -7); ctx.lineTo(12, -5.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#20242b";
    ctx.beginPath(); ctx.arc(8.5, -9.5, 1.1, 0, Math.PI * 2); ctx.fill();

    /* wing line */
    ctx.strokeStyle = "rgba(140, 100, 20, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-3, 2, 6, 0.3, 1.9);
    ctx.stroke();

    ctx.restore();

    ctx.globalAlpha = 0.8;
    hudBox(dx - 18, dy - 16, 39, 27, "#d19b26");
    hudChip(dx - 18, dy - 33, "duck " + DET.duck.val + " · explain your code", "#d19b26");
  }

  /* A beetle crawling slowly along the bottom edge: the bug that gets
     detected before it becomes a ticket. */
  function drawBug() {
    var light = lightOn();
    var bx = (t * 0.9 % (w + 140)) - 70;
    var by = h - 22;
    if (bx < -40 || bx > w + 40) return;
    var walk = Math.sin(t * 0.18) * 2;

    ctx.save();
    ctx.translate(bx, by);

    /* six stepping legs */
    ctx.strokeStyle = light ? "rgba(14, 22, 35, 0.8)" : "rgba(226, 234, 242, 0.7)";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (var l = 0; l < 3; l++) {
      var lx = -6 + l * 6;
      ctx.beginPath(); ctx.moveTo(lx, 3);  ctx.lineTo(lx - 4,  9 + ((l % 2) ?  walk : -walk) * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx, -3); ctx.lineTo(lx - 4, -9 - ((l % 2) ? -walk :  walk) * 0.4); ctx.stroke();
    }

    /* antennae */
    ctx.beginPath();
    ctx.moveTo(9, -2); ctx.lineTo(15, -6 + walk);
    ctx.moveTo(9, 2);  ctx.lineTo(15,  6 - walk);
    ctx.stroke();

    /* shell with split line, then head */
    ctx.fillStyle = light ? "#25384e" : "#4a6580";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
    ctx.fillStyle = light ? "#182636" : "#33495f";
    ctx.beginPath(); ctx.arc(10, 0, 3.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    ctx.globalAlpha = 0.8;
    hudBox(bx - 14, by - 13, 38, 26, "#ff007f");
    hudChip(bx - 14, by - 30, "bug " + DET.bug.val + " · not a feature", "#ff007f");
  }

  /* Saucer with a tractor beam; the cow is half-way up and mildly
     upset about it. */
  function drawUfoAbduction() {
    var ux = Math.min(w - 60, w * 0.90) + Math.sin(t * 0.0009) * 14;
    var uy = h * 0.20 + Math.sin(t * 0.0015 + 0.9) * 7;

    /* beam */
    var bTop = uy + 10, bBot = uy + h * 0.34, spread = 46;
    var g = ctx.createLinearGradient(0, bTop, 0, bBot);
    g.addColorStop(0, "rgba(94, 214, 162, 0.35)");
    g.addColorStop(1, "rgba(94, 214, 162, 0.02)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ux - 10, bTop); ctx.lineTo(ux - spread, bBot);
    ctx.lineTo(ux + spread, bBot); ctx.lineTo(ux + 10, bTop);
    ctx.closePath();
    ctx.fill();

    /* the cow */
    var cwob = Math.sin(t * 0.0035) * 4;
    ctx.save();
    ctx.translate(ux + cwob * 0.4, bBot - (bBot - bTop) * 0.55 + cwob);
    ctx.rotate(0.18 + Math.sin(t * 0.0022) * 0.12);
    ctx.strokeStyle = "#e8e3da";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-6, 5); ctx.lineTo(-10, 12); ctx.moveTo(-2, 6); ctx.lineTo(-3, 14);
    ctx.moveTo(3, 6);  ctx.lineTo(8, 13);   ctx.moveTo(6, 5);  ctx.lineTo(13, 9);
    ctx.stroke();
    ctx.fillStyle = "#f2efe8";
    rr(-10, -6, 20, 12, 5); ctx.fill();
    ctx.fillStyle = "#2b2f36";
    ctx.beginPath(); ctx.ellipse(3, -2, 5, 3.4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-6, 2, 3.6, 2.6, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2efe8";
    ctx.beginPath(); ctx.ellipse(-12, -7, 5, 4, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b2f36";
    ctx.beginPath(); ctx.arc(-9.5, -8.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e8e3da"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, -4); ctx.quadraticCurveTo(15, -8 + cwob, 13, -13); ctx.stroke();
    ctx.restore();

    /* saucer: dome, hull, chasing rim lights */
    ctx.fillStyle = "rgba(0, 210, 255, 0.55)";
    ctx.beginPath();
    ctx.ellipse(ux, uy, 12, 9, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7f8ea0";
    ctx.beginPath();
    ctx.ellipse(ux, uy + 6, 32, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (var li = -3; li <= 3; li++) {
      ctx.fillStyle = "rgba(255, 214, 92, " + (0.4 + 0.5 * Math.abs(Math.sin(t * 0.006 + li))).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(ux + li * 8, uy + 8, 1.4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalAlpha = 0.8;
    hudBox(ux - 34, uy - 14, 68, 22, "#2f9e8f");
    hudChip(ux - 34, uy - 31, "abduct " + DET.abduct.val, "#2f9e8f");
  }

  /* Paper coffee cup with live steam: segfault fuel. */
  function drawCoffee() {
    var light = lightOn();
    var cx2 = w * 0.27 + Math.sin(t * 0.001) * 12;
    var cy2 = h * 0.60 + Math.sin(t * 0.0016 + 2) * 9;

    /* steam wisps */
    ctx.strokeStyle = light ? "rgba(88, 105, 122, 0.4)" : "rgba(200, 214, 228, 0.35)";
    ctx.lineWidth = 1.2;
    for (var st = 0; st < 2; st++) {
      var sx2 = cx2 - 4 + st * 8, sway = Math.sin(t * 0.003 + st * 1.7) * 5;
      ctx.beginPath();
      ctx.moveTo(sx2, cy2 - 22);
      ctx.bezierCurveTo(sx2 + sway, cy2 - 32, sx2 - sway, cy2 - 42, sx2 + sway, cy2 - 54);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.rotate(Math.sin(t * 0.0014) * 0.04);

    /* tapered cup */
    ctx.fillStyle = "#f4f1ec";
    ctx.strokeStyle = light ? "rgba(20, 34, 52, 0.45)" : "rgba(232, 240, 248, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, -20); ctx.lineTo(9, -20); ctx.lineTo(6, 8); ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    /* sleeve */
    ctx.fillStyle = "#a2603a";
    ctx.beginPath();
    ctx.moveTo(-7.6, -10); ctx.lineTo(7.6, -10); ctx.lineTo(6.4, 2); ctx.lineTo(-6.4, 2);
    ctx.closePath();
    ctx.fill();

    /* lid */
    ctx.fillStyle = "#d8d2c8";
    rr(-10.5, -24, 21, 5, 2); ctx.fill();
    ctx.strokeStyle = light ? "rgba(20, 34, 52, 0.45)" : "rgba(232, 240, 248, 0.55)";
    ctx.stroke();

    ctx.restore();

    ctx.globalAlpha = 0.8;
    hudBox(cx2 - 13, cy2 - 26, 26, 36, "#8a5a33");
    hudChip(cx2 - 13, cy2 - 43, "coffee " + DET.coffee.val + " · segfault fuel", "#8a5a33");
  }


  /* What the detector sees in the scene: the kite/bug/saucer/coffee
     crew, the duck (light theme only), and the drifting astronaut. */
  function drawCvOverlay() {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    ctx.save();
    drawKite();
    if (lightOn()) drawDuck();
    drawBug();
    drawUfoAbduction();
    drawCoffee();
    ctx.restore();


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

    drawCvOverlay();
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
