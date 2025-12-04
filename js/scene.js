// scene.js
// Full 3D scene with textures, planets, moons, rings, atmospheres
// Depends on createProgram/createSphere from planets.js
// Depends on matrix helpers from transformations.js

let gl, program, sphere;
let angle = 0;
let animationSpeed = 1.0;
// let cameraAngle = 0;
// let cameraDistance = 35;
// let cameraTarget = null;

let camera = {
    angle: 0,
    distance: 35,
    target: [0, 0, 0],
    height: 5
};

window.cockpit = {
    enabled: false,
    position: [0, 5, 35],
    yaw: 0,
    pitch: 0
};

// Planet textures storage (keyed by texture URL or custom key)
const textures = {};

// ===== Planet Data with rings & atmospheres =====
const planetData = [
    {name:"Mercury", radius:0.38, distance:4, speed:4.15, color:[0.7,0.7,0.7], texture:'assets/texture/mercury.jpg',
     info:{realRadius:"2,439.7 km", tilt:"0.034°", rotationPeriod:"58.6 Earth days", orbitPeriod:"88 Earth days", distance:"57.9 million km", moons:0, description:"The smallest planet in our solar system and nearest to the Sun."}},
    
    {name:"Venus", radius:0.95, distance:5.5, speed:1.62, color:[0.9,0.7,0.4], texture:"assets/texture/venus.jpg",
     info:{realRadius:"6,051.8 km", tilt:"177.4°", rotationPeriod:"243 Earth days", orbitPeriod:"225 Earth days", distance:"108.2 million km", moons:0, description:"Second planet from the Sun, known for its extreme temperatures and thick atmosphere."}},
    
    {name:"Earth", radius:1, distance:7, speed:1.0, color:[0.2,0.5,1.0], texture:"assets/texture/earth.jpg",
     moons:[{name:"Moon", radius:0.27,distance:1.5,speed:2,color:[0.8,0.8,0.8], texture:"assets/texture/moon.jpg"}],
     info:{realRadius:"6,371 km", tilt:"23.5°", rotationPeriod:"24 hours", orbitPeriod:"365 days", distance:"150 million km", moons:1, description:"Third planet from the Sun and the only known planet to harbor life."}},
    
    {name:"Mars", radius:0.53, distance:9, speed:0.53, color:[1.0,0.3,0.2], texture:"assets/texture/mars.jpg",
     moons:[{name:"Phobos", radius:0.14,distance:0.8,speed:3,color:[0.6,0.6,0.6], texture:"assets/texture/phobos.jpg"},
            {name:"Deimos", radius:0.08,distance:1.1,speed:2.5,color:[0.7,0.7,0.7], texture:"assets/texture/deimos.jpg"}],
     info:{realRadius:"3,389.5 km", tilt:"25.19°", rotationPeriod:"1.03 Earth days", orbitPeriod:"687 Earth days", distance:"227.9 million km", moons:2, description:"Known as the Red Planet, famous for its reddish appearance and potential for human colonization."}},
    
    {name:"Jupiter", radius:2.2, distance:13, speed:0.08, color:[0.9,0.7,0.5], texture:"assets/texture/jupiter.jpg",
     info:{realRadius:"69,911 km", tilt:"3.13°", rotationPeriod:"9.9 hours", orbitPeriod:"12 Earth years", distance:"778.5 million km", moons:95, description:"The largest planet in our solar system, known for its Great Red Spot."}},
    
    {name:"Saturn", radius:1.9, distance:17, speed:0.03, color:[0.9,0.8,0.6], texture:"assets/texture/saturn.jpg",
     info:{realRadius:"58,232 km", tilt:"26.73°", rotationPeriod:"10.7 hours", orbitPeriod:"29.5 Earth years", distance:"1.4 billion km", moons:146, description:"Distinguished by its extensive ring system, the second-largest planet in our solar system."}},
    
    {name:"Uranus", radius:1.0, distance:23, speed:0.01, color:[0.5,0.8,0.9], texture:"assets/texture/uranus.jpg",
     info:{realRadius:"25,362 km", tilt:"97.77°", rotationPeriod:"17.2 hours", orbitPeriod:"84 Earth years", distance:"2.87 billion km", moons:27, description:"Known for its tilted axis and faint rings."}},
    
    {name:"Neptune", radius:0.98, distance:30, speed:0.006, color:[0.3,0.4,0.9], texture:"assets/texture/neptune.jpg",
     info:{realRadius:"24,622 km", tilt:"28.32°", rotationPeriod:"16.1 hours", orbitPeriod:"165 Earth years", distance:"4.5 billion km", moons:14, description:"The farthest planet from the Sun, known for strong winds and deep blue color."}}
];

