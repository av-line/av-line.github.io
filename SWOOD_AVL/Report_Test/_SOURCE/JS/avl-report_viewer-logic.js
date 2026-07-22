/* avl-report_viewer-logic.js - Handles Three.js instantiation and rendering */

document.addEventListener("DOMContentLoaded", () => {
    initViewer();
});

let scene, camera, renderer, controls, model;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedMeshesArray = [];
let allComponents = [];
let isZUp = true; // Match SolidWorks Z-up environment
let clipPlanes = []; // Store X, Y, Z section planes

async function initViewer() {
    const container = document.getElementById('canvas-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingError = document.getElementById('loading-error');
    
    // 1. Scene setup
    scene = new THREE.Scene();
    
    // 2. Camera setup
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 5000);
    camera.position.set(2, 2, 2);
    camera.up.set(0, 0, 1); // Initialize as Z-up

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    // Good tone mapping for CAD
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.localClippingEnabled = true; // IMPORTANT for Section Views
    container.appendChild(renderer.domElement);

    // Setup Clipping Planes (X, Y, Z) pointing inward
    clipPlanes = [
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
    ];

    // 4. Controls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; // Disable damping so turning stops instantly when mouse is released
    controls.zoomSpeed = -1; // Invert zoom to match SolidWorks

    // SolidWorks Navigation Style
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.NONE, // Left click is strictly for selection, no camera orbit
        MIDDLE: THREE.MOUSE.ROTATE, // Scroll wheel click = Rotate
        RIGHT: THREE.MOUSE.PAN // Right click = Pan
    };

    // SolidWorks: Ctrl + Scroll wheel click = Pan
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Control') controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Control') controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
    });

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(-10, -20, -15);
    scene.add(backLight);

    // Resize Handler
    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // 6. Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // 7. Load GLB Data (Unless instructed to wait for dynamic files)
    if (!window.VIEWER_EMPTY_START) {
        try {
            await loadModelFromBase64();
            // Hide loader gracefully
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        } catch (err) {
            console.error("Error loading model:", err);
            loadingError.style.display = 'block';
            loadingError.innerText = "Error: " + err;
            // Turn off spinner so they see the error
            const spinnerEle = loadingOverlay.querySelector('.spinner');
            if(spinnerEle) spinnerEle.style.display = 'none';
            loadingOverlay.style.background = 'rgba(0,0,0,0.8)';
        }
    } else {
        // Just hide the overlay instantly to reveal the empty canvas
        loadingOverlay.style.display = 'none';
    }

    // 8. Toolbar Listeners
    setupToolbar();
    setupRaycaster(container);
    setupSearch();
}

async function loadModelFromBase64() {
    return new Promise(async (resolve, reject) => {
        // testGlbData should be defined in test-glb-data.js inside window scope
        if (typeof testGlbData === 'undefined') {
            reject("No base64 data found. Please run the conversion script to create test-glb-data.js!");
            return;
        }

        try {
            const loader = new THREE.GLTFLoader();
            
            // 1. Manually decode Base64 to ArrayBuffer to bypass all browser offline fetch/XHR restrictions
            let b64Data = testGlbData;
            if (b64Data.includes(',')) {
                b64Data = b64Data.split(',')[1];
            }
            
            let binary_string = window.atob(b64Data);
            let len = binary_string.length;
            let bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary_string.charCodeAt(i);
            }

            // 2. Pass raw bytes directly to Three.js
            loader.parse(
                bytes.buffer,
                '', // empty path
                (gltf) => {
                    model = gltf.scene;
                    setupLoadedModel(model, resolve);
                },
                (error) => {
                    console.error('An error happened in GLTFLoader.parse:', error);
                    reject('GLTFLoader Parse Error: ' + error.message);
                }
            );
        } catch (e) {
            reject(e.message);
        }
    });
}

