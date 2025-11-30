let selectedPlanet = null;
let isMovingTowardsPlanet = false;
let targetCameraPosition = null;
const HOME_TARGET = [0, 0, 0];
const HOME_DISTANCE = 35;

let isReturningHome = false;

// -------------------------
// Animate camera toward selected planet
function updateCamera() {
    if (isMovingTowardsPlanet && selectedPlanet) {
        const targetDist = selectedPlanet.radius * 4;
        camera.distance += (targetDist - camera.distance) * 0.05;

        camera.target[0] += (selectedPlanet.center[0] - camera.target[0]) * 0.05;
        camera.target[1] += (selectedPlanet.center[1] - camera.target[1]) * 0.05;
        camera.target[2] += (selectedPlanet.center[2] - camera.target[2]) * 0.05;

        const dist =
            Math.abs(camera.target[0] - selectedPlanet.center[0]) +
            Math.abs(camera.target[1] - selectedPlanet.center[1]) +
            Math.abs(camera.target[2] - selectedPlanet.center[2]);

        if (dist < 0.05 && Math.abs(camera.distance - targetDist) < 0.5) {
            isMovingTowardsPlanet = false;
        }
        return;
    }

    if (isReturningHome) {
        camera.distance += (HOME_DISTANCE - camera.distance) * 0.05;

        camera.target[0] += (HOME_TARGET[0] - camera.target[0]) * 0.05;
        camera.target[1] += (HOME_TARGET[1] - camera.target[1]) * 0.05;
        camera.target[2] += (HOME_TARGET[2] - camera.target[2]) * 0.05;

        const dist =
            Math.abs(camera.target[0] - HOME_TARGET[0]) +
            Math.abs(camera.target[1] - HOME_TARGET[1]) +
            Math.abs(camera.target[2] - HOME_TARGET[2]);

        if (dist < 0.05 && Math.abs(camera.distance - HOME_DISTANCE) < 0.5) {
            isReturningHome = false;
        }
    }
}

window.__updateInteraction = updateCamera;

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("glcanvas");
    const infoPanel = document.getElementById("planet-info");
    const infoName = document.getElementById("info-name");
    const infoText = document.getElementById("info-text");
    const infoClose = document.getElementById("info-close");
    const asteroidButton = document.getElementById("add-asteroids"); // NEW BUTTON

    let isDragging = false;
    let lastMouseX = 0;

    if (infoClose) {
        infoClose.addEventListener("click", () => {
            infoPanel.style.display = "none";
            selectedPlanet = null;
            isMovingTowardsPlanet = false;
            isReturningHome = true;
        });
    }

    if (asteroidButton) {
        asteroidButton.addEventListener("click", () => {
            if (window.addAsteroids) {
                window.addAsteroids(50); // add 50 asteroids each click
                console.log("Asteroids added!");
            }
        });
    }

    function showPlanetInfo(planet) {
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

    // ------------------------- Mouse drag for camera
    canvas.addEventListener("mousedown", e => {
        isDragging = true;
        lastMouseX = e.clientX;
    });

    canvas.addEventListener("mousemove", e => {
        if (isDragging) {
            camera.angle += (e.clientX - lastMouseX) * 0.01;
            lastMouseX = e.clientX;
        }
    });

    window.addEventListener("mouseup", () => { isDragging = false; });

    // ------------------------- Project 3D position to NDC
    function projectToNDC(worldPos) {
        const camX = Math.sin(camera.angle) * camera.distance;
        const camZ = Math.cos(camera.angle) * camera.distance;
        const camY = camera.height;

        const view = lookAt([camX, camY, camZ], camera.target, [0, 1, 0]);
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const proj = perspective(Math.PI / 4, aspect, 0.1, 200.0);

        const v = multiplyMat4Vec4(
            proj,
            multiplyMat4Vec4(view, [worldPos[0], worldPos[1], worldPos[2], 1])
        );

        if (Math.abs(v[3]) < 1e-6) return null;
        return [v[0] / v[3], v[1] / v[3], v[2] / v[3]];
    }

    function multiplyMat4Vec4(mat, vec4) {
        const x = vec4[0], y = vec4[1], z = vec4[2], w = vec4[3];
        return [
            mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w,
            mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w,
            mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w,
            mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w
        ];
    }

    // ------------------------- Click to select planet
    canvas.addEventListener("click", e => {
        if (isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        const mouseY = -(((e.clientY - rect.top) / canvas.clientHeight) * 2 - 1);

        let closest = null;
        let minDist = Infinity;

        // Update planet centers if planets move
        planetData.forEach(p => {
            if (p.mesh) {
                p.center = [p.mesh.position.x, p.mesh.position.y, p.mesh.position.z];
            }
        });

        planetData.forEach(p => {
            if (!p.center) return;
            const ndc = projectToNDC(p.center);
            if (!ndc) return;
            const dx = mouseX - ndc[0];
            const dy = mouseY - ndc[1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            const threshold = 0.08 + (p.radius * 0.03);
            if (dist < minDist && dist < threshold) {
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            selectedPlanet = closest;
            cameraTarget = closest.center;
            targetCameraPosition = [cameraTarget[0], cameraTarget[1] + 5, cameraTarget[2] + closest.radius * 2];
            isMovingTowardsPlanet = true;
            showPlanetInfo(closest);
        }
    });

    // ------------------------- Zoom
    canvas.addEventListener("wheel", e => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
        camera.distance *= zoomFactor;
        camera.distance = Math.max(5, Math.min(camera.distance, 120));
    }, { passive: false });
});
