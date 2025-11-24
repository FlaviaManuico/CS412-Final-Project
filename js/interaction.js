// ==========================
// interaction.js
// Handles clicks, planet info panel, and camera zoom
// ==========================

document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("glcanvas");
    const infoPanel = document.getElementById("planet-info");
    const infoName = document.getElementById("info-name");
    const infoText = document.getElementById("info-text");
    const infoClose = document.getElementById("info-close");

    // Dragging variables
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Close info panel
    if (infoClose) {
        infoClose.addEventListener("click", () => {
            infoPanel.style.display = "none";
            selectedPlanet = null;
            cameraTarget = null;
            cameraZooming = false;
        });
    }

    // Function to show planet info in panel
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


    // Handle mouse events
    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (isDragging) {
            const dx = e.clientX - lastMouseX;
            cameraAngle += dx * 0.01; // rotate camera horizontally
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener("mouseup", () => {
        isDragging = false;
    });

    canvas.addEventListener("click", (e) => {
        if (isDragging) return; // skip if dragging

        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        const mouseY = -(((e.clientY - rect.top) / canvas.clientHeight) * 2 - 1);

        let closest = null;
        let minDist = Infinity;

        // Check all planets
        planetData.forEach(p => {
            if (!p.center) return;
            const dx = mouseX - (p.center[0] / 30);
            const dy = mouseY - (p.center[2] / 30);
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist && dist < 0.15) {
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            selectedPlanet = closest.name;
            cameraTarget = closest.center;
            cameraZooming = true;
            showPlanetInfo(closest);
        }
    });

    // Zooming
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
        cameraDistance *= zoomFactor;
        cameraDistance = Math.max(5, Math.min(cameraDistance, 60));
    }, {passive:false});

});