// ===== Stars =====
let stars = [];
function initStars(){
    stars = [];
    for(let i=0;i<800;i++){
        stars.push({position:[(Math.random()-0.5)*100,(Math.random()-0.5)*100,(Math.random()-0.5)*100], size: Math.random()*0.05+0.02});
    }
}

// ===== Asteroids =====
let asteroids = [];
function initAsteroids() {
    asteroids = [];
    const count = 500, inner = 12, outer = 16;
    for (let i = 0; i < count; i++) {
        asteroids.push({
            angle: Math.random() * Math.PI * 2,
            distance: inner + Math.random() * (outer - inner),
            speed: 0.001 + Math.random() * 0.002,
            size: Math.random() * 0.1 + 0.05,
            position: [0,0,0],
            // New game-mode properties
            x: (Math.random()-0.5)*30,
            y: (Math.random()-0.5)*10 + 2,
            z: -50 - Math.random()*50,
            zVelocity: 0.2 + Math.random()*0.1
        });
    }
}

function addAsteroids(count = 50) {
    const inner = 12, outer = 16;
    for (let i = 0; i < count; i++) {
        if(window.cockpit.enabled){
            const posZ = Math.random() * -50 - 10;
            asteroids.push({
                x: (Math.random()-0.5)*30,
                y: (Math.random()-0.5)*10 + 2,
                z: posZ,
                size: Math.random()*0.2 + 0.05,
                zVelocity: 0.3 + Math.random()*0.2
            });
        } else {
            asteroids.push({
                angle: Math.random() * Math.PI * 2,
                distance: inner + Math.random() * (outer - inner),
                speed: 0.001 + Math.random() * 0.002,
                size: Math.random() * 0.1 + 0.05,
                position: [0,0,0]
            });
        }
    }
}
window.addAsteroids = addAsteroids;

// ===== Orbit Rings =====
let orbitRingVAOs = []; // global array
function initOrbitRings() {
    orbitRingVAOs = [];
    planetData.forEach((p, idx) => {
        if (!p.distance) return;
        const segments = 128;
        const positions = [];
        const cosI = Math.cos(p.inclination || 0);
        const sinI = Math.sin(p.inclination || 0);

        // Slightly reduce first ring radius
        const ringRadius = idx === 0 ? p.distance * 0.85 : p.distance; // first planet closer

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * 2 * Math.PI;
            const x = Math.cos(theta) * ringRadius;
            const z = Math.sin(theta) * ringRadius;
            const y = z * sinI;
            const zInclined = z * cosI;
            positions.push(x, y, zInclined);
        }

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
        orbitRingVAOs.push({ vao, count: positions.length / 3, radius: ringRadius, inclination: p.inclination || 0 });
    });
}

// ===== Spaceships =====
let spaceships = [];
function initSpaceships(){ spaceships = []; addSpaceships(3); }
function addSpaceships(count = 1){
    for(let i=0;i<count;i++){
        const pos=[(Math.random()-0.5)*30,1+Math.random()*4,(Math.random()-0.5)*30];
        const dirAngle = Math.random()*Math.PI*2;
        spaceships.push({
            position: [...pos],
            originalPosition: [...pos],
            size: 1.2 + Math.random()*0.6,
            radius: 1.2*0.7,
            speed: 0.02 + Math.random()*0.03,
            angle: Math.random()*Math.PI*2,
            dir: [Math.cos(dirAngle),0,Math.sin(dirAngle)],
            wanderTimer: Math.random()*3 + 1,
            isHit: false,
            hitTimer: 0
        });
    }
}
window.addSpaceships = addSpaceships;
window.spaceships = spaceships;

// ===== Collision check =====
function checkSpaceshipCollisions(){
    if(!window.redProjectiles) return;
    redProjectiles.forEach(proj=>{
        spaceships.forEach(ship=>{
            if(ship.isHit) return;
            const dx=ship.position[0]-proj.position[0];
            const dy=ship.position[1]-proj.position[1];
            const dz=ship.position[2]-proj.position[2];
            const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
            if(dist<ship.radius+(proj.size||0.5)){
                ship.isHit=true;
                ship.hitTimer=60;
                ship.position=[...ship.originalPosition];
                score=0;
                console.log("Hit ship! Score now 0.");
            }
        });
    });
}