function setupLoadedModel(loadedModel, resolve) {
    // 1. Traverse mesh
    loadedModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material = child.material.clone(); // Unshare material so highlighting one piece doesn't highlight everything
                child.userData.originalColor = child.material.color ? child.material.color.clone() : null;
                child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : null;
                
                // Section Cuts Config
                child.material.clippingPlanes = clipPlanes;
                child.material.clipShadows = true;
                child.material.side = THREE.DoubleSide; // Render inner faces when cut hollow
            }
            
            // Add edges for "shaded with edges" look
            const edges = new THREE.EdgesGeometry(child.geometry, 15); // 15 degree threshold
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.5 });
            lineMaterial.clippingPlanes = clipPlanes; // Ensure edges are clipped too!
            
            const line = new THREE.LineSegments(edges, lineMaterial);
            child.add(line);
        }
    });

    // 2. Automatically Center the model
    const box = new THREE.Box3().setFromObject(loadedModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    loadedModel.position.x += (loadedModel.position.x - center.x);
    loadedModel.position.y += (loadedModel.position.y - center.y);
    loadedModel.position.z += (loadedModel.position.z - center.z);
    
    scene.add(loadedModel);
    
    // Recalculate Post-Center Box for accurate Clipping Planes UI Slider bounds
    const centeredBox = new THREE.Box3().setFromObject(loadedModel);
    clipPlanes[0].constant = centeredBox.max.x;
    clipPlanes[1].constant = centeredBox.max.y;
    clipPlanes[2].constant = centeredBox.max.z;
    setupSectionUI(centeredBox);
    
    // 2.5 Build Search Index
    allComponents = [];
    loadedModel.traverse((child) => {
        if (child.name && !child.name.match(/^(Node|Mesh|Material|Scene)/i)) {
            allComponents.push({ name: child.name, node: child });
        }
    });
    
    // 3. Auto scale camera (Isometric View)
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraDistance *= 1.5; 
    
    // Isometric projection (equal x, y, z offsets from center)
    const offset = cameraDistance / Math.sqrt(3);
    camera.position.set(offset, offset, offset);
    controls.target.set(0, 0, 0);
    
    if (resolve) resolve(loadedModel);
}

