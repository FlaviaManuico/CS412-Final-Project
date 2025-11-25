// ==========================
// scene.js (updated)
// Textures fixed, safer loading, better logging
// ==========================

let gl, program, sphere;
let angle = 0;
let animationSpeed = 1.0;
let showSpaceships = true;

// Camera
let cameraAngle = 0;
let cameraDistance = 35;
let cameraTarget = null;

// Planet selection
let selectedPlanet = null;

// Sun texture holder
let sunTexture = null;

// Planet data (texture paths relative to index.html)
const planetData = [
    {name:"Mercury", radius:0.38, distance:4, speed:4.15, color:[0.7,0.7,0.7], texture:"js/texture/mercury.jpg",
     info:{realRadius:"2,439.7 km", tilt:"0.034°", rotationPeriod:"58.6 Earth days", orbitPeriod:"88 Earth days", distance:"57.9 million km", moons:0, description:"The smallest planet in our solar system and nearest to the Sun."}},
    {name:"Venus", radius:0.95, distance:5.5, speed:1.62, color:[0.9,0.7,0.4], texture:"js/texture/venus.jpg",
     info:{realRadius:"6,051.8 km", tilt:"177.4°", rotationPeriod:"243 Earth days", orbitPeriod:"225 Earth days", distance:"108.2 million km", moons:0, description:"Second planet from the Sun, known for its extreme temperatures and thick atmosphere."}},
    {name:"Earth", radius:1, distance:7, speed:1.0, color:[0.2,0.5,1.0], texture:"js/texture/earth.jpg",
     moons:[{radius:0.27,distance:1.5,speed:2,color:[0.8,0.8,0.8], texture:"js/texture/moon.jpg"}],
     info:{realRadius:"6,371 km", tilt:"23.5°", rotationPeriod:"24 hours", orbitPeriod:"365 days", distance:"150 million km", moons:1, description:"Third planet from the Sun and the only known planet to harbor life."}},
    {name:"Mars", radius:0.53, distance:9, speed:0.53, color:[1.0,0.3,0.2], texture:"js/texture/mars.jpg",
     moons:[
         {radius:0.14,distance:0.8,speed:3,color:[0.6,0.6,0.6], texture:"js/texture/phobos.jpg"},
         {radius:0.08,distance:1.1,speed:2.5,color:[0.7,0.7,0.7], texture:"js/texture/deimos.png"}
     ],
     info:{realRadius:"3,389.5 km", tilt:"25.19°", rotationPeriod:"1.03 Earth days", orbitPeriod:"687 Earth days", distance:"227.9 million km", moons:2, description:"Known as the Red Planet, famous for its reddish appearance and potential for human colonization."}},
    {name:"Jupiter", radius:2.2, distance:13, speed:0.08, color:[0.9,0.7,0.5], texture:"js/texture/jupiter.jpg",
     info:{realRadius:"69,911 km", tilt:"3.13°", rotationPeriod:"9.9 hours", orbitPeriod:"12 Earth years", distance:"778.5 million km", moons:95, description:"The largest planet in our solar system, known for its Great Red Spot."}},
    {name:"Saturn", radius:1.9, distance:17, speed:0.03, color:[0.9,0.8,0.6], texture:"js/texture/saturn.jpg",
     info:{realRadius:"58,232 km", tilt:"26.73°", rotationPeriod:"10.7 hours", orbitPeriod:"29.5 Earth years", distance:"1.4 billion km", moons:146, description:"Distinguished by its extensive ring system, the second-largest planet in our solar system."}},
    {name:"Uranus", radius:1.0, distance:21, speed:0.01, color:[0.5,0.8,0.9], texture:"js/texture/uranus.jpg",
     info:{realRadius:"25,362 km", tilt:"97.77°", rotationPeriod:"17.2 hours", orbitPeriod:"84 Earth years", distance:"2.87 billion km", moons:27, description:"Known for its tilted axis and faint rings."}},
    {name:"Neptune", radius:0.98, distance:25, speed:0.006, color:[0.3,0.4,0.9], texture:"js/texture/neptune.jpg",
     info:{realRadius:"24,622 km", tilt:"28.32°", rotationPeriod:"16.1 hours", orbitPeriod:"165 Earth years", distance:"4.5 billion km", moons:14, description:"The farthest planet from the Sun, known for strong winds and deep blue color."}}
];

// Stars
let stars = [];
function initStars(){
    stars = [];
    for(let i=0;i<500;i++){
        stars.push({position:[(Math.random()-0.5)*100,(Math.random()-0.5)*100,(Math.random()-0.5)*100], size: Math.random()*0.05+0.02});
    }
}

// Asteroids
let asteroids = [];
function initAsteroids(){
    asteroids = [];
    const asteroidCount = 500;
    const asteroidInner = 12;
    const asteroidOuter = 16;
    for(let i=0;i<asteroidCount;i++){
        asteroids.push({angle:Math.random()*Math.PI*2, distance:asteroidInner+Math.random()*(asteroidOuter-asteroidInner), speed:0.001+Math.random()*0.002, size: Math.random()*0.1+0.05});
    }
}

// Utility: is power of two
function isPowerOfTwo(value){
    return (value & (value - 1)) === 0;
}

