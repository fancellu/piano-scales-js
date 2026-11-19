// 3D keyboard view using three.js (ES modules, loaded lazily from CDN on first use).
// The 'three' and 'three/addons/' specifiers are resolved by the import map in piano_scales.html.
// Exposes window.Piano3D = { enable, disable, update, pulse, setTheme }.
(function () {
    let THREE = null;
    let OrbitControls = null;

    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    // Black key -> index of the white key it sits to the right of
    const BLACK_AFTER = { 'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5 };

    const WHITE = { w: 0.96, h: 0.5, len: 4.5 };
    const BLACK = { w: 0.56, h: 0.5, len: 2.8 };

    const THEMES = {
        light: { bg: 0xe6ecf1, caseColor: 0x2c2f36, ringColor: 0x8a94a3, labelWhite: '#444', labelBlack: '#ddd' },
        dark:  { bg: 0x16191d, caseColor: 0x0d0e10, ringColor: 0x5a6270, labelWhite: '#333', labelBlack: '#ccc' },
    };
    const SELECTED_COLOR = 0x4a90e2;
    const ROOT_COLOR = 0xff9a1f;
    const KEY_SELECTED_COLOR = 0x2a6fd6; // deeper blue so lit key tops don't wash out
    const KEY_ROOT_COLOR = 0xf08a10;

    let loadPromise = null;
    let built = false;
    let running = false;
    let container = null;
    let api = null;
    let theme = 'light';
    let state = { selected: [], root: null, labels: {} };

    // three.js objects
    let renderer, scene, camera, controls, clock, raycaster, pointer;
    let keys = {};          // note -> { pivot, mesh, label, baseColor, isBlack, press, glow, rootGlow, pulse, hover }
    let ringGroup, ringNodes = {}, ringLine, ringFill, ringCircle, rootOrb, rootLight, ground, caseMesh;
    let hoveredNote = null;
    let lastInteraction = -Infinity;
    let resizeObserver = null;

    function ensureThree() {
        if (THREE && OrbitControls) return Promise.resolve();
        if (!loadPromise) {
            loadPromise = Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')])
                .then(([threeModule, orbitModule]) => {
                    THREE = threeModule;
                    OrbitControls = orbitModule.OrbitControls;
                })
                .catch(err => { loadPromise = null; throw err; });
        }
        return loadPromise;
    }

    // Minimal clock (THREE.Clock is deprecated in recent releases)
    function makeClock() {
        const start = performance.now();
        let last = start;
        return {
            getDelta() { const now = performance.now(); const d = (now - last) / 1000; last = now; return d; },
            getElapsedTime() { return (performance.now() - start) / 1000; },
        };
    }

    // --- Label textures ---
    function makeLabelCanvas() {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 64;
        return c;
    }

    function drawLabel(canvas, text, color) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = color;
        ctx.font = 'bold 40px -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    }

    function makeLabelMesh(width) {
        const canvas = makeLabelCanvas();
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 2), mat);
        mesh.userData.canvas = canvas;
        mesh.userData.text = null;
        mesh.userData.color = null;
        return mesh;
    }

    function setLabel(mesh, text, color) {
        if (mesh.userData.text === text && mesh.userData.color === color) return;
        drawLabel(mesh.userData.canvas, text, color);
        mesh.material.map.needsUpdate = true;
        mesh.userData.text = text;
        mesh.userData.color = color;
    }

    // --- Scene construction ---
    function build() {
        scene = new THREE.Scene();
        clock = makeClock();
        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        container.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(40, 2, 0.1, 100);
        camera.position.set(0, 6.0, 8.3);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0.9, -0.9);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.minDistance = 5;
        controls.maxDistance = 16;
        controls.maxPolarAngle = 1.4;
        controls.addEventListener('start', () => { lastInteraction = clock.getElapsedTime(); controls.autoRotate = false; });
        controls.addEventListener('end', () => { lastInteraction = clock.getElapsedTime(); });

        // Lights
        scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.4));
        const sun = new THREE.DirectionalLight(0xffffff, 2.2);
        sun.position.set(4, 9, 6);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
        sun.shadow.bias = -0.0005;
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x9fc4ff, 1.1);
        rim.position.set(-6, 4, -6);
        scene.add(rim);

        // Ground (shadow catcher)
        ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.18 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.0;
        ground.receiveShadow = true;
        scene.add(ground);

        // Keyboard case
        const caseMat = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.5, metalness: 0.2 });
        caseMesh = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.4, 5.0), caseMat);
        base.position.set(0, -0.8, 0);
        const back = new THREE.Mesh(new THREE.BoxGeometry(7.7, 1.6, 0.6), caseMat);
        back.position.set(0, -0.05, -WHITE.len / 2 - 0.3);
        const cheekGeo = new THREE.BoxGeometry(0.3, 1.25, 5.0);
        const cheekL = new THREE.Mesh(cheekGeo, caseMat);
        cheekL.position.set(-3.7, -0.38, 0);
        const cheekR = cheekL.clone();
        cheekR.position.x = 3.7;
        [base, back, cheekL, cheekR].forEach(m => { m.castShadow = true; m.receiveShadow = true; caseMesh.add(m); });
        caseMesh.userData.mat = caseMat;
        scene.add(caseMesh);

        buildKeys();
        buildRing();

        // Root marker orb
        rootOrb = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 24, 16),
            new THREE.MeshStandardMaterial({ color: ROOT_COLOR, emissive: ROOT_COLOR, emissiveIntensity: 0.55 })
        );
        rootLight = new THREE.PointLight(ROOT_COLOR, 2.5, 3, 1);
        rootOrb.add(rootLight);
        rootOrb.visible = false;
        scene.add(rootOrb);

        // Pointer interaction
        const el = renderer.domElement;
        let downPos = null;
        el.addEventListener('pointerdown', e => { downPos = { x: e.clientX, y: e.clientY }; });
        el.addEventListener('pointerup', e => {
            if (!downPos) return;
            const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
            downPos = null;
            if (moved > 5) return;
            const note = pickNote(e);
            if (note && api && api.toggleNote) api.toggleNote(note);
        });
        el.addEventListener('pointermove', e => {
            hoveredNote = pickNote(e);
            el.style.cursor = hoveredNote ? 'pointer' : 'grab';
        });
        el.addEventListener('pointerleave', () => { hoveredNote = null; });

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);

        built = true;
        applyTheme();
        applyState();
        resize();
    }

    function buildKeys() {
        const whiteGeo = new THREE.BoxGeometry(WHITE.w, WHITE.h, WHITE.len);
        const blackGeo = new THREE.BoxGeometry(BLACK.w, BLACK.h, BLACK.len);
        const backZ = -WHITE.len / 2;

        NOTES.forEach(note => {
            const isBlack = note.includes('#');
            const dims = isBlack ? BLACK : WHITE;
            const x = isBlack ? (BLACK_AFTER[note] - 3) + 0.5 : WHITE_NOTES.indexOf(note) - 3;
            const y = isBlack ? 0.35 : 0;

            // Pivot at the back edge so keys tilt like real keys
            const pivot = new THREE.Group();
            pivot.position.set(x, y, backZ);
            const baseColor = new THREE.Color(isBlack ? 0x1b1b1f : 0xf7f6f1);
            const mat = new THREE.MeshStandardMaterial({
                color: baseColor.clone(),
                roughness: isBlack ? 0.28 : 0.38,
                metalness: isBlack ? 0.15 : 0.0,
                emissive: new THREE.Color(0x000000),
            });
            const mesh = new THREE.Mesh(isBlack ? blackGeo : whiteGeo, mat);
            mesh.position.z = dims.len / 2;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.note = note;
            pivot.add(mesh);

            const label = makeLabelMesh(isBlack ? 0.55 : 0.8);
            label.rotation.x = -Math.PI / 2;
            label.position.set(0, dims.h / 2 + 0.002, dims.len / 2 - (isBlack ? 0.35 : 0.5));
            label.userData.note = note;
            mesh.add(label);

            scene.add(pivot);
            keys[note] = { pivot, mesh, label, baseColor, isBlack, press: 0, glow: 0, rootGlow: 0, pulse: 0, hover: 0 };
        });
    }

    function buildRing() {
        ringGroup = new THREE.Group();
        ringGroup.position.set(0, 2.55, -3.9);
        scene.add(ringGroup);

        const R = 1.25;
        ringCircle = new THREE.Mesh(
            new THREE.TorusGeometry(R, 0.012, 8, 96),
            new THREE.MeshBasicMaterial({ color: 0x8a94a3, transparent: true, opacity: 0.5 })
        );
        ringGroup.add(ringCircle);

        NOTES.forEach((note, i) => {
            const a = Math.PI / 2 - i * (Math.PI * 2 / 12);
            const pos = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
            const mat = new THREE.MeshStandardMaterial({ color: 0x9aa3b0, emissive: 0x000000, roughness: 0.4 });
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), mat);
            sphere.position.copy(pos);
            ringGroup.add(sphere);

            const label = makeLabelMesh(0.5);
            label.position.copy(pos).multiplyScalar(1.27);
            ringGroup.add(label);

            ringNodes[note] = { sphere, label, pos, lit: 0, pulse: 0 };
        });

        ringLine = new THREE.LineLoop(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: SELECTED_COLOR })
        );
        ringGroup.add(ringLine);

        ringFill = new THREE.Mesh(
            new THREE.BufferGeometry(),
            new THREE.MeshBasicMaterial({ color: SELECTED_COLOR, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
        );
        ringGroup.add(ringFill);
    }

    function rebuildRingShape() {
        const pts = NOTES.filter(n => state.selected.includes(n)).map(n => ringNodes[n].pos);
        ringLine.geometry.dispose();
        ringLine.geometry = new THREE.BufferGeometry().setFromPoints(pts.length >= 2 ? pts : []);
        ringFill.geometry.dispose();
        if (pts.length >= 3) {
            const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y)));
            ringFill.geometry = new THREE.ShapeGeometry(shape);
        } else {
            ringFill.geometry = new THREE.BufferGeometry();
        }
    }

    function pickNote(e) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(Object.values(keys).map(k => k.mesh), true);
        for (const hit of hits) {
            let o = hit.object;
            while (o && !o.userData.note) o = o.parent;
            if (o) return o.userData.note;
        }
        return null;
    }

    function resize() {
        if (!built) return;
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = w / h;
        camera.zoom = Math.min(1, camera.aspect / 1.6);
        camera.updateProjectionMatrix();
    }

    // --- State & theme application ---
    function applyState() {
        if (!built) return;
        const t = THEMES[theme] || THEMES.light;
        NOTES.forEach(note => {
            const k = keys[note];
            const selected = state.selected.includes(note);
            const display = state.labels[note] || note;
            setLabel(k.label, display, selected ? '#ffffff' : (k.isBlack ? t.labelBlack : t.labelWhite));
            const rn = ringNodes[note];
            setLabel(rn.label, display, theme === 'dark' ? '#cfd6df' : '#3a4250');
        });
        rebuildRingShape();
    }

    function applyTheme() {
        if (!built) return;
        const t = THEMES[theme] || THEMES.light;
        scene.background = new THREE.Color(t.bg);
        scene.fog = new THREE.Fog(t.bg, 14, 30);
        ground.material.opacity = theme === 'dark' ? 0.35 : 0.18;
        caseMesh.userData.mat.color.set(t.caseColor);
        ringCircle.material.color.set(t.ringColor);
        applyState();
    }

    // --- Animation ---
    let selColor, rootColor, keySelColor, keyRootColor, hoverColor, c1;

    function tick() {
        if (!running) return;
        requestAnimationFrame(tick);

        const dt = Math.min(clock.getDelta(), 0.05);
        const time = clock.getElapsedTime();
        const ease = 1 - Math.exp(-dt * 12);

        if (!selColor) {
            selColor = new THREE.Color(SELECTED_COLOR);
            rootColor = new THREE.Color(ROOT_COLOR);
            hoverColor = new THREE.Color(0x88aaff);
            keySelColor = new THREE.Color(KEY_SELECTED_COLOR);
            keyRootColor = new THREE.Color(KEY_ROOT_COLOR);
            c1 = new THREE.Color();
        }

        NOTES.forEach(note => {
            const k = keys[note];
            const selected = state.selected.includes(note);
            const isRoot = state.root === note;
            k.press += ((selected ? 1 : 0) - k.press) * ease;
            k.glow += ((selected ? 1 : 0) - k.glow) * ease;
            k.rootGlow += ((isRoot ? 1 : 0) - k.rootGlow) * ease;
            k.hover += ((hoveredNote === note ? 1 : 0) - k.hover) * ease;
            k.pulse = Math.max(0, k.pulse - dt * 3);

            const len = k.isBlack ? BLACK.len : WHITE.len;
            const angle = (k.press * 0.08 + k.pulse * 0.1) * (0.7 * WHITE.len / len);
            k.pivot.rotation.x = angle;

            const mat = k.mesh.material;
            c1.copy(k.baseColor).lerp(keySelColor, k.glow * 0.9).lerp(keyRootColor, k.rootGlow * 0.9);
            mat.color.copy(c1);
            const sg = k.glow * 0.06 + k.pulse * 0.7, rg = k.rootGlow * 0.12, hg = k.hover * 0.1;
            mat.emissive.setRGB(
                selColor.r * sg + rootColor.r * rg + hoverColor.r * hg,
                selColor.g * sg + rootColor.g * rg + hoverColor.g * hg,
                selColor.b * sg + rootColor.b * rg + hoverColor.b * hg
            );

            const rn = ringNodes[note];
            rn.lit += ((selected ? 1 : 0) - rn.lit) * ease;
            rn.pulse = Math.max(0, rn.pulse - dt * 3);
            const s = 1 + rn.lit * 0.5 + rn.pulse * 0.8;
            rn.sphere.scale.setScalar(s);
            const target = isRoot ? rootColor : selColor;
            rn.sphere.material.color.setHex(0x9aa3b0).lerp(target, rn.lit);
            rn.sphere.material.emissive.copy(target).multiplyScalar(rn.lit * 0.3 + rn.pulse * 0.8);
        });

        // Gentle ring sway
        ringGroup.rotation.y = Math.sin(time * 0.35) * 0.25;
        ringGroup.position.y = 2.55 + Math.sin(time * 0.8) * 0.05;

        // Root orb follows the root key
        if (state.root && keys[state.root]) {
            const k = keys[state.root];
            const len = k.isBlack ? BLACK.len : WHITE.len;
            const tx = k.pivot.position.x;
            const ty = k.pivot.position.y + 0.75 + Math.sin(time * 3) * 0.06;
            const tz = -WHITE.len / 2 + len * (k.isBlack ? 0.8 : 0.9);
            if (!rootOrb.visible) { rootOrb.position.set(tx, ty, tz); rootOrb.visible = true; }
            rootOrb.position.x += (tx - rootOrb.position.x) * ease;
            rootOrb.position.y += (ty - rootOrb.position.y) * ease;
            rootOrb.position.z += (tz - rootOrb.position.z) * ease;
        } else {
            rootOrb.visible = false;
        }

        // Gentle idle sway once the user has left the camera alone for a while
        if (time - lastInteraction > 5) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = Math.sin(time * 0.25) * 0.8;
        }

        controls.update();
        renderer.render(scene, camera);
    }

    // --- Public API ---
    window.Piano3D = {
        enable(el, callbacks) {
            container = el;
            api = callbacks;
            return ensureThree().then(() => {
                if (!built) build();
                resize();
                if (!running) {
                    running = true;
                    clock.getDelta();
                    tick();
                }
            });
        },
        disable() {
            running = false;
        },
        update(newState) {
            state = {
                selected: newState.selected || [],
                root: newState.root || null,
                labels: newState.labels || {},
            };
            applyState();
        },
        pulse(note) {
            if (!built) return;
            if (keys[note]) keys[note].pulse = 1;
            if (ringNodes[note]) ringNodes[note].pulse = 1;
        },
        setTheme(newTheme) {
            theme = newTheme;
            applyTheme();
        },
    };
})();