window.loadGLBFromURL = async function(url) {
    return new Promise((resolve, reject) => {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingError = document.getElementById('loading-error');
        const viewerControls = document.querySelector('.viewer-info-container');
        const canvasContainer = document.getElementById('canvas-container');
        const fallbackContainer = document.getElementById('cabinet-img-fallback-container');
        const fallbackImg = document.getElementById('cabinet-img-fallback');
        const fallbackErr = document.getElementById('cabinet-img-error');

        // Reset visibility to show 3D viewer elements, hide fallback container
        if (viewerControls) viewerControls.style.display = 'block';
        if (canvasContainer) canvasContainer.style.display = 'block';
        if (fallbackContainer) fallbackContainer.style.display = 'none';
        if (fallbackImg) {
            fallbackImg.style.display = 'none';
            fallbackImg.src = '';
            fallbackImg.onload = () => {
                fallbackImg.style.display = 'block';
                if (fallbackErr) fallbackErr.style.display = 'none';
            };
            fallbackImg.onerror = () => {
                fallbackImg.style.display = 'none';
                if (fallbackErr) fallbackErr.style.display = 'block';
            };
        }
        if (fallbackErr) fallbackErr.style.display = 'none';

        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            loadingOverlay.style.opacity = '1';
            const spinnerEle = loadingOverlay.querySelector('.spinner');
            if (spinnerEle) spinnerEle.style.display = 'block';
            loadingOverlay.style.background = 'rgba(0,0,0,0.5)';
        }
        if (loadingError) loadingError.style.display = 'none';

        if (model && scene) {
            scene.remove(model);
            model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                }
            });
            model = null;
        }

        // Auto-convert requested path to .js because of offline security restrictions
        if (url.endsWith('.glb') || url.endsWith('.GLB')) {
            url = url.substring(0, url.length - 4) + '.js';
        }

        const scriptId = 'dynamic-glb-loader';
        let existingScript = document.getElementById(scriptId);
        if (existingScript) existingScript.remove();

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = url;

        script.onload = () => {
            if (typeof window.dynamicGlbData === 'undefined') {
                handleError(new Error("File loaded but no data found. Please run the Base64 conversion script."));
                return;
            }

            try {
                let b64Data = window.dynamicGlbData;
                if (b64Data.includes(',')) b64Data = b64Data.split(',')[1];
                
                let binary_string = window.atob(b64Data);
                let len = binary_string.length;
                let bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binary_string.charCodeAt(i);
                }

                const loader = new THREE.GLTFLoader();
                loader.parse(
                    bytes.buffer,
                    '',
                    (gltf) => {
                        model = gltf.scene;
                        setupLoadedModel(model, () => {});
                        
                        if (loadingOverlay) {
                            loadingOverlay.style.opacity = '0';
                            setTimeout(() => loadingOverlay.style.display = 'none', 500);
                        }
                        
                        // Memory cleanup
                        window.dynamicGlbData = undefined;
                        script.remove();
                        resolve(model);
                    },
                    (error) => {
                        handleError(new Error("ThreeJS Parse Error: " + error.message));
                    }
                );
            } catch (e) {
                handleError(e);
            }
        };

        script.onerror = () => {
            handleError(new Error("Missing encoded file. You must trigger post-conversion on: " + url.split('/').pop()));
        };

        document.body.appendChild(script);

        function handleError(error) {
            console.error("Error loading GLB Script:", error);
            
            let filename = '';
            const filenameMatch = url.match(/\/([^\/]+)\.(glb|GLB|js|JS)$/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            } else {
                const parts = url.split('/');
                const lastPart = parts[parts.length - 1];
                filename = lastPart.split('.')[0];
            }

            if (fallbackContainer && fallbackImg && filename && filename !== 'undefined') {
                // Hide 3D viewer elements
                if (viewerControls) viewerControls.style.display = 'none';
                if (canvasContainer) canvasContainer.style.display = 'none';
                
                // Show fallback container
                fallbackContainer.style.display = 'flex';
                
                // Point fallback image to the JPG file
                fallbackImg.src = `../IMG/Cabs/${filename}_CAB.jpg`;
                
                // Hide loading overlay gracefully without showing a disruptive 3D load error
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                if (loadingError) loadingError.style.display = 'none';
                
                resolve(null);
                return;
            }

            if (loadingError) {
                loadingError.style.display = 'block';
                loadingError.innerText = "Error: Could not load 3D Model. " + error.message;
            }
            if (loadingOverlay) {
                // Remove freeze-state overlay entirely to let them see the Table
                loadingOverlay.style.display = 'none';
            }
            reject(error);
        }

        document.body.appendChild(script);
    });
};

function setupToolbar() {
    let wireframeMode = false;

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (!model) return;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraDistance *= 1.5;

            // Isometric transition
            const offset = cameraDistance / Math.sqrt(3);
            camera.position.set(offset, offset, offset);
            controls.target.set(0, 0, 0);
        });
    }

    const btnAxis = document.getElementById('btn-axis');
    if (btnAxis) {
        btnAxis.addEventListener('click', (e) => {
            isZUp = !isZUp;
            if (isZUp) {
                camera.up.set(0, 0, 1); // Z-Up
                e.currentTarget.classList.remove('active');
            } else {
                camera.up.set(0, 1, 0); // Y-Up
                e.currentTarget.classList.add('active');
            }
            // Force the camera view to refresh onto the new vertical axis
            const btnR = document.getElementById('btn-reset');
            if (btnR) btnR.click();
        });
    }

    const btnTrans = document.getElementById('btn-transparency');
    if (btnTrans) {
        btnTrans.addEventListener('click', (e) => {
            if (!model) return;
            
            const btn = e.currentTarget;
            const isTransparent = btn.classList.toggle('active');
            
            setModelTransparency(isTransparent, selectedMeshesArray);
        });
    }
}

let lastTransparencyState = { isTransparent: null, ignoredId: null };

