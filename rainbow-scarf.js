(function () {
    'use strict';

    const palette = ['#ef3340', '#ff8c24', '#ffe347', '#35c86f', '#27bce5', '#4855dc', '#a84ddd'];
    const svgNS = 'http://www.w3.org/2000/svg';

    function updateIntro() {
        const art = document.querySelector('.intro-art');
        const scarf = art?.querySelector('path[stroke="#d7263d"]');
        if (!scarf) return;
        const defs = document.createElementNS(svgNS, 'defs');
        const gradient = document.createElementNS(svgNS, 'linearGradient');
        gradient.id = 'rainbow-scarf-gradient';
        gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
        gradient.setAttribute('x1', '150');
        gradient.setAttribute('x2', '70');
        gradient.setAttribute('y1', '50');
        gradient.setAttribute('y2', '50');
        palette.forEach((color, index) => {
            const stop = document.createElementNS(svgNS, 'stop');
            stop.setAttribute('offset', index / (palette.length - 1) * 100 + '%');
            stop.setAttribute('stop-color', color);
            gradient.append(stop);
        });
        defs.append(gradient);
        art.prepend(defs);
        scarf.setAttribute('stroke', 'url(#rainbow-scarf-gradient)');
        const description = document.querySelector('.sub');
        if (description) {
            for (const node of description.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent = node.textContent.replace('围红围巾', '围彩虹围巾');
                }
            }
        }
    }

    function updateModel(app) {
        const knot = app.pelican.knot;
        let scene = app.pelican.root;
        while (scene.parent) scene = scene.parent;

        // The cloth is a scene-level 16-by-2 strip, outside the bird hierarchy.
        const candidates = [];
        scene.traverse((object) => {
            const geometry = object.geometry;
            if (object.isMesh && geometry?.attributes.color?.count === 32 &&
                geometry.attributes.position?.usage === 35048 &&
                geometry.index?.count === 90 && object.material?.vertexColors &&
                object.material.roughness === 0.75 && !object.frustumCulled) {
                candidates.push(object);
            }
        });
        if (candidates.length !== 1) {
            console.error('Rainbow scarf: expected one cloth mesh, found', candidates.length);
            return;
        }

        // Reuse Three's Color class to keep vertex colors in linear space.
        const colors = palette.map((hex) => knot.material.color.clone().set(hex));
        const sample = colors[0].clone();
        function colorAt(t) {
            const position = Math.max(0, Math.min(1, t)) * (colors.length - 1);
            const index = Math.min(Math.floor(position), colors.length - 2);
            return sample.copy(colors[index]).lerp(colors[index + 1], position - index);
        }

        const cloth = candidates[0];
        const attribute = cloth.geometry.attributes.color;
        const segments = attribute.count / 2;
        for (let i = 0; i < attribute.count; i++) {
            const color = colorAt(Math.floor(i / 2) / (segments - 1));
            attribute.setXYZ(i, color.r, color.g, color.b);
        }
        attribute.needsUpdate = true;

        // Preserve the knot's geometry and lighting, adding only color bands.
        const uv = knot.geometry.attributes.uv;
        const knotColors = new attribute.constructor(new Float32Array(uv.count * 3), 3);
        for (let i = 0; i < uv.count; i++) {
            const color = colorAt(uv.getX(i));
            knotColors.setXYZ(i, color.r, color.g, color.b);
        }
        knot.geometry.setAttribute('color', knotColors);
        knot.material = knot.material.clone();
        knot.material.color.set('#ffffff');
        knot.material.vertexColors = true;
        knot.material.needsUpdate = true;
        document.documentElement.dataset.rainbowScarf = 'ready';
    }

    function initialize() {
        updateIntro();
        const deadline = performance.now() + 30000;
        function waitForModel() {
            if (window.__pelican?.pelican) {
                updateModel(window.__pelican);
            } else if (performance.now() < deadline) {
                requestAnimationFrame(waitForModel);
            } else {
                console.error('Rainbow scarf: scene initialization timed out');
            }
        }
        waitForModel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();