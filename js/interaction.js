
document.addEventListener("DOMContentLoaded", ()=>{

    const canvas = document.getElementById("glcanvas");
    const infoPanel = document.getElementById("planet-info");
    const infoName = document.getElementById("info-name");
    const infoText = document.getElementById("info-text");
    const infoClose = document.getElementById("info-close");

    let isDragging = false;
    let lastMouseX = 0;

    if(infoClose){
        infoClose.addEventListener("click", ()=>{
            infoPanel.style.display = "none";
            selectedPlanet = null;
            cameraTarget = null;
        });
    }

    function showPlanetInfo(planet){
        if(!infoPanel || !infoName || !infoText) return;
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

    // Mouse drag to rotate camera around Y axis
    canvas.addEventListener("mousedown", e => {
        isDragging = true;
        lastMouseX = e.clientX;
    });
    canvas.addEventListener("mousemove", e => {
        if(isDragging){
            cameraAngle += (e.clientX - lastMouseX) * 0.01;
            lastMouseX = e.clientX;
        }
    });
    window.addEventListener("mouseup", ()=>{ isDragging = false; });

    // Convert world position to clip/NDC coordinates using current view & projection
    function projectToNDC(worldPos){
        // rely on transformations.js lookAt/perspective used in scene.drawScene
        const camX = Math.sin(cameraAngle)*cameraDistance;
        const camZ = Math.cos(cameraAngle)*cameraDistance;
        const camY = 5;
        const view = lookAt([camX, camY, camZ], cameraTarget || [0,0,0], [0,1,0]);
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const proj = perspective(Math.PI/4, aspect, 0.1, 200.0);

        const v = multiplyMat4Vec4(proj, multiplyMat4Vec4(view, [worldPos[0], worldPos[1], worldPos[2], 1]));
        // perspective divide
        if(Math.abs(v[3]) < 1e-6) return null;
        return [v[0]/v[3], v[1]/v[3], v[2]/v[3]]; // NDC x,y,z
    }

    // helper: multiply 4x4 mat by vec4 (assumes mat in column-major as your matrix lib uses)
    function multiplyMat4Vec4(mat, vec4){
        // mat: 16-length array, column-major expected by many libs; adapt depending on your mat helpers.
        // If your mat functions use different layout, adjust accordingly.
        // Most simple: use explicit multiplication assuming mat is column-major
        const x = vec4[0], y = vec4[1], z = vec4[2], w = vec4[3];
        return [
            mat[0]*x + mat[4]*y + mat[8]*z  + mat[12]*w,
            mat[1]*x + mat[5]*y + mat[9]*z  + mat[13]*w,
            mat[2]*x + mat[6]*y + mat[10]*z + mat[14]*w,
            mat[3]*x + mat[7]*y + mat[11]*z + mat[15]*w
        ];
    }

    // Click to select planet: we project centers to NDC and compare with mouse in NDC space
    canvas.addEventListener("click", e => {
        if(isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        const mouseY = -(((e.clientY - rect.top) / canvas.clientHeight) * 2 - 1);

        let closest = null;
        let minDist = Infinity;

        planetData.forEach(p => {
            if(!p.center) return;
            const ndc = projectToNDC(p.center);
            if(!ndc) return;
            const dx = mouseX - ndc[0];
            const dy = mouseY - ndc[1];
            const dist = Math.sqrt(dx*dx + dy*dy);
            // threshold tuned: larger planets should be easier to hit - scale by planet radius/projected size
            const threshold = 0.08 + (p.radius * 0.03);
            if(dist < minDist && dist < threshold){
                minDist = dist;
                closest = p;
            }
        });

        if(closest){
            selectedPlanet = closest.name;
            cameraTarget = closest.center;
            showPlanetInfo(closest);
        }
    });

    // Zoom wheel
    canvas.addEventListener("wheel", e=>{
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
        cameraDistance *= zoomFactor;
        cameraDistance = Math.max(5, Math.min(cameraDistance, 120));
    }, { passive: false });

    // Basic UI controls container
    const uiContainer = document.createElement("div");
    uiContainer.style.position = "absolute";
    uiContainer.style.top = "10px";
    uiContainer.style.left = "10px";
    uiContainer.style.background = "rgba(0,0,0,0.5)";
    uiContainer.style.padding = "10px";
    uiContainer.style.borderRadius = "8px";
    uiContainer.style.color = "white";
    uiContainer.style.zIndex = 10;
    document.body.appendChild(uiContainer);

    const speedLabel = document.createElement("label");
    speedLabel.textContent = "Animation Speed:";
    uiContainer.appendChild(speedLabel);

    const speedSlider = document.createElement("input");
    speedSlider.type = "range";
    speedSlider.min = "0";
    speedSlider.max = "5";
    speedSlider.step = "0.1";
    speedSlider.value = animationSpeed;
    speedSlider.oninput = ()=> { animationSpeed = parseFloat(speedSlider.value); };
    uiContainer.appendChild(speedSlider);
    uiContainer.appendChild(document.createElement("br"));

    const shipToggle = document.createElement("button");
    shipToggle.textContent = showSpaceships ? "Hide Spaceships" : "Show Spaceships";
    shipToggle.onclick = ()=>{
        showSpaceships = !showSpaceships;
        shipToggle.textContent = showSpaceships ? "Hide Spaceships" : "Show Spaceships";
    };
    uiContainer.appendChild(shipToggle);

});