function setModelTransparency(isTransparent, ignoreMeshes = []) {
    if (!model) return;
    
    // Performance: Only traverse if the transparency state OR the selected component changed
    const currentIgnoredId = ignoreMeshes.length > 0 ? ignoreMeshes[0].uuid : null;
    if (lastTransparencyState.isTransparent === isTransparent && lastTransparencyState.ignoredId === currentIgnoredId) {
        return;
    }
    lastTransparencyState = { isTransparent, ignoredId: currentIgnoredId };

    model.traverse((child) => {
        if (child.isMesh && child.material) {
            // Handle multi-materials or single materials
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach(mat => {
                // Save original state once
                if (child.userData.originalOpacity === undefined) {
                    child.userData.originalOpacity = mat.opacity;
                    child.userData.originalTransparent = mat.transparent;
                    child.userData.originalDepthWrite = mat.depthWrite;
                }

                const shouldBeGhost = isTransparent && !ignoreMeshes.includes(child);

                if (shouldBeGhost) {
                    mat.transparent = true;
                    mat.depthWrite = false;
                    mat.opacity = 0.2;
                    mat.needsUpdate = true;
                } else {
                    // Restore original state
                    mat.opacity = child.userData.originalOpacity;
                    mat.transparent = child.userData.originalTransparent;
                    mat.depthWrite = child.userData.originalDepthWrite;
                    mat.needsUpdate = true;
                }
            });
        }
    });
}

function setupRaycaster(container) {
    const label = document.getElementById('component-label');

    window.addEventListener('pointerdown', (event) => {
        if (!model) return;
        if (event.button !== 0) return; // Only select components on Left Click

        // Ensure we're targeting the canvas container
        const rect = container.getBoundingClientRect();
        
        // Don't raycast if clicking outside the canvas
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
            return;
        }

        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Raycast against the model, but filter out line segments and invisible bounds
        const intersects = raycaster.intersectObject(model, true);
        const meshIntersects = intersects.filter(i => 
            i.object.isMesh && 
            i.object.type !== 'LineSegments' &&
            i.object.visible !== false &&
            i.object.material.opacity > 0
        );

        if (meshIntersects.length > 0) {
            let hitNode = meshIntersects[0].object;
            let name = "";
            let current = hitNode;
            let componentRoot = current;
            while (current && current !== scene) {
                // Ignore empty names, or generic GLTF exports like "Node-..." or "Mesh-..."
                if (current.name && !current.name.match(/^(Node|Mesh|Material|Scene)/i)) {
                    name = current.name;
                    componentRoot = current; // Found the SolidWorks component group!
                    break;
                }
                current = current.parent;
            }
            if (!name) name = hitNode.name || "Unknown Component";
            
            selectComponent(componentRoot, name);
        } else {
            selectComponent(null, "");
        }
    });
}

function selectComponent(rootNode, name) {
    const label = document.getElementById('component-label');
    const searchInput = document.getElementById('component-search');
    
    // Clear previous selection
    selectedMeshesArray.forEach(mesh => {
        if (mesh.material && mesh.userData.originalEmissive) {
            mesh.material.emissive.copy(mesh.userData.originalEmissive);
            if (mesh.userData.originalColor) mesh.material.color.copy(mesh.userData.originalColor);
        }
    });
    selectedMeshesArray = [];

    if (rootNode) {
        // Highlight whole component by traversing the group
        rootNode.traverse((c) => {
            if (c.isMesh && c.material && c.type !== 'LineSegments') {
                selectedMeshesArray.push(c);
                // Save originals BEFORE overwriting
                if (!c.userData.originalEmissive) c.userData.originalEmissive = c.material.emissive.clone();
                if (!c.userData.originalColor) c.userData.originalColor = c.material.color.clone();
                c.material.emissive.setHex(0x0099d9); // Theme Blue
                c.material.color.setHex(0x0099d9);    // Theme Blue
            }
        });
        
        if (label) {
            label.innerText = name ? "Selected: " + name : "Selected Component";
            label.style.display = 'block';
        }

        // Automatically dive into waterdrop mode for everything else!
        setModelTransparency(true, selectedMeshesArray);

        // Notify Table (Reverse Direction)
        if (typeof window.onComponentSelected === 'function') {
            try { window.onComponentSelected(name); } catch(e) { console.error(e); }
        }
    } else {
        if (label) label.style.display = 'none';
        if (searchInput) searchInput.value = '';

        // Reset if we clicked off, checking if manual transparency is off
        const manualBtn = document.getElementById('btn-transparency');
        const isManualGhost = manualBtn && manualBtn.classList.contains('active');
        setModelTransparency(isManualGhost, []);

        // Notify Table (Clear Selection)
        if (typeof window.onComponentSelected === 'function') {
            try { window.onComponentSelected(""); } catch(e) { console.error(e); }
        }
    }
}

