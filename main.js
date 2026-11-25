(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const desktop = () => window.innerWidth >= 900;

  /* ---------- Text splitting ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    [...text].forEach(ch => {
      const s = document.createElement("span");
      s.className = "char";
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch === " " ? "\u00A0" : ch;
      el.appendChild(s);
    });
    return $$(".char", el);
  }

  /* ---------- Intro ---------- */
  function runIntro() {
    const intro = $("#intro");
    const glow = $("#introGlow");
    const initials = $("#introInitials");
    const title = $("#introTitle");
    const enterBtn = $("#enterBtn");
    const skipBtn = $("#skipBtn");

    if (reduceMotion || typeof gsap === "undefined") {
      finishIntro(true);
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(glow, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: "expo.out" })
      .to(glow, { width: 220, height: 220, borderRadius: "50%", boxShadow: "0 0 160px 40px rgba(111,168,255,0.35)", duration: 2, ease: "power2.inOut" }, "-=0.2")
      .to(initials, { opacity: 1, duration: 1.4 }, "-=1.2")
      .fromTo($$("span", initials), { y: 20, filter: "blur(10px)" }, { y: 0, filter: "blur(0px)", stagger: 0.12, duration: 1.2 }, "<")
      .to(title, { opacity: 1, duration: 1 }, "-=0.6")
      .to(enterBtn, { opacity: 1, duration: 0.8 }, "-=0.4");

    // Camera push from the 3D scene
    if (Universe.supportsWebGL()) Universe.burst(1.6);

    enterBtn.addEventListener("click", () => {
      tl.kill();
      const ex = gsap.timeline({ onComplete: () => finishIntro(false) });
      ex.to(enterBtn, { opacity: 0, duration: 0.3 })
        .to([initials, title, skipBtn], { opacity: 0, y: -20, duration: 0.6, ease: "power2.in" }, 0)
        .to(glow, { scale: 60, opacity: 0, duration: 1.4, ease: "expo.in" }, 0.1);
    });

    skipBtn.addEventListener("click", () => { tl.kill(); finishIntro(false); });
    intro.addEventListener("keydown", e => { if (e.key === "Enter") enterBtn.click(); });
  }

  function finishIntro(instant) {
    const intro = $("#intro");
    document.body.classList.remove("intro-active");
    intro.classList.add("gone");
    if (typeof gsap !== "undefined") {
      gsap.to(".command-nav", { opacity: 1, duration: instant ? 0 : 0.8 });
      playHeroReveal(instant);
    } else {
      $(".command-nav").style.opacity = 1;
    }
  }

  function playHeroReveal(instant) {
    const chars = $$(".hero-name .line").flatMap(line => splitChars(line));
    gsap.set(chars, { opacity: 0, y: 0.6 * 16 });
    gsap.to(chars, {
      opacity: 1, y: 0, stagger: 0.03, duration: instant ? 0 : 1.1, ease: "expo.out", delay: instant ? 0 : 0.2
    });
    gsap.from(["#introduction .hero-sub", "#introduction .hero-meta"], {
      opacity: 0, y: 20, duration: 1, stagger: 0.15, delay: instant ? 0 : 1.1, ease: "power3.out"
    });
  }

  /* ---------- Command navigation ---------- */
  function initNav() {
    const toggle = $("#navToggle");
    const list = $("#navList");
    toggle.addEventListener("click", () => {
      const open = !list.classList.contains("open");
      list.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$(".nav-item").forEach(a => a.addEventListener("click", () => {
      list.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { list.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });

    // Active scene indicator
    const items = $$(".nav-item");
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        items.forEach(i => i.classList.toggle("active", i.dataset.scene === e.target.dataset.scene));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("section.scene[data-scene]").forEach(s => io.observe(s));
  }

  /* ---------- Scroll reveals and scene transitions ---------- */
  function initScrollAnimations() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    if (reduceMotion) return;

    // Identity: staggered body reveal
    gsap.to("#identity .reveal-up", {
      opacity: 1, y: 0, stagger: 0.12, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: "#identity", start: "top 65%" }
    });
    gsap.from("#identity .scene-title", {
      opacity: 0, filter: "blur(8px)", y: 60, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: "#identity", start: "top 70%" }
    });

    // Scene transitions: each scene drifts and fades in
    $$("section.scene:not(.hero)").forEach(scene => {
      gsap.fromTo(scene.querySelector(".container") || scene, { opacity: 0.2, y: 60 }, {
        opacity: 1, y: 0, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: scene, start: "top 80%", toggleActions: "play none none reverse" }
      });
    });

    // Hero parallax on scroll
    gsap.to(".hero-text", {
      y: -120, opacity: 0.2, ease: "none",
      scrollTrigger: { trigger: "#introduction", start: "top top", end: "bottom top", scrub: true }
    });

    // Journey: orb travels with scroll
    const orb = $("#journeyOrb");
    const track = $(".journey-track");
    if (orb && track) {
      gsap.to(orb, {
        y: () => track.offsetHeight - 15, ease: "none",
        scrollTrigger: { trigger: track, start: "top 60%", end: "bottom 60%", scrub: 0.6 }
      });
      $$(".milestones li").forEach(li => {
        gsap.fromTo(li, { opacity: 0.25, x: 20 }, {
          opacity: 1, x: 0, duration: 0.6,
          scrollTrigger: { trigger: li, start: "top 75%", end: "top 45%", scrub: true }
        });
      });
    }

    // Experiments: horizontal pinned storytelling on desktop only
    const exp = $("#experiments");
    const exTrack = $("#experimentsTrack");
    if (exp && exTrack) {
      if (desktop()) {
        const distance = () => exTrack.scrollWidth - window.innerWidth;
        gsap.to(exTrack, {
          x: () => -distance(), ease: "none",
          scrollTrigger: {
            trigger: exp, start: "top top", end: () => "+=" + distance(),
            pin: true, scrub: 0.8, invalidateOnRefresh: true
          }
        });
      } else {
        exp.classList.add("is-static");
      }
    }
  }

  /* ---------- Hero character reveal on load (splits happen in playHeroReveal) ---------- */

  /* ---------- Constellation ---------- */
  const NODES = [
    { label: "C", cat: "Programming", x: 18, y: 25, desc: "Procedural programming and core fundamentals." },
    { label: "C++", cat: "Programming", x: 36, y: 14, desc: "Object-oriented design and performance-minded code." },
    { label: "Python", cat: "Programming", x: 50, y: 40, desc: "Scripting, data work, and AI experiments." },
    { label: "JavaScript", cat: "Programming", x: 30, y: 58, desc: "Interactive front-end logic and the browser." },
    { label: "HTML", cat: "Web", x: 66, y: 18, desc: "Semantic, accessible page structure." },
    { label: "CSS", cat: "Web", x: 82, y: 36, desc: "Layouts, responsive design, and motion." },
    { label: "Git", cat: "Tools", x: 12, y: 72, desc: "Version control and clean commit history." },
    { label: "GitHub", cat: "Tools", x: 42, y: 80, desc: "Code hosting and collaboration." },
    { label: "VS Code", cat: "Tools", x: 68, y: 76, desc: "Daily editor and development environment." },
    { label: "DSA", cat: "Computer Science", x: 60, y: 52, desc: "Data Structures and Algorithms." },
    { label: "OOP", cat: "Computer Science", x: 86, y: 62, desc: "Object-Oriented Programming." },
    { label: "Problem Solving", cat: "Computer Science", x: 22, y: 42, desc: "Breaking hard problems into clear steps." },
    { label: "AI", cat: "Exploration", x: 76, y: 88, desc: "Artificial Intelligence." },
    { label: "Machine Learning", cat: "Exploration", x: 52, y: 22, desc: "Models that learn from data." },
    { label: "Data Science", cat: "Exploration", x: 90, y: 14, desc: "Turning data into insight." },
    { label: "Full-Stack Dev", cat: "Exploration", x: 6, y: 90, desc: "End-to-end web application development." }
  ];

  function initConstellation() {
    const host = $("#constellation");
    if (!host) return;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "constellation-lines");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    host.appendChild(svg);

    const stars = NODES.map((n, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "star";
      el.textContent = n.label;
      el.style.left = n.x + "%";
      el.style.top = n.y + "%";
      el.dataset.index = i;
      host.appendChild(el);
      return el;
    });

    const lines = NODES.map((n, i) => NODES.map((m, j) => {
      if (j <= i || n.cat !== m.cat) return null;
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", n.x); line.setAttribute("y1", n.y);
      line.setAttribute("x2", m.x); line.setAttribute("y2", m.y);
      svg.appendChild(line);
      return { line, a: i, b: j };
    }).filter(Boolean)).flat();

    const title = $("#panelTitle");
    const body = $("#panelBody");

    function light(i) {
      stars.forEach(s => s.classList.remove("lit", "related"));
      lines.forEach(l => l.line.style.opacity = 0);
      const n = NODES[i];
      stars[i].classList.add("lit");
      lines.forEach(l => {
        if (l.a === i || l.b === i) {
          l.line.style.opacity = 0.5;
          stars[l.a === i ? l.b : l.a].classList.add("related");
        }
      });
      title.textContent = `${n.label} · ${n.cat}`;
      body.textContent = n.desc;
    }

    function reset() {
      stars.forEach(s => s.classList.remove("lit", "related"));
      lines.forEach(l => l.line.style.opacity = 0);
      title.textContent = "Hover a node";
      body.textContent = "Explore the constellation to see how each skill connects.";
    }

    stars.forEach((s, i) => {
      s.addEventListener("pointerenter", () => light(i));
      s.addEventListener("focus", () => light(i));
      s.addEventListener("click", () => light(i));
    });
    host.addEventListener("pointerleave", reset);
    host.addEventListener("focusout", e => { if (!host.contains(e.relatedTarget)) reset(); });

    if (!reduceMotion && typeof gsap !== "undefined") {
      gsap.from(stars, { opacity: 0, scale: 0.6, stagger: 0.05, duration: 0.8, ease: "back.out(1.6)",
        scrollTrigger: { trigger: host, start: "top 80%" } });
    }
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    if (!finePointer) return;
    const dot = $("#cursor");
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    window.addEventListener("pointermove", e => { x = e.clientX; y = e.clientY; }, { passive: true });
    (function tick() {
      cx += (x - cx) * 0.25; cy += (y - cy) * 0.25;
      dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    })();
    $$("a, button, input, textarea").forEach(el => {
      el.addEventListener("pointerenter", () => { dot.style.width = dot.style.height = "34px"; });
      el.addEventListener("pointerleave", () => { dot.style.width = dot.style.height = "10px"; });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    if (reduceMotion || !finePointer) return;
    $$(".magnetic").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- Contact form ---------- */
  function initForm() {
    const form = $("#contactForm");
    const status = $("#formStatus");
    const rules = {
      name: v => v.trim().length >= 2 || "Please enter your name (at least 2 characters).",
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Please enter a valid email address.",
      message: v => v.trim().length >= 10 || "Message should be at least 10 characters."
    };

    function check(name) {
      const input = form.elements[name];
      const res = rules[name](input.value);
      const ok = res === true;
      input.closest(".field").classList.toggle("invalid", !ok);
      $(`#${name}Error`).textContent = ok ? "" : res;
      return ok;
    }

    Object.keys(rules).forEach(name => {
      const input = form.elements[name];
      input.addEventListener("blur", () => check(name));
      input.addEventListener("input", () => {
        if (input.closest(".field").classList.contains("invalid")) check(name);
      });
    });

    form.addEventListener("submit", e => {
      e.preventDefault();
      const valid = Object.keys(rules).map(check).every(Boolean);
      if (!valid) { status.textContent = "Please fix the highlighted fields."; return; }
      status.textContent = "Message is valid. Connect a form backend to deliver it.";
      form.reset();
      $$(".field", form).forEach(f => f.classList.remove("invalid"));
    });
  }

  /* ---------- Placeholder links ---------- */
  function initPlaceholders() {
    $$("a[data-placeholder]").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        const note = document.createElement("span");
        note.className = "placeholder-note";
        note.textContent = a.dataset.placeholder;
        a.insertAdjacentElement("afterend", note);
        setTimeout(() => note.remove(), 2500);
      });
    });
  }

  /* ---------- Init ---------- */
  function init() {
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();

    const canvas = $("#universe");
    Universe.init(canvas);
    if (!Universe.supportsWebGL()) { /* fallback note already shown by scene.js */ }

    initNav();
    initConstellation();
    initCursor();
    initMagnetic();
    initForm();
    initPlaceholders();
    // Reveal plain content for reduced-motion users, and keep sections visible without JS
    if (!reduceMotion) $$(".reveal-up").forEach(el => el.style.opacity = 0);
    initScrollAnimations();
    runIntro();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
