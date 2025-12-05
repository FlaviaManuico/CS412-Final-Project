// interaction.js
// Handles user interaction: planet selection, camera focus, cockpit view, HUD, collisions, game mode

let score = 0; // Global score
let gameModeActive = false; // Game mode flag
let gameTime = 0; 
let asteroidSpawnTimer = 0;
let isGameOver = false;

const Interaction = (() => {

    // -------------------------
    // State
    let selectedPlanet = null;
    let isMovingTowardsPlanet = false;

    const HOME_TARGET = [0, 0, 0];
    const HOME_DISTANCE = 60;
    const HOME_HEIGHT = 5;
    let isReturningHome = false;

    let cockpitMode = false;
    let cockpitShipIndex = 0;

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
    const cockpitSpeed = 0.15;
    const rotationSpeed = 0.02;

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
        let eye, target;
        if (window.cockpit && window.cockpit.enabled) {
            const cp = window.cockpit;
            const cosPitch = Math.cos(cp.pitch), sinPitch = Math.sin(cp.pitch);
            const cosYaw = Math.cos(cp.yaw),   sinYaw = Math.sin(cp.yaw);
            const forward = [sinYaw * cosPitch, sinPitch, cosYaw * cosPitch];

            eye    = cp.position;
            target = [eye[0] + forward[0],
                    eye[1] + forward[1],
                    eye[2] + forward[2]];
        } else {
            const camX = Math.sin(camera.angle) * camera.distance;
            const camZ = Math.cos(camera.angle) * camera.distance;
            const camY = camera.height;

            eye    = [camX, camY, camZ];
            target = camera.target;
        }
        // const camX = Math.sin(camera.angle) * camera.distance;
        // const camZ = Math.cos(camera.angle) * camera.distance;
        // const camY = camera.height;

        // const view = lookAt([camX, camY, camZ], camera.target, [0, 1, 0]);
        const view   = lookAt(eye, target, [0, 1, 0]);
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const proj = perspective(Math.PI/4, aspect, 0.1, 200.0);
        // const proj   = perspective(Math.PI / 4, aspect, 0.1, 200.0);

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

            const forwardX = Math.sin(ship.angle);
            const forwardZ = Math.cos(ship.angle);
            const rightX = Math.cos(ship.angle);
            const rightZ = -Math.sin(ship.angle);

            if (cockpitControls.forward) {
                ship.position[0] += forwardX * cockpitSpeed;
                ship.position[2] += forwardZ * cockpitSpeed;
            }
            if (cockpitControls.backward) {
                ship.position[0] -= forwardX * cockpitSpeed;
                ship.position[2] -= forwardZ * cockpitSpeed;
            }
            if (cockpitControls.left) {
                ship.position[0] -= rightX * cockpitSpeed;
                ship.position[2] -= rightZ * cockpitSpeed;
            }
            if (cockpitControls.right) {
                ship.position[0] += rightX * cockpitSpeed;
                ship.position[2] += rightZ * cockpitSpeed;
            }
            if (cockpitControls.up)       ship.position[1] += cockpitSpeed;
            if (cockpitControls.down)     ship.position[1] -= cockpitSpeed;

            // Cockpit camera
            let m = mat4Identity();
            m = mat4Translate(m, ship.position);
            m = mat4RotateY(m, ship.angle);
            m = mat4Scale(m, [ship.size, ship.size, ship.size]);

            const localCam = [...cockpitOffset, 1];
            const worldCam = multiplyMat4Vec4(m, localCam);
            const camPos = [worldCam[0]/worldCam[3], worldCam[1]/worldCam[3], worldCam[2]/worldCam[3]];

            const forward = [m[8], m[9], m[10]];
            const len = Math.hypot(...forward) || 1;
            const forwardNorm = forward.map(f => f/len);

            const lookDistance = 5.0;
            const lookTarget = forwardNorm.map((f, i) => camPos[i] + f * lookDistance);

            camera.target = lerpVec3(camera.target, lookTarget, 0.15);
            
            const targetAngle = Math.atan2(forwardNorm[0], forwardNorm[2]);
            camera.angle = lerp(camera.angle, targetAngle, 0.15);
            
            camera.distance = lerp(camera.distance, 0.1, 0.15);
            camera.height = lerp(camera.height, camPos[1], 0.15);
            return; // skip normal camera
        }

        // --- Move toward selected planet ---
        if (isMovingTowardsPlanet && selectedPlanet) {
            const targetDist = selectedPlanet.radius * 4;
            camera.distance += (targetDist - camera.distance) * 0.05;
            camera.target = camera.target.map((v, i) => v + (selectedPlanet.center[i] - v) * 0.05);

            const dist = camera.target.reduce((acc, v, i) => acc + Math.abs(v - selectedPlanet.center[i]), 0);
            if (dist < 0.05 && Math.abs(camera.distance - targetDist) < 0.5) {
                isMovingTowardsPlanet = false;
            }
            return;
        }

        // --- Return home ---
        if (isReturningHome) {
            camera.distance += (HOME_DISTANCE - camera.distance) * 0.05;
            camera.height += (HOME_HEIGHT - camera.height) * 0.05;
            camera.target = camera.target.map((v, i) => v + (HOME_TARGET[i] - v) * 0.05);
            
            const distToHome = camera.target.reduce((acc, v, i) => acc + Math.abs(v - HOME_TARGET[i]), 0);
            const distDiff = Math.abs(camera.distance - HOME_DISTANCE);
            const heightDiff = Math.abs(camera.height - HOME_HEIGHT);
            
            if (distToHome < 0.1 && distDiff < 0.5 && heightDiff < 0.1) {
                isReturningHome = false;
                camera.target = [...HOME_TARGET];
                camera.distance = HOME_DISTANCE;
                camera.height = HOME_HEIGHT;
            }
        }
    }

    // -------------------------
    // Keyboard & joystick
    const cockpitKeys = {};
    window.cockpitKeys = cockpitKeys;

    let joystickPitch = 0;
    let joystickYaw = 0;
    let joystickStickEl = null;
    let cockpitWindowEl = null;
    let cockpitJoystickEl = null;

    document.addEventListener("keydown", e => cockpitKeys[e.code]=true);
    document.addEventListener("keyup", e => cockpitKeys[e.code]=false);

    function moveVec(target, dir, s) {
        target[0] += dir[0] * s;
        target[1] += dir[1] * s;
        target[2] += dir[2] * s;
    }

    
    // Collision check (robust)
    function checkCollisions(newPos) {
    // Sun collision
    const sunRadius = window.sunRadius || 3;
    if (Math.hypot(newPos[0], newPos[1], newPos[2]) < sunRadius + 1.5) return true;

    // Update planet & moon positions every frame
    for (const planet of planetData) {
        if (!planet.center) continue;
        // planet.center = [planet.mesh.position.x, planet.mesh.position.y, planet.mesh.position.z];

        // Planet collision
        if (Math.hypot(newPos[0]-planet.center[0], newPos[1]-planet.center[1], newPos[2]-planet.center[2]) < planet.radius + 1.0) return true;

        // Moons collision
        if (planet.moons) {
            for (const moon of planet.moons) {
                if (!moon.mesh) continue;
                moon.position = [moon.mesh.position.x, moon.mesh.position.y, moon.mesh.position.z];
                if (Math.hypot(newPos[0]-moon.position[0], newPos[1]-moon.position[1], newPos[2]-moon.position[2]) < moon.radius + 0.5) return true;
            }
        }
    }


      // Game Mode Obstacles
    if (gameModeActive) {
        // Enemy ships
        // if (Array.isArray(spaceships)) {
        //     for (const s of spaceships) {
        //         if (!s.position) continue;
        //         const dx = newPos[0] - s.position[0];
        //         const dy = newPos[1] - s.position[1];
        //         const dz = newPos[2] - s.position[2];
        //         const distance = Math.hypot(dx, dy, dz);
        //         const hitRadius = (s.radius || (s.size || 1)*0.7) + 0.6;
        //         if (distance < hitRadius) {
        //             onHitObstacle("ship", s);
        //             return true;
        //         }
        //     }
        // }
           // Asteroids
        if (typeof gameAsteroids !== "undefined" && Array.isArray(gameAsteroids)) {
            for (const a of gameAsteroids) {
                if (!a.position) continue;
                const dx = newPos[0] - a.position[0];
                const dy = newPos[1] - a.position[1];
                const dz = newPos[2] - a.position[2];
                const distance = Math.hypot(dx, dy, dz);
                // const hitRadius = (a.size || 0.3) + 0.8;
                const hitRadius = (a.size || 0.4) + 1.2;
                if (distance < hitRadius) {
                    onHitObstacle("asteroid", a);
                    return true;
                }
            }
        }
    }

    return false;
}

    // handle hit: deduct score, set return-home, reset cockpit position
    function onHitObstacle(type, obj) {
        // score = Math.max(0, Math.floor(score) - 10);
        const finalScore = Math.floor(score);
        
        console.log(`Hit ${type}! Score now ${finalScore}. Returning home...`);
        
        if (window.showGameOver) {
            window.showGameOver(finalScore);
        }

        gameModeActive = false;
        isGameOver = true;

        score = 0;
        const scoreEl = document.getElementById("score-board");
        if (scoreEl) scoreEl.textContent = "Score: " + Math.floor(score);

        // Immediately move cockpit back to home spawn coords (so the player "teleports" home)
        if (window.cockpit) {
            window.cockpit.position = [0, HOME_HEIGHT, HOME_DISTANCE];
            window.cockpit.yaw = 0;
            window.cockpit.pitch = 0;
        }

        // Animate camera back to home as well
        isReturningHome = true;
    }
    
    // Update cockpit with collisions & scoring
    function updateCockpit(dt) {
        const cockpit = window.cockpit;
        if (!cockpit || !cockpit.enabled) return;

        if(gameModeActive) {
            gameTime += dt;
            asteroidSpawnTimer += dt;
            // window.gameSpeedMultiplier = 1.0 + Math.floor(window.gameTime / 5.0) * 0.2
            window.gameSpeedMultiplier = 1.0 + Math.floor(gameTime / 10.0) * 0.1;
            if (asteroidSpawnTimer > 3) {
                asteroidSpawnTimer = 0;
                if (window.addAsteroids) {
                    window.addAsteroids(4);
                }
            }
        }

    // Rotation
    const rotSpeed = 1.5*dt;
    if (cockpitKeys["ArrowLeft"]) cockpit.yaw += rotSpeed;
    if (cockpitKeys["ArrowRight"]) cockpit.yaw -= rotSpeed;
    if (cockpitKeys["ArrowUp"]) cockpit.pitch = Math.min(cockpit.pitch + rotSpeed, Math.PI/2-0.1);
    if (cockpitKeys["ArrowDown"]) cockpit.pitch = Math.max(cockpit.pitch - rotSpeed, -Math.PI/2+0.1);

    const cosPitch=Math.cos(cockpit.pitch), sinPitch=Math.sin(cockpit.pitch);
    const cosYaw=Math.cos(cockpit.yaw), sinYaw=Math.sin(cockpit.yaw);

    const forward=[sinYaw*cosPitch, sinPitch, cosYaw*cosPitch];
    const right=[cosYaw,0,-sinYaw];
    const up=[0,1,0];

    // Movement
    const moveSpeed = Math.min(10*dt, 0.5); // safe step for collisions
    const oldPos = [...cockpit.position];

    if (cockpitKeys["KeyW"]) moveVec(cockpit.position, forward, moveSpeed);
    if (cockpitKeys["KeyS"]) moveVec(cockpit.position, forward, -moveSpeed);
    if (cockpitKeys["KeyA"]) moveVec(cockpit.position, right, -moveSpeed);
    if (cockpitKeys["KeyD"]) moveVec(cockpit.position, right, moveSpeed);
    if (cockpitKeys["Space"]) moveVec(cockpit.position, up, moveSpeed);
    if (cockpitKeys["ShiftLeft"] || cockpitKeys["ShiftRight"]) moveVec(cockpit.position, up, -moveSpeed);

    // Joystick visual
    let targetPitch=0, targetYaw=0;
    if(cockpitKeys["KeyW"]) targetPitch-=20;
    if(cockpitKeys["KeyS"]) targetPitch+=20;
    if(cockpitKeys["KeyA"]) targetYaw-=20;
    if(cockpitKeys["KeyD"]) targetYaw+=20;

    const lerpF = 6*dt;
    joystickPitch += (targetPitch - joystickPitch)*lerpF;
    joystickYaw   += (targetYaw - joystickYaw)*lerpF;

    if(joystickStickEl) joystickStickEl.style.transform =
        `translateX(-50%) rotate(${joystickYaw}deg) translateY(${joystickPitch*0.3}px)`;

    // Collision check
    if(checkCollisions(cockpit.position)){
        cockpit.position = oldPos; // revert movement
    } else {
        // if(gameModeActive) score += dt * 1.0;
        if(gameModeActive) {
            const speedBonus = gameSpeedMultiplier || 1.0;
            score += dt * 0.5 * speedBonus;
        }
    }

    // Update score UI
    const scoreEl = document.getElementById("score-board");
    if(scoreEl) scoreEl.textContent = "Score: " + Math.floor(score);
}

    // DOM & mouse
    document.addEventListener("DOMContentLoaded", () => {
        const canvas = document.getElementById("glcanvas");
        const asteroidButton = document.getElementById("add-asteroids-btn");
        const infoPanel = document.getElementById("planet-info");
        const infoClose = document.getElementById("info-close");

        const cockpitBtn = document.getElementById("cockpit-toggle");
        const cockpitModal    = document.getElementById("cockpit-modal");
        const cockpitOkBtn    = document.getElementById("cockpit-ok-btn");

        const gameModeBtn = document.getElementById("game-mode-toggle");
        const gameStartModal  = document.getElementById("game-start-modal");
        const gameStartOkBtn  = document.getElementById("game-start-ok-btn");

        const gameOverModal   = document.getElementById("game-over-modal");
        const gameRetryBtn    = document.getElementById("game-retry-btn");

        const finalScoreSpan  = document.getElementById("final-score");
        const scoreBoard    = document.getElementById("score-board"); 

        let cockpitHelpShown = false;
        let gameHelpShown    = false; 

        cockpitWindowEl  = document.getElementById("cockpit-window-frame");
        cockpitJoystickEl = document.getElementById("cockpit-joystick");
        joystickStickEl   = document.getElementById("joystick-stick");

        // Info close
        if(infoClose) infoClose.addEventListener("click", ()=>{
            infoPanel.style.display="none";
            selectedPlanet=null;
            isMovingTowardsPlanet=false;
            isReturningHome=true;
        });

        // Cockpit toggle
        if(cockpitBtn) {
            cockpitBtn.addEventListener("click", ()=>{
                const cockpit = window.cockpit;
                //cockpitMode = cockpit.enabled;
                const wasEnabled = cockpit.enabled;
                cockpit.enabled = !cockpit.enabled;

                setTimeout(() => {
                    if (window.cockpit && window.cockpit.enabled && !cockpitHelpShown) {
                        cockpitHelpShown = true;
                        if (cockpitModal) cockpitModal.classList.remove("hidden");
                    }
                }, 0);

                if (cockpitOkBtn && cockpitModal) {
                    cockpitOkBtn.addEventListener("click", () => {
                        cockpitModal.classList.add("hidden");
                    });
                }

                if(gameModeBtn) gameModeBtn.disabled = !cockpit.enabled;

                cockpitBtn.textContent = cockpit.enabled?"Exit Cockpit":"Enter Cockpit";

                if(cockpitWindowEl) cockpitWindowEl.style.display = cockpit.enabled?"block":"none";
                if(cockpitJoystickEl) cockpitJoystickEl.style.display = cockpit.enabled?"block":"none";

                if(cockpit.enabled && !wasEnabled){
                    const camX=Math.sin(camera.angle)*camera.distance;
                    const camZ=Math.cos(camera.angle)*camera.distance;
                    const camY=camera.height;
                    cockpit.position=[camX, camY, camZ];
                    cockpit.yaw=camera.angle+Math.PI;
                    cockpit.pitch=0;
                    cockpit.initialized=true;
                    console.log("Cockpit activated at:", cockpit.position);
                } else if(!cockpit.enabled){
                    camera.target=[0,0,0];
                    camera.distance=60;
                    camera.angle=0;
                    camera.height=5;
                    cockpit.initialized=false;
                    // turn off game mode if exiting cockpit
                    gameModeActive = false;
                    if (gameModeBtn) {
                        gameModeBtn.textContent = "Enter Game Mode";
                        gameModeBtn.disabled = true;
                    }
                    if (scoreBoard) scoreBoard.style.display = "none";
                }
            });
        }

        // Game mode toggle
        if(gameModeBtn){
            gameModeBtn.addEventListener("click", ()=>{
                if (window.cockpit && window.cockpit.enabled) {
                    if (!gameHelpShown && gameStartModal) {
                        gameHelpShown = true;
                        gameStartModal.classList.remove("hidden");
                    }
                }

                if(!window.cockpit || !window.cockpit.enabled) return;
                gameModeActive = true;
                gameModeBtn.textContent="Game Mode Active";
                gameModeBtn.disabled = true;
                console.log("Game Mode Activated!");
                if (scoreBoard) scoreBoard.style.display = "block";
            });
        }

        if (gameStartOkBtn && gameStartModal) {
            gameStartOkBtn.addEventListener("click", () => {
                gameStartModal.classList.add("hidden");
            });
        }

        window.showGameOver = function(score) {
            if (finalScoreSpan) {
                finalScoreSpan.textContent = Math.floor(score);
            }
            if (gameOverModal) gameOverModal.classList.remove("hidden");
        };

        if (gameRetryBtn && gameOverModal) {
            gameRetryBtn.addEventListener("click", () => {
                location.reload();
            });
        }

        if(asteroidButton) asteroidButton.addEventListener("click", ()=>{ if(window.addAsteroids) window.addAsteroids(50); });

        // Mouse drag orbit
        canvas.addEventListener("mousedown", e=>{ if(!cockpitMode){ isDragging=true; lastMouseX=e.clientX; } });
        canvas.addEventListener("mousemove", e=>{ if(isDragging && !cockpitMode) camera.angle+=(e.clientX-lastMouseX)*0.01; lastMouseX=e.clientX; });
        window.addEventListener("mouseup", ()=>{ isDragging=false; });

        // Click to select planet
        canvas.addEventListener("click", e=>{
            if(isDragging) return;
            const rect=canvas.getBoundingClientRect();
            const mouseX=((e.clientX-rect.left)/canvas.clientWidth)*2-1;
            const mouseY=-(((e.clientY-rect.top)/canvas.clientHeight)*2-1);

            let closest=null, minDist=Infinity;
            planetData.forEach(p=>{ if(p.mesh)p.center=[p.mesh.position.x,p.mesh.position.y,p.mesh.position.z]; });

            planetData.forEach(p=>{
                if(!p.center) return;
                const ndc=projectToNDC(p.center);
                if(!ndc) return;
                const dx=mouseX-ndc[0], dy=mouseY-ndc[1];
                const dist=Math.sqrt(dx*dx+dy*dy);
                const threshold=0.08+(p.radius*0.03);
                if(dist<minDist && dist<threshold){ minDist=dist; closest=p; }
            });

            if(closest){ selectedPlanet=closest; isMovingTowardsPlanet=true; showPlanetInfo(closest); }
        });

        // Zoom
        canvas.addEventListener("wheel", e=>{
            e.preventDefault();
            if(cockpitMode) return;
            const zoomFactor=e.deltaY>0?1.05:0.95;
            camera.distance*=zoomFactor;
            camera.distance=Math.max(5,Math.min(camera.distance,120));
        }, {passive:false});
    });

    return { updateCamera, updateCockpit, getCockpitMode: ()=>cockpitMode };
})();

window.__updateInteraction = function(){
    const dt=1/60;
    Interaction.updateCockpit(dt);
    Interaction.updateCamera();
};