function setupSearch() {
    const input = document.getElementById('component-search');
    const resultsUl = document.getElementById('search-results');
    if (!input || !resultsUl) return;
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        resultsUl.innerHTML = '';
        if (query.length < 1) {
            resultsUl.style.display = 'none';
            return;
        }
        
        // Use a Set to avoid duplicate names in search list
        const matches = [];
        const seenNames = new Set();
        for (let c of allComponents) {
            if (c.name.toLowerCase().includes(query) && !seenNames.has(c.name)) {
                matches.push(c);
                seenNames.add(c.name);
            }
            if (matches.length >= 30) break; // limit to 30 items
        }
        
        if (matches.length > 0) {
            resultsUl.style.display = 'block';
            matches.forEach(match => {
                const li = document.createElement('li');
                li.style.padding = '8px 12px';
                li.style.cursor = 'pointer';
                li.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                li.innerText = match.name;
                li.addEventListener('mouseenter', () => li.style.background = 'rgba(255,255,255,0.1)');
                li.addEventListener('mouseleave', () => li.style.background = 'transparent');
                li.addEventListener('click', () => {
                    selectComponent(match.node, match.name);
                    input.value = match.name;
                    resultsUl.style.display = 'none';
                });
                resultsUl.appendChild(li);
            });
        } else {
            resultsUl.style.display = 'none';
        }
    });
    
    // Hide dropdown if clicked outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            resultsUl.style.display = 'none';
        }
    });
}

window.highlightComponentByName = function(filename) {
    if (!allComponents || !filename) {
        selectComponent(null, "");
        return;
    }
    const query = filename.toLowerCase();
    for (let c of allComponents) {
        if (c.name.toLowerCase().includes(query)) {
            selectComponent(c.node, c.name);
            return;
        }
    }
    // If no match found, clear selection
    selectComponent(null, "");
};

function setupSectionUI(box) {
    const btn = document.getElementById('btn-clipping');
    const panel = document.getElementById('section-controls');
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
        const isActive = e.currentTarget.classList.toggle('active');
        panel.style.display = isActive ? 'flex' : 'none';
    });

    // Each axis plane slider needs range bounded to the model dimensions
    const axes = [
        { id: 'clip-x', valId: 'val-clip-x', flipId: 'flip-clip-x', min: box.min.x, max: box.max.x, planeIdx: 0 },
        { id: 'clip-y', valId: 'val-clip-y', flipId: 'flip-clip-y', min: box.min.y, max: box.max.y, planeIdx: 1 },
        { id: 'clip-z', valId: 'val-clip-z', flipId: 'flip-clip-z', min: box.min.z, max: box.max.z, planeIdx: 2 }
    ];

    axes.forEach(axis => {
        const slider = document.getElementById(axis.id);
        const valLabel = document.getElementById(axis.valId);
        const flipBtn = document.getElementById(axis.flipId);
        if (!slider || !valLabel) return;
        
        let dirFlip = 1;
        
        if (flipBtn) {
            flipBtn.addEventListener('click', () => {
                dirFlip *= -1;
                clipPlanes[axis.planeIdx].normal.multiplyScalar(-1);
                clipPlanes[axis.planeIdx].constant = parseFloat(slider.value) * dirFlip;
                flipBtn.style.color = dirFlip === -1 ? 'var(--color-active-primary)' : 'inherit';
            });
        }
        
        slider.min = axis.min;
        slider.max = axis.max;
        slider.step = (axis.max - axis.min) / 500; // smooth 500 steps
        slider.value = axis.max; // start fully un-clipped
        valLabel.innerText = Math.round(axis.max);

        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valLabel.innerText = Math.round(val);
            clipPlanes[axis.planeIdx].constant = val * dirFlip;
        });
    });
}
