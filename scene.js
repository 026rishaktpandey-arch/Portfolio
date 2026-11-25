/* Three.js background: metallic sculpture, particle field, mouse and scroll camera. */
const Universe = (() => {
  let renderer, scene, camera, sculpture, particles, lights = [];
  let mouse = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  let scrollProgress = 0;
  let running = false;
  let pointerEnabled = true;

  const isMobile = () => window.innerWidth < 768;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function supportsWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function init(canvas) {
    if (typeof THREE === "undefined" || !supportsWebGL()) {
      document.getElementById("noWebgl").hidden = false;
      return false;
    }

    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile(), alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.06);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    // Lights: cool key light plus rim lights for metallic highlights
    const key = new THREE.PointLight(0xbfd6ff, 2.2, 30); key.position.set(4, 3, 6);
    const rim = new THREE.PointLight(0x4d7cff, 1.6, 30); rim.position.set(-5, -2, -4);
    const fill = new THREE.AmbientLight(0x101824, 0.6);
    lights = [key, rim, fill];
    lights.forEach(l => scene.add(l));

    // Central metallic sculpture
    const geo = new THREE.TorusKnotGeometry(1.4, 0.42, isMobile() ? 120 : 220, 24);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd9dfea, metalness: 1.0, roughness: 0.18, emissive: 0x0a1222, emissiveIntensity: 0.6 });
    sculpture = new THREE.Mesh(geo, mat);
    scene.add(sculpture);

    // Particle field
    const count = isMobile() ? 600 : 2200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x9fc2ff, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false });
    particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    window.addEventListener("resize", onResize);
    if (pointerEnabled) window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });

    running = true;
    requestAnimationFrame(loop);
    return true;
  }

  function onPointer(e) {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function loop(t) {
    if (!running) return;
    const time = t * 0.001;
    const still = reduceMotion();

    mouse.x += (target.x - mouse.x) * 0.05;
    mouse.y += (target.y - mouse.y) * 0.05;

    // Camera follows the mouse and drifts with scroll
    camera.position.x = mouse.x * 0.8;
    camera.position.y = -mouse.y * 0.5 - scrollProgress * 3;
    camera.position.z = 9 - scrollProgress * 2;
    camera.lookAt(0, -scrollProgress * 1.5, 0);

    if (!still) {
      sculpture.rotation.x = time * 0.12 + mouse.y * 0.2;
      sculpture.rotation.y = time * 0.18 + mouse.x * 0.3;
      particles.rotation.y = time * 0.01;
    }
    sculpture.position.y = -scrollProgress * 2;

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function setPointerEnabled(on) { pointerEnabled = on; }

  /* Intro hooks: push the sculpture forward and energize particles on enter */
  function burst(duration = 1.2) {
    if (!window.gsap || !sculpture) return;
    gsap.fromTo(sculpture.scale, { x: 0.2, y: 0.2, z: 0.2 }, { x: 1, y: 1, z: 1, duration, ease: "expo.out" });
    gsap.fromTo(camera.position, { z: 16 }, { z: 9, duration: duration + 0.4, ease: "power3.inOut" });
    gsap.fromTo(particles.material, { opacity: 0 }, { opacity: 0.7, duration: 1.2 });
  }

  return { init, burst, setPointerEnabled, supportsWebGL };
})();