// ===== Spaceship mesh with engine flame =====
function createSpaceship(gl){
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const segments = 16;
    const radius = 0.2;    // fuselage radius
    const length = 1.0;    // fuselage length

    // --- Fuselage (cylinder) ---
    for(let i=0;i<=segments;i++){
        const theta = (i/segments)*2*Math.PI;
        const x = Math.cos(theta)*radius;
        const y = Math.sin(theta)*radius;

        // bottom circle
        positions.push(x, y, 0);
        normals.push(x, y, 0);
        uvs.push(i/segments,0);

        // top circle
        positions.push(x, y, length*0.7);
        normals.push(x, y, 0);
        uvs.push(i/segments,1);
    }

    for(let i=0;i<segments;i++){
        const idx = i*2;
        indices.push(idx, idx+1, idx+3);
        indices.push(idx, idx+3, idx+2);
    }

    // --- Nose cone ---
    const noseTipIdx = positions.length/3;
    positions.push(0,0,length); // tip
    normals.push(0,0,1);
    uvs.push(0.5,1);

    for(let i=0;i<segments;i++){
        const idx = i*2 + 1;
        const nextIdx = ((i+1)%segments)*2 + 1;
        indices.push(idx, nextIdx, noseTipIdx);
    }

    // --- Wings ---
    const wingZ = length*0.3;
    const wingLength = 0.5;
    const wingHeight = 0.02;

    let lwStart = positions.length/3;
    positions.push(-wingLength,0,wingZ, 0,wingHeight,wingZ+0.05, -0.1,0,wingZ+0.05);
    normals.push(0,1,0,0,1,0,0,1,0);
    uvs.push(0,0,1,0,0.5,1);
    indices.push(lwStart,lwStart+1,lwStart+2);

    let rwStart = positions.length/3;
    positions.push(wingLength,0,wingZ, 0,wingHeight,wingZ+0.05, 0.1,0,wingZ+0.05);
    normals.push(0,1,0,0,1,0,0,1,0);
    uvs.push(0,0,1,0,0.5,1);
    indices.push(rwStart,rwStart+1,rwStart+2);

    // --- Tail fin ---
    const tailZ = 0.0;
    const tailHeight = 0.2;
    const tfStart = positions.length/3;
    positions.push(0,tailHeight,tailZ, 0,0.02,tailZ+0.1, 0,0.02,tailZ+0.1);
    normals.push(0,1,0,0,1,0,0,1,0);
    uvs.push(0,0,1,0,0.5,1);
    indices.push(tfStart, tfStart+1, tfStart+2);

    // --- Engine flame (cone at back) ---
    const flameStartIdx = positions.length/3;
    const flameHeight = 0.4;
    const flameRadius = 0.1;
    positions.push(0,0,-flameHeight); // tip of flame
    normals.push(0,0,-1);
    uvs.push(0.5,1);

    for(let i=0;i<=segments;i++){
        const theta = (i/segments)*2*Math.PI;
        const x = Math.cos(theta)*flameRadius;
        const y = Math.sin(theta)*flameRadius;
        positions.push(x,y,0);   // base of flame
        normals.push(0,0,-1);
        uvs.push(i/segments,0);
    }

    for(let i=0;i<segments;i++){
        indices.push(flameStartIdx, flameStartIdx+i+1, flameStartIdx+i+2);
    }

    return createVAO(gl, positions, normals, uvs, indices);
}



// ===== Load textures =====
function loadTexture(gl,key,url){
    const tex = gl.createTexture();
    textures[key]={texture:tex,loaded:false};
    const image=new Image();
    image.crossOrigin="anonymous";
    image.onload=()=>{
        gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        if((image.width & (image.width-1))===0 && (image.height & (image.height-1))===0){
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        }
        textures[key].loaded=true;
    };
    image.onerror=()=>console.warn("Failed texture:",url);
    image.src=url;
    return tex;
}

