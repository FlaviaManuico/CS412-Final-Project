let gl;
let program;
let sphere;
let angle = 0;

let cameraAngle = 0;
let cameraDistance = 35;

function initScene(canvas) {
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL not supported");
        return;
    }
    
    resizeCanvas(canvas);
    window.addEventListener('resize', () => resizeCanvas(canvas));

    gl.viewport(0, 0, canvas.width, canvas.height);

    const vs = document.getElementById("vs").textContent;
    const fs = document.getElementById("fs").textContent;
    program = createProgram(gl, vs, fs);
    gl.useProgram(program);

    sphere = createSphere(gl, 1, 30, 30);
    gl.enable(gl.DEPTH_TEST);

    let isDragging = false;
    canvas.addEventListener('mousedown', () => isDragging = true);
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            cameraAngle += e.movementX * 0.01;
        }
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(15, Math.min(60, cameraDistance));
    }, { passive: false });
}


function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    angle += 0.01;

    // camera
    const camX = Math.sin(cameraAngle) * cameraDistance;
    const camZ = Math.cos(cameraAngle) * cameraDistance;
    const view = lookAt([camX, 5, camZ], [0, 0, 0], [0, 1, 0]);

    // projection
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const proj = perspective(Math.PI / 4, aspect, 0.1, 100);

    const lightPos = [0, 0, 0];

    // sun
    drawSphere([0, 0, 0], 2.5, [1.0, 0.9, 0.3], view, proj, lightPos, true);

    // mercury
    let mercuryAngle = angle * 4.15;
    let mercuryX = Math.cos(mercuryAngle) * 4;
    let mercuryZ = Math.sin(mercuryAngle) * 4;
    drawSphere([mercuryX, 0, mercuryZ], 0.38, [0.7, 0.7, 0.7], view, proj, lightPos, false);

    // venus
    let venusAngle = angle * 1.62;
    let venusX = Math.cos(venusAngle) * 5.5;
    let venusZ = Math.sin(venusAngle) * 5.5;
    drawSphere([venusX, 0, venusZ], 0.95, [0.9, 0.7, 0.4], view, proj, lightPos, false);

    // the earth
    let earthAngle = angle * 1.0;
    let earthX = Math.cos(earthAngle) * 7;
    let earthZ = Math.sin(earthAngle) * 7;
    drawSphere([earthX, 0, earthZ], 1.0, [0.2, 0.5, 1.0], view, proj, lightPos, false);

    // moon (orbiting Earth)
    let moonAngle = angle * 13;
    let moonX = earthX + Math.cos(moonAngle) * 1.5;
    let moonZ = earthZ + Math.sin(moonAngle) * 1.5;
    drawSphere([moonX, 0, moonZ], 0.27, [0.8, 0.8, 0.8], view, proj, lightPos, false);

    // mars
    let marsAngle = angle * 0.53;
    let marsX = Math.cos(marsAngle) * 9;
    let marsZ = Math.sin(marsAngle) * 9;
    drawSphere([marsX, 0, marsZ], 0.53, [1.0, 0.3, 0.2], view, proj, lightPos, false);

    // jupiter
    let jupiterAngle = angle * 0.08;
    let jupiterX = Math.cos(jupiterAngle) * 13;
    let jupiterZ = Math.sin(jupiterAngle) * 13;
    drawSphere([jupiterX, 0, jupiterZ], 2.2, [0.9, 0.7, 0.5], view, proj, lightPos, false);

    // saturn
    let saturnAngle = angle * 0.03;
    let saturnX = Math.cos(saturnAngle) * 17;
    let saturnZ = Math.sin(saturnAngle) * 17;
    drawSphere([saturnX, 0, saturnZ], 1.9, [0.9, 0.8, 0.6], view, proj, lightPos, false);

    // uranus
    let uranusAngle = angle * 0.01;
    let uranusX = Math.cos(uranusAngle) * 21;
    let uranusZ = Math.sin(uranusAngle) * 21;
    drawSphere([uranusX, 0, uranusZ], 1.0, [0.5, 0.8, 0.9], view, proj, lightPos, false);

    // neptune
    let neptuneAngle = angle * 0.006;
    let neptuneX = Math.cos(neptuneAngle) * 25;
    let neptuneZ = Math.sin(neptuneAngle) * 25;
    drawSphere([neptuneX, 0, neptuneZ], 0.98, [0.3, 0.4, 0.9], view, proj, lightPos, false);
}


function drawSphere(position, scale, color, view, proj, lightPos, isEmissive = false) {
    gl.bindVertexArray(sphere.vao);

    let model = mat4Identity();
    model = mat4Translate(model, position);
    model = mat4Scale(model, [scale, scale, scale]);

    let normalMatrix = mat4Invert(model);
    normalMatrix = mat4Transpose(normalMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uModel"), false, model);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uView"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uNormalMatrix"), false, normalMatrix);
    gl.uniform3fv(gl.getUniformLocation(program,"uLightPos"), lightPos);
    gl.uniform3fv(gl.getUniformLocation(program,"uColor"), color);
    gl.uniform1f(gl.getUniformLocation(program,"uEmissive"), isEmissive ? 1.0 : 0.0);

    gl.drawElements(gl.TRIANGLES, sphere.count, gl.UNSIGNED_SHORT, 0);
}

function resizeCanvas(canvas) {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}