let gl;
let program;
let sphere;
let angle = 0;

let cameraAngle = 0;
let cameraDistance = 20;

function initScene(canvas) {
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL not supported");
    }
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

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
        cameraDistance = Math.max(5, Math.min(30, cameraDistance));
    });
}


function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    angle += 0.01;

    // camera
    const camX = Math.sin(cameraAngle) * cameraDistance;
    const camZ = Math.cos(cameraAngle) * cameraDistance;
    const view = mat4.create();
    mat4.lookAt(view, [camX, 5, camZ], [0, 0, 0], [0, 1, 0]);

    // projection
    const proj = mat4.create();
    mat4.perspective(proj, Math.PI / 4, gl.canvas.width/gl.canvas.height, 0.1, 100);

    // LIGHT
    const lightPos = [10, 10, 10];

    // sun at the center
    drawSphere([0, 0, 0], 2.5, [1.0, 0.8, 0.1], view, proj, lightPos);

    // planet a
    let planetAAngle = angle;
    let planetAX = Math.cos(planetAAngle) * 6;
    let planetAZ = Math.sin(planetAAngle) * 6;
    drawSphere([planetAX, 0, planetAZ], 1, [0.2, 0.5, 1.0], view, proj, lightPos);

    // moon  (orbiting Planet a)
    let moonA1Angle = angle * 3;
    let moonA1X = planetAX + Math.cos(moonA1Angle) * 2;
    let moonA1Z = planetAZ + Math.sin(moonA1Angle) * 2;
    drawSphere([moonA1X, 0, moonA1Z], 0.3, [0.7, 0.7, 0.7], view, proj, lightPos);

    // planet b
    let planetBAngle = angle * 0.5;
    let planetBX = Math.cos(planetBAngle) * 9;
    let planetBZ = Math.sin(planetBAngle) * 9;
    drawSphere([planetBX, 0, planetBZ], 0.8, [1.0, 0.3, 0.2], view, proj, lightPos);
}


function drawSphere(position, scale, color, view, proj, lightPos) {
    gl.bindVertexArray(sphere.vao);

    const model = mat4.create();
    mat4.translate(model, model, position);
    mat4.scale(model, model, [scale, scale, scale]);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, model);
    mat4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uModel"),false, model);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uView"),false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uProjection"),false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uNormalMatrix"),false, normalMatrix);
    gl.uniform3fv(gl.getUniformLocation(program,"uLightPos"), lightPos);
    gl.uniform3fv(gl.getUniformLocation(program,"uColor"), color);

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