// Safer loadTexture: placeholder pixel, parameters, onload/onerror handling
function loadTexture(url, nameForLog = "") {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // 1x1 blue placeholder while image loads
    const placeholder = new Uint8Array([200, 200, 200, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

    const img = new Image();
    img.crossOrigin = ""; // try to avoid CORS issues for external images; local server still required
    img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        if (isPowerOfTwo(img.width) && isPowerOfTwo(img.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            // NPOT: no mipmaps, clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        console.log(`Texture loaded: ${url} ${nameForLog ? "(" + nameForLog + ")" : ""}`);
    };
    img.onerror = (e) => {
        console.warn(`Failed to load texture: ${url} ${nameForLog ? "(" + nameForLog + ")" : ""}`, e);
        // keep placeholder so drawing continues
    };
    img.src = url;
    return tex;
}

function initScene(canvas){
    gl = canvas.getContext("webgl2");
    if(!gl){ alert("WebGL2 not supported"); return; }

    resizeCanvas(canvas);
    window.addEventListener('resize', ()=>resizeCanvas(canvas));

    const vs = document.getElementById("vs").textContent;
    const fs = document.getElementById("fs").textContent;
    program = createProgram(gl, vs, fs);
    gl.useProgram(program);

    sphere = createSphere(gl,1,30,30);
    if(!sphere || !sphere.count) console.warn("Sphere geometry might be invalid:", sphere);
    gl.enable(gl.DEPTH_TEST);

    initStars();
    initAsteroids();

    // load sun texture (ensure file exists: js/texture/sun.jpg)
    sunTexture = loadTexture("js/texture/sun.jpg", "Sun");

    // Attach textures directly to planet and moon objects (p.texObj, m.texObj)
    planetData.forEach((p) => {
        if (p.texture) p.texObj = loadTexture(p.texture, p.name);
        if (p.moons) {
            p.moons.forEach((m, idx) => {
                if (m.texture) m.texObj = loadTexture(m.texture, `${p.name}-moon${idx}`);
            });
        }
    });

    console.log("initScene finished. Remember: use a local server (http://localhost:8000) — opening index.html via file:// will cause WebGL texture security errors.");
}

function drawScene(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    angle += 0.01 * animationSpeed;

    const camX = Math.sin(cameraAngle)*cameraDistance;
    const camZ = Math.cos(cameraAngle)*cameraDistance;
    const camY = 5;
    const view = lookAt([camX,camY,camZ], cameraTarget||[0,0,0],[0,1,0]);
    const aspect = gl.canvas.clientWidth/gl.canvas.clientHeight;
    const proj = perspective(Math.PI/4, aspect, 0.1, 100);
    const lightPos = [0,0,0];

    // Stars
    stars.forEach(s=>drawSphere(s.position,s.size,[1,1,1],view,proj,lightPos,true));

    // Sun (use sunTexture if loaded)
    drawSphere([0,0,0],2.5,[1.0,0.9,0.3],view,proj,lightPos,true,sunTexture);

    // Planets and moons
    planetData.forEach(p=>{
        const pAngle = angle * p.speed * animationSpeed;
        const x = Math.cos(pAngle) * p.distance;
        const z = Math.sin(pAngle) * p.distance;
        const scale = (selectedPlanet === p.name) ? p.radius * 1.3 : p.radius;

        drawSphere([x,0,z], scale, p.color, view, proj, lightPos, false, p.texObj || null);
        p.center = [x,0,z];

        if (p.moons) {
            p.moons.forEach(m=>{
                const mAngle = angle * m.speed * animationSpeed;
                const mx = x + Math.cos(mAngle) * m.distance;
                const mz = z + Math.sin(mAngle) * m.distance;
                drawSphere([mx,0,mz], m.radius, m.color, view, proj, lightPos, false, m.texObj || null);
            });
        }
    });

    // Asteroids
    asteroids.forEach(a=>{
        const x = Math.cos(a.angle + angle * a.speed * animationSpeed) * a.distance;
        const z = Math.sin(a.angle + angle * a.speed * animationSpeed) * a.distance;
        drawSphere([x,0,z], a.size, [0.7,0.7,0.7], view, proj, lightPos, false, null);
    });

    // Spaceship placeholder orbiting Earth
    if (showSpaceships) {
        planetData.forEach(p=>{
            if (p.name === "Earth" && p.center) {
                const sAngle = angle * 2 * animationSpeed;
                const sx = p.center[0] + Math.cos(sAngle) * 2;
                const sz = p.center[2] + Math.sin(sAngle) * 2;
                drawSphere([sx,0,sz], 0.2, [1,0,0], view, proj, lightPos, false, null);
            }
        });
    }
}

function drawSphere(position, scale, color, view, proj, lightPos, isEmissive=false, texture=null){
    gl.bindVertexArray(sphere.vao);
    let model = mat4Identity();
    model = mat4Translate(model, position);
    model = mat4Scale(model, [scale, scale, scale]);
    let normalMatrix = mat4Transpose(mat4Invert(model));

    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uModel"), false, model);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uView"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uNormalMatrix"), false, normalMatrix);
    gl.uniform3fv(gl.getUniformLocation(program,"uLightPos"), lightPos);
    gl.uniform3fv(gl.getUniformLocation(program,"uColor"), color);
    gl.uniform1f(gl.getUniformLocation(program,"uEmissive"), isEmissive ? 1.0 : 0.0);

    const useTextureLoc = gl.getUniformLocation(program, "useTexture");
    const uTexture = gl.getUniformLocation(program, "uTexture");

    if (texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uTexture, 0);
        gl.uniform1i(useTextureLoc, 1);
    } else {
        gl.uniform1i(useTextureLoc, 0);
    }

    gl.drawElements(gl.TRIANGLES, sphere.count, gl.UNSIGNED_SHORT, 0);
}

function resizeCanvas(canvas){
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0,0,canvas.width,canvas.height);
    }
}
