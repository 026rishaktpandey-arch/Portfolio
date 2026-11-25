(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Opening sequence (progress follows real load state) ---------- */
  const loader = $("#loader");
  const bar = $("#progressBar");
  const skip = $("#skip");
  let loaderDone = false;

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    bar.style.width = "100%";
    loader.classList.add("is-assembled");
    setTimeout(() => loader.classList.add("is-done"), reduceMotion ? 0 : 600);
    document.body.dataset.ready = "true";
  }

  const startTime = performance.now();
  const minDuration = reduceMotion ? 0 : 2000;
  let loadedFlag = document.readyState === "complete";
  let fontsFlag = false;

  window.addEventListener("load", () => { loadedFlag = true; });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { fontsFlag = true; });
  } else {
    fontsFlag = true;
  }

  function tickLoader() {
    if (loaderDone) return;
    const elapsed = performance.now() - startTime;
    const ready = loadedFlag && fontsFlag;
    const timeProgress = Math.min(elapsed / minDuration, 1);
    const progress = ready ? timeProgress : Math.min(timeProgress, 0.9);
    bar.style.width = (progress * 100).toFixed(1) + "%";
    if (progress >= 1 && ready) { finishLoader(); return; }
    if (elapsed > 3200) { finishLoader(); return; }
    requestAnimationFrame(tickLoader);
  }
  requestAnimationFrame(tickLoader);
  skip.addEventListener("click", finishLoader);

  /* ---------- Split name into animated characters ---------- */
  const nameEl = $("#name");
  if (nameEl && !reduceMotion) {
    const text = nameEl.textContent;
    nameEl.setAttribute("aria-label", text);
    nameEl.textContent = "";
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.animationDelay = (i * 0.035 + 0.3) + "s";
      s.textContent = ch === " " ? "\u00A0" : ch;
      nameEl.appendChild(s);
    });
  }

  /* ---------- Particle field ---------- */
  const canvas = $("#field");
  const ctx = canvas.getContext("2d");
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
  let particles = [];
  let width = 0, height = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(90, Math.floor((width * height) / 18000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.8 + 0.2,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));
  }

  function drawField() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.x += p.vx * p.z;
      p.y += p.vy * p.z;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
    }
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          ctx.strokeStyle = `rgba(155,123,255,${(0.12 * (1 - d2 / 14000)).toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      if (pointer.active) {
        const mx = a.x - pointer.x, my = a.y - pointer.y;
        const md = Math.hypot(mx, my);
        if (md < 160) {
          ctx.strokeStyle = `rgba(61,107,255,${(0.3 * (1 - md / 160)).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(201,206,214,${(0.35 * a.z).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 1.1 * a.z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    drawField();
    if (!reduceMotion) requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", () => { resize(); if (reduceMotion) drawField(); });
  loop();

  /* ---------- Pointer: glow, cursor, parallax, magnetic, tilt ---------- */
  const glow = $("#glow");
  const cursor = $("#cursor");
  let cx = pointer.x, cy = pointer.y, gx = pointer.x, gy = pointer.y;

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    if (reduceMotion) drawField();
  });
  window.addEventListener("pointerleave", () => { pointer.active = false; });

  function followPointer() {
    cx += (pointer.x - cx) * 0.25;
    cy += (pointer.y - cy) * 0.25;
    gx += (pointer.x - gx) * 0.06;
    gy += (pointer.y - gy) * 0.06;
    cursor.style.left = cx + "px";
    cursor.style.top = cy + "px";
    glow.style.left = gx + "px";
    glow.style.top = gy + "px";
    if (!reduceMotion) requestAnimationFrame(followPointer);
  }
  followPointer();

  $$("a, button, input, textarea, [data-tilt]").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });

  // Magnetic pull for buttons and links
  if (!reduceMotion) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  // 3D tilt on the identity card
  if (!reduceMotion) {
    $$("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
        card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------- Section routing ---------- */
  const panels = $$(".panel");
  const dockLinks = $$(".dock a");
  let current = "home";
  let switching = false;

  function showPanel(id, focusPanel = true) {
    const next = document.getElementById(id);
    if (!next || !next.classList.contains("panel")) return showPanel("home", focusPanel);
    if (id === current) return;
    const prev = document.getElementById(current);
    if (prev) {
      prev.classList.add("is-leaving");
      prev.classList.remove("is-active");
      setTimeout(() => prev.classList.remove("is-leaving"), reduceMotion ? 0 : 500);
    }
    switching = true;
    next.classList.add("is-active");
    next.scrollTop = 0;
    setTimeout(() => { switching = false; }, reduceMotion ? 0 : 400);
    current = id;
    dockLinks.forEach((a) => {
      if (a.dataset.target === id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (focusPanel) next.focus({ preventScroll: true });
    if (id === "journey") revealTimeline();
    if (id === "connect") typeHeading();
  }

  function routeFromHash() {
    const id = location.hash.replace("#", "") || "home";
    showPanel(id);
  }
  window.addEventListener("hashchange", routeFromHash);
  routeFromHash();

  /* ---------- Scroll-triggered timeline ---------- */
  const timelineItems = $$(".timeline li");
  function revealTimeline() {
    timelineItems.forEach((li, i) => {
      setTimeout(() => li.classList.add("is-visible"), reduceMotion ? 0 : i * 180 + 120);
    });
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.35 });
    timelineItems.forEach((li) => io.observe(li));
  } else {
    timelineItems.forEach((li) => li.classList.add("is-visible"));
  }

  /* ---------- Constellation: nothing hidden, hover isolates ---------- */
  // Handled in CSS (.constellation:hover .cluster dims siblings).

  /* ---------- Clock ---------- */
  const clock = $("#clock");
  function tickClock() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- Project overlay ---------- */
  const PROJECTS = {
    smart: {
      type: "AI study platform",
      title: "Smart Student Companion",
      desc: "An AI-powered productivity platform that turns study material into something a student can act on.",
      features: ["AI notes summarization", "PDF upload", "Interactive MCQ generation", "AI doubt solver", "Smart study planner", "AI tutor"],
      stack: "[Add stack, for example: Python, your AI API, frontend framework]",
    },
    medikiosk: {
      type: "Clinical intake concept",
      title: "MediKiosk",
      desc: "A digital clinical intake platform concept focused on the patient information and intake workflow.",
      features: ["Patient information management", "Clinical intake workflow", "Modern healthcare interface", "Privacy-conscious design"],
      stack: "[Add stack]",
    },
    portfolio: {
      type: "Experimental developer site",
      title: "Personal Portfolio",
      desc: "This site: an interactive developer portfolio built with HTML, CSS and vanilla JavaScript.",
      features: ["Custom cursor and magnetic controls", "Canvas particle field", "Scroll-triggered timeline", "Reduced-motion support"],
      stack: "HTML5, CSS3, vanilla JavaScript, Canvas API, IntersectionObserver",
    },
  };

  const overlay = $("#overlay");
  const closeBtn = $("#closeProject");
  let lastTrigger = null;

  function openProject(key, trigger) {
    const p = PROJECTS[key];
    if (!p) return;
    lastTrigger = trigger;
    $("#pType").textContent = p.type;
    $("#pTitle").textContent = p.title;
    $("#pDesc").textContent = p.desc;
    $("#pStack").textContent = p.stack;
    const list = $("#pFeatures");
    list.innerHTML = "";
    p.features.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      list.appendChild(li);
    });
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function closeProject() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger) lastTrigger.focus();
  }

  $$(".project").forEach((btn) => {
    btn.addEventListener("click", () => openProject(btn.dataset.project, btn));
  });
  closeBtn.addEventListener("click", closeProject);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeProject();
  });

  /* ---------- Connect terminal ---------- */
  const headingLines = ["LET'S CREATE SOMETHING UNEXPECTED."];
  const termHeading = $("#termHeading");
  let typed = false;
  function typeHeading() {
    if (typed) return;
    typed = true;
    const full = headingLines[0];
    if (reduceMotion) { termHeading.textContent = full; return; }
    let i = 0;
    const step = () => {
      termHeading.textContent = full.slice(0, i++);
      if (i <= full.length) setTimeout(step, 45);
    };
    step();
  }

  const form = $("#msgForm");
  const status = $("#formStatus");
  const sendBtn = form.querySelector(".send");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      status.textContent = "Fill in name, a valid email and a message.";
      form.reportValidity();
      return;
    }
    // No backend is connected, so nothing is sent. Show that honestly.
    sendBtn.classList.add("is-sent");
    sendBtn.textContent = "Saved locally";
    status.textContent = "This form is not connected to a server yet. Add an endpoint in script.js to send messages.";
    form.reset();
    setTimeout(() => {
      sendBtn.classList.remove("is-sent");
      sendBtn.textContent = "Send transmission";
    }, 3500);
  });

  /* ---------- Keyboard: arrow keys move between sections ---------- */
  const order = panels.map((p) => p.id);
  document.addEventListener("keydown", (e) => {
    if (!overlay.hidden || e.target.matches("input, textarea")) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = order.indexOf(current);
    const next = e.key === "ArrowRight" ? Math.min(i + 1, order.length - 1) : Math.max(i - 1, 0);
    if (next !== i) location.hash = order[next];
  });
})();
