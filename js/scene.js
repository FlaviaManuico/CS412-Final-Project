// scene.js
// Full 3D scene with textures, planets, moons, rings, atmospheres
// Depends on createProgram/createSphere from planets.js
// Depends on matrix helpers from transformations.js

let gl, program, sphere;
let angle = 0;
let animationSpeed = 1.0;

// Camera
let cameraAngle = 0;
let cameraDistance = 35;
let cameraTarget = null;

// Planet textures storage (keyed by texture URL or custom key)
const textures = {};

// ===== Planet Data with rings & atmospheres =====
const planetData = [
    {name:"Mercury", radius:0.38, distance:4, speed:4.15, color:[0.7,0.7,0.7], texture:'js/texture/mercury.jpg',
     info:{realRadius:"2,439.7 km", tilt:"0.034°", rotationPeriod:"58.6 Earth days", orbitPeriod:"88 Earth days", distance:"57.9 million km", moons:0, description:"The smallest planet in our solar system and nearest to the Sun."}},
    
    {name:"Venus", radius:0.95, distance:5.5, speed:1.62, color:[0.9,0.7,0.4], texture:"js/texture/venus.jpg",
     info:{realRadius:"6,051.8 km", tilt:"177.4°", rotationPeriod:"243 Earth days", orbitPeriod:"225 Earth days", distance:"108.2 million km", moons:0, description:"Second planet from the Sun, known for its extreme temperatures and thick atmosphere."}},
    
    {name:"Earth", radius:1, distance:7, speed:1.0, color:[0.2,0.5,1.0], texture:"js/texture/earth.jpg",
     moons:[{name:"Moon", radius:0.27,distance:1.5,speed:2,color:[0.8,0.8,0.8], texture:"js/texture/moon.jpg"}],
     info:{realRadius:"6,371 km", tilt:"23.5°", rotationPeriod:"24 hours", orbitPeriod:"365 days", distance:"150 million km", moons:1, description:"Third planet from the Sun and the only known planet to harbor life."}},
    
    {name:"Mars", radius:0.53, distance:9, speed:0.53, color:[1.0,0.3,0.2], texture:"js/texture/mars.jpg",
     moons:[{name:"Phobos", radius:0.14,distance:0.8,speed:3,color:[0.6,0.6,0.6], texture:"js/texture/phobos.jpg"},
            {name:"Deimos", radius:0.08,distance:1.1,speed:2.5,color:[0.7,0.7,0.7], texture:"js/texture/deimos.jpg"}],
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

// ===== Stars =====
let stars = [];
function initStars(){
    stars = [];
    for(let i=0;i<500;i++){
        stars.push({position:[(Math.random()-0.5)*100,(Math.random()-0.5)*100,(Math.random()-0.5)*100], size: Math.random()*0.05+0.02});
    }
}

// ===== Asteroids =====
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

// ===== Load textures =====
function loadTexture(gl, key, url){
    const tex = gl.createTexture();
    textures[key] = { texture: tex, loaded: false };
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = ()=> {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        if((image.width & (image.width-1))===0 && (image.height & (image.height-1))===0){
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        textures[key].loaded = true;
    };
    image.onerror = ()=> console.warn("Failed texture:", url);
    image.src = url;
    return tex;
}

// ===== Initialize scene =====
function initScene(canvas){
    gl = canvas.getContext("webgl2");
    if(!gl){ alert("WebGL2 not supported"); return; }

    resizeCanvas(canvas);
    window.addEventListener('resize',()=>resizeCanvas(canvas));

    const vs = document.getElementById("vs").textContent;
    const fs = document.getElementById("fs").textContent;
    program = createProgram(gl, vs, fs);
    if(!program){ alert("Failed to create GL program"); return; }
    gl.useProgram(program);

    sphere = createSphere(gl,1,40,40);
    gl.enable(gl.DEPTH_TEST);

    initStars();
    initAsteroids();

    // Load textures for planets and moons
    planetData.forEach(p=>{
        if(p.texture) loadTexture(gl, p.name, p.texture);
        if(p.atmosphere) loadTexture(gl, p.name+"_atmo", p.atmosphere);
        if(p.ring) loadTexture(gl, p.name+"_ring", p.ring.texture);
        if(p.moons){
            p.moons.forEach((m,idx)=>{
                const key = m.name ? `${p.name}_${m.name}` : `${p.name}_moon_${idx}`;
                m.__texKey = key;
                if(m.texture) loadTexture(gl,key,m.texture);
            });
        }
    });

    loadTexture(gl,"Sun","js/texture/sun.jpg");
}

// ===== Draw scene =====
function drawScene(){
    if(!gl || !program) return;

    gl.clearColor(0.02,0.02,0.04,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    angle += 0.01 * animationSpeed;

    const camX = Math.sin(cameraAngle)*cameraDistance;
    const camZ = Math.cos(cameraAngle)*cameraDistance;
    const camY = 5;
    const view = lookAt([camX,camY,camZ], cameraTarget || [0,0,0], [0,1,0]);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const proj = perspective(Math.PI/4, aspect, 0.1, 200.0);
    const lightPos = [0,0,0];

    const locModel = gl.getUniformLocation(program,"uModel");
    const locView = gl.getUniformLocation(program,"uView");
    const locProj = gl.getUniformLocation(program,"uProjection");
    const locNormal = gl.getUniformLocation(program,"uNormalMatrix");
    const locLight = gl.getUniformLocation(program,"uLightPos");
    const locColor = gl.getUniformLocation(program,"uColor");
    const locEmissive = gl.getUniformLocation(program,"uEmissive");
    const locUseTexture = gl.getUniformLocation(program,"useTexture");
    const locTexture = gl.getUniformLocation(program,"uTexture");

    function drawSphereInstance(position, scale, color, isEmissive=false, texKey=null){
        gl.bindVertexArray(sphere.vao);

        let model = mat4Identity();
        model = mat4Translate(model,position);
        model = mat4Scale(model,[scale,scale,scale]);
        const normalMatrix = mat4Transpose(mat4Invert(model));

        gl.uniformMatrix4fv(locModel,false,model);
        gl.uniformMatrix4fv(locView,false,view);
        gl.uniformMatrix4fv(locProj,false,proj);
        gl.uniformMatrix4fv(locNormal,false,normalMatrix);
        gl.uniform3fv(locLight,lightPos);
        gl.uniform3fv(locColor,color);
        gl.uniform1f(locEmissive,isEmissive?1.0:0.0);

        if(texKey && textures[texKey] && textures[texKey].loaded){
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D,textures[texKey].texture);
            gl.uniform1i(locTexture,0);
            gl.uniform1i(locUseTexture,1);
        } else {
            gl.uniform1i(locUseTexture,0);
        }

        gl.drawElements(gl.TRIANGLES,sphere.count,gl.UNSIGNED_SHORT,0);
        gl.bindVertexArray(null);
    }

    // Stars
    stars.forEach(s=>drawSphereInstance(s.position,s.size,[1,1,1],true,null));
    // Sun
    drawSphereInstance([0,0,0],2.5,[1.0,0.9,0.3],true,null);

    // Planets, moons, atmospheres, rings
    planetData.forEach(p=>{
        const pAngle = angle*p.speed;
        const x = Math.cos(pAngle)*p.distance;
        const z = Math.sin(pAngle)*p.distance;
        const scale = p.radius;

        // Planet
        drawSphereInstance([x,0,z], scale, p.color, false, p.name);
        p.center = [x,0,z];

        // Atmosphere
        if(p.atmosphere){
            drawSphereInstance([x,0,z], scale+0.1, [1,1,1], false, p.name+"_atmo");
        }

        // Ring
        if(p.ring){
            drawRing(p.center, scale, p.ring); // Implemented below
        }

        // Moons
        if(p.moons){
            p.moons.forEach(m=>{
                const mAngle = angle*m.speed;
                const mx = x + Math.cos(mAngle)*m.distance;
                const mz = z + Math.sin(mAngle)*m.distance;
                drawSphereInstance([mx,0,mz], m.radius, m.color, false, m.__texKey||null);
            });
        }
    });

    // Asteroids
    asteroids.forEach(a=>{
        const x = Math.cos(a.angle+angle*a.speed)*a.distance;
        const z = Math.sin(a.angle+angle*a.speed)*a.distance;
        drawSphereInstance([x,0,z], a.size,[0.7,0.7,0.7], false, null);
    });
}

// ===== Draw ring helper =====
function drawRing(center, planetScale, ring){
    const segments = 64;
    for(let i=0;i<segments;i++){
        const theta1 = (i/segments)*2*Math.PI;
        const theta2 = ((i+1)/segments)*2*Math.PI;

        const x1 = center[0] + ring.innerRadius*Math.cos(theta1);
        const z1 = center[2] + ring.innerRadius*Math.sin(theta1);
        const x2 = center[0] + ring.outerRadius*Math.cos(theta1);
        const z2 = center[2] + ring.outerRadius*Math.sin(theta1);
        const x3 = center[0] + ring.outerRadius*Math.cos(theta2);
        const z3 = center[2] + ring.outerRadius*Math.sin(theta2);
        const x4 = center[0] + ring.innerRadius*Math.cos(theta2);
        const z4 = center[2] + ring.innerRadius*Math.sin(theta2);

        // Approximate with two triangles
        drawTriangle([x1,0,z1],[x2,0,z2],[x3,0,z3],[1,1,1], ring.texture);
        drawTriangle([x1,0,z1],[x3,0,z3],[x4,0,z4],[1,1,1], ring.texture);
    }
}

// ===== Draw a single textured triangle =====
function drawTriangle(v1,v2,v3,color,texKey){
    // For simplicity, create temporary VAO for one triangle
    // Bind texture if available
    if(texKey && textures[texKey] && textures[texKey].loaded){
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,textures[texKey].texture);
        gl.uniform1i(gl.getUniformLocation(program,"uTexture"),0);
        gl.uniform1i(gl.getUniformLocation(program,"useTexture"),1);
    } else {
        gl.uniform1i(gl.getUniformLocation(program,"useTexture"),0);
    }

    const positions = [...v1,...v2,...v3];
    const normals = [0,1,0, 0,1,0, 0,1,0];
    const uvs = [0,0, 1,0, 1,1];
    const indices = [0,1,2];

    const vao = createVAO(gl, positions, normals, uvs, indices);
    gl.bindVertexArray(vao.vao);
    gl.drawElements(gl.TRIANGLES, vao.count, gl.UNSIGNED_SHORT,0);
    gl.bindVertexArray(null);
}


function resizeCanvas(canvas){
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if(canvas.width!==displayWidth || canvas.height!==displayHeight){
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        if(gl) gl.viewport(0,0,canvas.width,canvas.height);
    }
}