// ===== Initialize scene =====
function initScene(canvas){
    gl = canvas.getContext("webgl2");
    if(!gl){ alert("WebGL2 not supported"); return; }

    resizeCanvas(canvas);
    window.addEventListener('resize',()=>resizeCanvas(canvas));

    const vs=document.getElementById("vs").textContent;
    const fs=document.getElementById("fs").textContent;
    program=createProgram(gl,vs,fs);
    if(!program){ alert("Failed to create GL program"); return; }
    gl.useProgram(program);

    sphere = createSphere(gl,1,40,40);
    spaceshipMesh=createSpaceship(gl);

    gl.enable(gl.DEPTH_TEST);

    initStars();
    initAsteroids();
    initSpaceships();

    planetData.forEach(p=>{
        if(p.texture) loadTexture(gl,p.name,p.texture);
        if(p.atmosphere) loadTexture(gl,p.name+"_atmo",p.atmosphere);
        if(p.ring) loadTexture(gl,p.name+"_ring",p.ring.texture);
        if(p.moons){
            p.moons.forEach((m,idx)=>{
                const key = m.name?`${p.name}_${m.name}`:`${p.name}_moon_${idx}`;
                m.__texKey = key;
                if(m.texture) loadTexture(gl,key,m.texture);
            });
        }
    });
    loadTexture(gl,"Sun","assets/texture/sun.jpg");
}

function drawOrbitRing(radius, segments = 128, color = [0.5, 0.5, 0.5], inclination = 0) {
    const cosI = Math.cos(inclination);
    const sinI = Math.sin(inclination);

    const positions = [];
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        const x = Math.cos(theta) * radius;
        let z = Math.sin(theta) * radius;
        const y = z * sinI;
        const zInclined = z * cosI;
        positions.push([x, y, zInclined]);
    }

    for (let i = 0; i < segments; i++) {
        drawLine(positions[i], positions[i+1], color);
    }
}

