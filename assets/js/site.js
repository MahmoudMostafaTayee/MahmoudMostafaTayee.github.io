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
