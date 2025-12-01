// interaction.js
// Handles user interaction: planet selection, camera focus, cockpit view, and HUD

const Interaction = (() => {

    // -------------------------
    // State
    let selectedPlanet = null;
    let isMovingTowardsPlanet = false;
    let targetCameraPosition = null;

    const HOME_TARGET = [0, 0, 0];
    const HOME_DISTANCE = 35;
    let isReturningHome = false;

    let cockpitMode = false;
    let cockpitShipIndex = 0;
    let cockpitHUD = null;

    let isDragging = false;
    let lastMouseX = 0;

    // -------------------------
    // Cockpit controls
    const cockpitControls = {
        forward: false, backward: false,
        left: false, right: false,
        up: false, down: false,
        yawLeft: false, yawRight: false
    };
    const cockpitSpeed = 0.2;
    const rotationSpeed = 0.03;

    // -------------------------
    // Helpers
    const lerp = (a, b, t) => a + (b - a) * t;
    const lerpVec3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

    function multiplyMat4Vec4(mat, vec) {
        const [x, y, z, w] = vec;
        return [
            mat[0]*x + mat[4]*y + mat[8]*z + mat[12]*w,
            mat[1]*x + mat[5]*y + mat[9]*z + mat[13]*w,
            mat[2]*x + mat[6]*y + mat[10]*z + mat[14]*w,
            mat[3]*x + mat[7]*y + mat[11]*z + mat[15]*w
        ];
    }

    // -------------------------
    // Project 3D world position -> NDC
    function projectToNDC(worldPos) {
        const camX = Math.sin(camera.angle) * camera.distance;
        const camZ = Math.cos(camera.angle) * camera.distance;
        const camY = camera.height;

        const view = lookAt([camX, camY, camZ], camera.target, [0, 1, 0]);
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const proj = perspective(Math.PI/4, aspect, 0.1, 200.0);

        const v = multiplyMat4Vec4(proj, multiplyMat4Vec4(view, [...worldPos, 1]));
        if (Math.abs(v[3]) < 1e-6) return null;
        return [v[0]/v[3], v[1]/v[3], v[2]/v[3]];
    }

    // -------------------------
    // Show planet info panel
    function showPlanetInfo(planet) {
        const infoPanel = document.getElementById("planet-info");
        const infoName = document.getElementById("info-name");
        const infoText = document.getElementById("info-text");
        if (!infoPanel || !infoName || !infoText) return;

        infoName.textContent = planet.name;
        infoText.innerHTML = `
            <p><strong>Radius:</strong> ${planet.info.realRadius}</p>
            <p><strong>Tilt:</strong> ${planet.info.tilt}</p>
            <p><strong>Rotation:</strong> ${planet.info.rotationPeriod}</p>
            <p><strong>Orbit:</strong> ${planet.info.orbitPeriod}</p>
            <p><strong>Distance:</strong> ${planet.info.distance}</p>
            <p><strong>Moons:</strong> ${planet.info.moons}</p>
            <p><strong>Info:</strong> ${planet.info.description}</p>
        `;
        infoPanel.style.display = "block";
    }

    // -------------------------
    // Update camera (cockpit, planet, home)
    function updateCamera() {
        // --- Cockpit mode ---
        if (cockpitMode && spaceships && spaceships.length > 0) {
            const ship = spaceships[cockpitShipIndex];

            // Cockpit movement
            if (cockpitControls.yawLeft) ship.angle -= rotationSpeed;
            if (cockpitControls.yawRight) ship.angle += rotationSpeed;

            const forwardVec = [Math.sin(ship.angle), 0, Math.cos(ship.angle)];
            const rightVec   = [Math.cos(ship.angle), 0, -Math.sin(ship.angle)];

            if (cockpitControls.forward)  ship.position = ship.position.map((v,i)=>v + forwardVec[i]*cockpitSpeed);
            if (cockpitControls.backward) ship.position = ship.position.map((v,i)=>v - forwardVec[i]*cockpitSpeed);
            if (cockpitControls.left)     ship.position = ship.position.map((v,i)=>v - rightVec[i]*cockpitSpeed);
            if (cockpitControls.right)    ship.position = ship.position.map((v,i)=>v + rightVec[i]*cockpitSpeed);
            if (cockpitControls.up)       ship.position[1] += cockpitSpeed;
            if (cockpitControls.down)     ship.position[1] -= cockpitSpeed;

            // Cockpit camera
            let m = mat4Identity();
            m = mat4Translate(m, ship.position);
            m = mat4RotateY(m, ship.angle);
            m = mat4Scale(m, [ship.size, ship.size, ship.size]);

            const localCockpit = [0, 0.12, 0.6, 1];
            const world = multiplyMat4Vec4(m, localCockpit);
            const cockpitPos = [world[0]/world[3], world[1]/world[3], world[2]/world[3]];

            const forward = [m[8], m[9], m[10]];
            const len = Math.hypot(...forward) || 1;
            const forwardNorm = forward.map(f => f/len);

            const lookAhead = 3.0;
            const cockpitLook = forwardNorm.map((f,i)=>cockpitPos[i]+f*lookAhead);

            camera.target = lerpVec3(camera.target, cockpitLook, 0.18);
            camera.angle = lerp(camera.angle, Math.atan2(forwardNorm[0], forwardNorm[2]), 0.18);
            camera.distance = lerp(camera.distance, 0.2, 0.18);
            camera.target[1] = lerp(camera.target[1], cockpitPos[1]+0.05, 0.12);
            return; // skip normal camera
        }

        // --- Move toward selected planet ---
        if (isMovingTowardsPlanet && selectedPlanet) {
            const targetDist = selectedPlanet.radius * 4;
            camera.distance += (targetDist - camera.distance)*0.05;
            camera.target = camera.target.map((v,i)=>v + (selectedPlanet.center[i]-v)*0.05);

            const dist = camera.target.reduce((acc,v,i)=>acc+Math.abs(v-selectedPlanet.center[i]),0);
            if (dist<0.05 && Math.abs(camera.distance-targetDist)<0.5) isMovingTowardsPlanet=false;
            return;
        }

        // --- Return home ---
        if (isReturningHome) {
            camera.distance += (HOME_DISTANCE - camera.distance)*0.05;
            camera.target = camera.target.map((v,i)=>v + (HOME_TARGET[i]-v)*0.05);
            const dist = camera.target.reduce((acc,v,i)=>acc+Math.abs(v-HOME_TARGET[i]),0);
            if (dist<0.05 && Math.abs(camera.distance-HOME_DISTANCE)<0.5) isReturningHome=false;
        }
    }

    // -------------------------
    // Keyboard controls
    window.addEventListener("keydown", e => {
        if (!cockpitMode) return;
        switch(e.code){
            case "KeyW": cockpitControls.forward=true; break;
            case "KeyS": cockpitControls.backward=true; break;
            case "KeyA": cockpitControls.left=true; break;
            case "KeyD": cockpitControls.right=true; break;
            case "Space": cockpitControls.up=true; break;
            case "ShiftLeft": cockpitControls.down=true; break;
            case "ArrowLeft": cockpitControls.yawLeft=true; break;
            case "ArrowRight": cockpitControls.yawRight=true; break;
        }
    });


    // -------------------------
    // DOM & mouse
    document.addEventListener("DOMContentLoaded", () => {
        const canvas = document.getElementById("glcanvas");
        const asteroidButton = document.getElementById("add-asteroids");

        // Cockpit button
        let cockpitBtn = document.getElementById("cockpitBtn");
        if (!cockpitBtn) {
            cockpitBtn = document.createElement("button");
            cockpitBtn.id = "cockpitBtn";
            cockpitBtn.textContent = "Enter Cockpit View";
            Object.assign(cockpitBtn.style, {
                position:"absolute", top:"10px", left:"10px", zIndex:200,
                padding:"8px 10px", background:"#222", color:"#fff", border:"none", borderRadius:"6px"
            });
            document.body.appendChild(cockpitBtn);
        }

        // Cockpit HUD
        cockpitHUD = document.getElementById("cockpitHUD");
        if (!cockpitHUD) {
            cockpitHUD = document.createElement("div");
            cockpitHUD.id = "cockpitHUD";
            Object.assign(cockpitHUD.style, {
                position:"absolute", left:"50%", top:"50%",
                transform:"translate(-50%,-50%)",
                zIndex:199, pointerEvents:"none", display:"none"
            });
            cockpitHUD.innerHTML = `<div style="width:2px;height:20px;background:#0ff;margin:-10px auto 0 auto;"></div>
                                    <div style="height:2px;width:20px;background:#0ff;margin:9px auto 0 auto;"></div>`;
            document.body.appendChild(cockpitHUD);
        }

        cockpitBtn.addEventListener("click", ()=>{
            cockpitMode = !cockpitMode;
            cockpitHUD.style.display = cockpitMode?"block":"none";
            cockpitBtn.textContent = cockpitMode?"Exit Cockpit View":"Enter Cockpit View";
            if(!cockpitMode) camera.distance = Math.max(camera.distance,6.0);
        });

        if (asteroidButton) asteroidButton.addEventListener("click", ()=>{ if(window.addAsteroids) window.addAsteroids(50); });

        // Mouse drag orbit
        canvas.addEventListener("mousedown", e=>{ if(!cockpitMode){ isDragging=true; lastMouseX=e.clientX; } });
        canvas.addEventListener("mousemove", e=>{ if(isDragging) camera.angle+=(e.clientX-lastMouseX)*0.01; lastMouseX=e.clientX; });
        window.addEventListener("mouseup", ()=>{ isDragging=false; });

        // Click to select planet
        canvas.addEventListener("click", e => {
            if (isDragging) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
            const mouseY = -(((e.clientY - rect.top) / canvas.clientHeight) * 2 - 1);

            let closest = null;
            let minDist = Infinity;

            planetData.forEach(p => { if(p.mesh) p.center = [p.mesh.position.x,p.mesh.position.y,p.mesh.position.z]; });

            planetData.forEach(p => {
                if(!p.center) return;
                const ndc = projectToNDC(p.center);
                if(!ndc) return;
                const dx = mouseX - ndc[0], dy = mouseY - ndc[1];
                const dist = Math.sqrt(dx*dx + dy*dy);
                const threshold = 0.08 + (p.radius*0.03);
                if(dist < minDist && dist < threshold) { minDist=dist; closest=p; }
            });

            if(closest){
                selectedPlanet = closest;
                isMovingTowardsPlanet = true;
                showPlanetInfo(closest);
            }
        });

        // Zoom
        canvas.addEventListener("wheel", e => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
            camera.distance *= zoomFactor;
            camera.distance = Math.max(5, Math.min(camera.distance, 120));
        }, {passive:false});
    });

    return {
        updateCamera,
        toggleCockpit: ()=>{ cockpitBtn && cockpitBtn.click(); },
        cockpitMode: ()=>cockpitMode
    };
})();

window.__updateInteraction = Interaction.updateCamera;
window.toggleCockpit = Interaction.toggleCockpit;
window.cockpitMode = Interaction.cockpitMode;