function drawLine(p1, p2, color) {
    const positions = [...p1, ...p2];
    const normals = [0,1,0,0,1,0]; // dummy
    const uvs = [0,0,0,0];
    const indices = [0,1];
    const vao = createVAO(gl, positions, normals, uvs, indices, gl.LINES);

    gl.bindVertexArray(vao.vao);
    gl.uniform1i(gl.getUniformLocation(program,"useTexture"),0);
    gl.uniform3fv(gl.getUniformLocation(program,"uColor"), color);
    gl.drawElements(gl.LINES, vao.count, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}

// ===== Draw Scene =====
function drawScene(){
    if(!gl || !program) return;
    gl.clearColor(0.02,0.02,0.04,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    angle += 0.01*animationSpeed;

    let eye, target;
    if(window.cockpit.enabled){
        const cp=window.cockpit;
        const cosPitch=Math.cos(cp.pitch), sinPitch=Math.sin(cp.pitch);
        const cosYaw=Math.cos(cp.yaw), sinYaw=Math.sin(cp.yaw);
        const forward=[sinYaw*cosPitch,sinPitch,cosYaw*cosPitch];
        eye=cp.position;
        target=[eye[0]+forward[0],eye[1]+forward[1],eye[2]+forward[2]];
    } else {
        const camX=Math.sin(camera.angle)*camera.distance;
        const camZ=Math.cos(camera.angle)*camera.distance;
        const camY=camera.height;
        eye=[camX,camY,camZ];
        target=camera.target;
    }

    const view=lookAt(eye,target,[0,1,0]);
    const aspect=gl.canvas.clientWidth/gl.canvas.clientHeight;
    const proj=perspective(Math.PI/4,aspect,0.1,200.0);
    const lightPos=[0,0,0];

    const locModel = gl.getUniformLocation(program,"uModel");
    const locView = gl.getUniformLocation(program,"uView");
    const locProj = gl.getUniformLocation(program,"uProjection");
    const locNormal = gl.getUniformLocation(program,"uNormalMatrix");
    const locLight = gl.getUniformLocation(program,"uLightPos");
    const locColor = gl.getUniformLocation(program,"uColor");
    const locEmissive = gl.getUniformLocation(program,"uEmissive");
    const locUseTexture = gl.getUniformLocation(program,"useTexture");
    const locTexture = gl.getUniformLocation(program,"uTexture");

    function drawSphereInstance(position,scale,color,isEmissive=false,texKey=null,rotationAngle=0){
        gl.bindVertexArray(sphere.vao);
        let model = mat4Identity();
        model = mat4Translate(model,position);
        model = mat4RotateY(model,rotationAngle);
        model = mat4Scale(model,[scale,scale,scale]);
        const normalMatrix=mat4Transpose(mat4Invert(model));

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

    // --- Stars ---
    stars.forEach(s=>drawSphereInstance(s.position,s.size,[1,1,1],true,null));
    // --- Sun ---
    drawSphereInstance([0,0,0],2.5,[1,1,1],true,"Sun");

    
    // --- Draw Orbit Rings ---
    orbitRingVAOs.forEach(ring => {
        gl.bindVertexArray(ring.vao);
        gl.uniform3fv(locColor, [0.5, 0.5, 0.5]);
        gl.uniform1f(locEmissive, 0.3);
        gl.uniform1i(locUseTexture, 0);
        gl.drawArrays(gl.LINE_LOOP, 0, ring.count);
        gl.bindVertexArray(null);
    });
planetData.forEach(p => {
    const orbitAngle = angle * p.speed;
    const radius = p.distance;      // planet orbit radius
    const incl = p.inclination || 0;
    const cosI = Math.cos(incl);
    const sinI = Math.sin(incl);

    // Planet position on the orbit ring
    const x = Math.cos(orbitAngle) * radius;
    const zRaw = Math.sin(orbitAngle) * radius;
    const y = zRaw * sinI;         // vertical component due to inclination
    const z = zRaw * cosI;         // along the ring plane

    const spin = angle * 2.0;
    drawSphereInstance([x, y, z], p.radius, p.color, false, p.name, spin);
    p.center = [x, y, z];

    // Atmosphere
    if(p.atmosphere) drawSphereInstance([x, y, z], p.radius + 0.1, [1,1,1], false, p.name+"_atmo");

    // Optional planet ring
    if(p.ring) drawRing(p.center, p.radius, p.ring);

    // Moons orbit around planet center
    if(p.moons) {
        p.moons.forEach(m => {
            const moonAngle = angle * m.speed;
            const mxRaw = Math.cos(moonAngle) * m.distance;
            const mzRaw = Math.sin(moonAngle) * m.distance;

            const mx = x + mxRaw;
            const my = y + mzRaw * sinI;
            const mz = z + mzRaw * cosI;

            drawSphereInstance([mx, my, mz], m.radius, m.color, false, m.__texKey || null);
        });
    }
});

    // --- Asteroids ---
    asteroids.forEach(a=>{
        if(window.cockpit.enabled){
            a.z += a.zVelocity;
            if(a.z > window.cockpit.position[2]){
                a.z = -50 - Math.random()*50;
                a.x = (Math.random()-0.5)*30;
                a.y = (Math.random()-0.5)*10 + 2;
            }
            a.position = [a.x, a.y, a.z];
        } else {
            a.angle += a.speed*100*0.01;
            const x = Math.cos(a.angle) * a.distance;
            const z = Math.sin(a.angle) * a.distance;
            a.position = [x, 0, z];
        }
        drawSphereInstance(a.position, a.size, [0.7,0.7,0.7], false, null);
    });

    // --- Red projectiles ---
    if(window.redProjectiles){
        window.redProjectiles.forEach(p=>drawSphereInstance(p.position,p.size||0.5,[1,0.1,0],true,null));
    }

    // --- Spaceships ---
    drawSpaceships(view,proj,lightPos);
}




// ===== Draw Spaceships =====
function drawSpaceships(view,proj,lightPos){
    const locModel = gl.getUniformLocation(program,"uModel");
    const locView = gl.getUniformLocation(program,"uView");
    const locProj = gl.getUniformLocation(program,"uProjection");
    const locNormal = gl.getUniformLocation(program,"uNormalMatrix");
    const locLight = gl.getUniformLocation(program,"uLightPos");
    const locColor = gl.getUniformLocation(program,"uColor");
    const locEmissive = gl.getUniformLocation(program,"uEmissive");
    const locUseTexture = gl.getUniformLocation(program,"useTexture");

    for(let s of spaceships){
        // Movement
        if(s.isHit && s.hitTimer>0){ s.hitTimer--; }
        else if(s.isHit && s.hitTimer<=0){ s.isHit=false; }
        else{
            s.wanderTimer-=0.016;
            if(s.wanderTimer<=0){
                const a=Math.random()*Math.PI*2;
                s.dir=[Math.cos(a),0,Math.sin(a)];
                s.wanderTimer=1+Math.random()*3;
            }
            s.position[0]+=s.dir[0]*s.speed*30*0.016;
            s.position[2]+=s.dir[2]*s.speed*30*0.016;
            const limit=35;
            if(s.position[0]>limit){s.position[0]=limit;s.dir[0]*=-1;}
            if(s.position[0]<-limit){s.position[0]=-limit;s.dir[0]*=-1;}
            if(s.position[2]>limit){s.position[2]=limit;s.dir[2]*=-1;}
            if(s.position[2]<-limit){s.position[2]=-limit;s.dir[2]*=-1;}
        }
        s.angle+=0.02+s.speed*0.5;

        const x=s.position[0],y=s.position[1],z=s.position[2];

        // Ship
        gl.bindVertexArray(spaceshipMesh.vao);
        let model=mat4Identity();
        model=mat4Translate(model,[x,y,z]);
        model=mat4RotateY(model,s.angle);
        model=mat4Scale(model,[s.size,s.size,s.size]);
        const normalMatrix=mat4Transpose(mat4Invert(model));
        gl.uniformMatrix4fv(locModel,false,model);
        gl.uniformMatrix4fv(locView,false,view);
        gl.uniformMatrix4fv(locProj,false,proj);
        gl.uniformMatrix4fv(locNormal,false,normalMatrix);
        gl.uniform3fv(locLight,lightPos);
        gl.uniform3fv(locColor,s.isHit?[1,1,0]:[0.8,0.12,0.12]);
        gl.uniform1f(locEmissive,0);
        gl.uniform1i(locUseTexture,0);
        gl.drawElements(gl.TRIANGLES,spaceshipMesh.count,gl.UNSIGNED_SHORT,0);
        gl.bindVertexArray(null);

        // Engine flame
        const flameScale=0.9+0.2*Math.sin(angle*20+(s.angle*4));
        let flameModel=mat4Identity();
        flameModel=mat4Translate(flameModel,[x,y,z]);
        flameModel=mat4RotateY(flameModel,s.angle);
        flameModel=mat4Scale(flameModel,[s.size*flameScale,s.size*flameScale,s.size*flameScale]);
        const flameNormal=mat4Transpose(mat4Invert(flameModel));
        gl.uniformMatrix4fv(locModel,false,flameModel);
        gl.uniformMatrix4fv(locNormal,false,flameNormal);
        gl.uniform3fv(locColor,[1,0.4,0]);
        gl.uniform1f(locEmissive,1.0);
        gl.bindVertexArray(spaceshipMesh.vao);
        gl.drawElements(gl.TRIANGLES,spaceshipMesh.count,gl.UNSIGNED_SHORT,0);
        gl.bindVertexArray(null);
    }
}

// ===== Draw ring =====
function drawRing(center,planetScale,ring){
    const segments=64;
    for(let i=0;i<segments;i++){
        const theta1=(i/segments)*2*Math.PI;
        const theta2=((i+1)/segments)*2*Math.PI;
        const x1=center[0]+ring.innerRadius*Math.cos(theta1);
        const z1=center[2]+ring.innerRadius*Math.sin(theta1);
        const x2=center[0]+ring.outerRadius*Math.cos(theta1);
        const z2=center[2]+ring.outerRadius*Math.sin(theta1);
        const x3=center[0]+ring.outerRadius*Math.cos(theta2);
        const z3=center[2]+ring.outerRadius*Math.sin(theta2);
        const x4=center[0]+ring.innerRadius*Math.cos(theta2);
        const z4=center[2]+ring.innerRadius*Math.sin(theta2);
        drawTriangle([x1,0,z1],[x2,0,z2],[x3,0,z3],[1,1,1],ring.texture);
        drawTriangle([x1,0,z1],[x3,0,z3],[x4,0,z4],[1,1,1],ring.texture);
    }
}

// ===== Draw triangle helper =====
function drawTriangle(v1,v2,v3,color,texKey){
    if(texKey && textures[texKey] && textures[texKey].loaded){
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,textures[texKey].texture);
        gl.uniform1i(gl.getUniformLocation(program,"uTexture"),0);
        gl.uniform1i(gl.getUniformLocation(program,"useTexture"),1);
    } else gl.uniform1i(gl.getUniformLocation(program,"useTexture"),0);

    const positions=[...v1,...v2,...v3];
    const normals=[0,1,0,0,1,0,0,1,0];
    const uvs=[0,0,1,0,1,1];
    const indices=[0,1,2];
    const vao=createVAO(gl,positions,normals,uvs,indices);
    gl.bindVertexArray(vao.vao);
    gl.drawElements(gl.TRIANGLES,vao.count,gl.UNSIGNED_SHORT,0);
    gl.bindVertexArray(null);
}

// ===== Canvas resize =====
function resizeCanvas(canvas){
    const displayWidth=canvas.clientWidth;
    const displayHeight=canvas.clientHeight;
    if(canvas.width!==displayWidth || canvas.height!==displayHeight){
        canvas.width=displayWidth;
        canvas.height=displayHeight;
        if(gl) gl.viewport(0,0,canvas.width,canvas.height);
    }
}