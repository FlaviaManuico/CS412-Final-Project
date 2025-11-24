// ==========================
// scene.js
// Handles 3D scene, planets, moons, stars, asteroids
// ==========================

let gl, program, sphere;
let angle = 0;

// Camera
let cameraAngle = 0;
let cameraDistance = 35;

// Planet selection
let selectedPlanet = null;
let cameraTarget = null;
let cameraZooming = false;

// Planet data
const planetData = [
    {name:"Mercury", radius:0.38, distance:4, speed:4.15, color:[0.7,0.7,0.7],
     info: {
        realRadius: "2,439.7 km",
        tilt: "0.034°",
        rotationPeriod: "58.6 Earth days",
        orbitPeriod: "88 Earth days",
        distance: "57.9 million km",
        moons: 0,
        description: "The smallest planet in our solar system and nearest to the Sun."
     }
    },
    {name:"Venus", radius:0.95, distance:5.5, speed:1.62, color:[0.9,0.7,0.4],
     info: {
        realRadius: "6,051.8 km",
        tilt: "177.4°",
        rotationPeriod: "243 Earth days",
        orbitPeriod: "225 Earth days",
        distance: "108.2 million km",
        moons: 0,
        description: "Second planet from the Sun, known for its extreme temperatures and thick atmosphere."
     }
    },
    {name:"Earth", radius:1, distance:7, speed:1.0, color:[0.2,0.5,1.0],
     moons:[{radius:0.27,distance:1.5,speed:2,color:[0.8,0.8,0.8]}],
     info: {
        realRadius: "6,371 km",
        tilt: "23.5°",
        rotationPeriod: "24 hours",
        orbitPeriod: "365 days",
        distance: "150 million km",
        moons: 1,
        description: "Third planet from the Sun and the only known planet to harbor life."
     }
    },
    {name:"Mars", radius:0.53, distance:9, speed:0.53, color:[1.0,0.3,0.2],
     moons:[{radius:0.14,distance:0.8,speed:3,color:[0.6,0.6,0.6]},{radius:0.08,distance:1.1,speed:2.5,color:[0.7,0.7,0.7]}],
     info: {
        realRadius: "3,389.5 km",
        tilt: "25.19°",
        rotationPeriod: "1.03 Earth days",
        orbitPeriod: "687 Earth days",
        distance: "227.9 million km",
        moons: 2,
        description: "Known as the Red Planet, famous for its reddish appearance and potential for human colonization."
     }
    },
    {name:"Jupiter", radius:2.2, distance:13, speed:0.08, color:[0.9,0.7,0.5],
     info: {
        realRadius: "69,911 km",
        tilt: "3.13°",
        rotationPeriod: "9.9 hours",
        orbitPeriod: "12 Earth years",
        distance: "778.5 million km",
        moons: 95,
        description: "The largest planet in our solar system, known for its Great Red Spot."
     }
    },
    {name:"Saturn", radius:1.9, distance:17, speed:0.03, color:[0.9,0.8,0.6],
     info: {
        realRadius: "58,232 km",
        tilt: "26.73°",
        rotationPeriod: "10.7 hours",
        orbitPeriod: "29.5 Earth years",
        distance: "1.4 billion km",
        moons: 146,
        description: "Distinguished by its extensive ring system, the second-largest planet in our solar system."
     }
    },
    {name:"Uranus", radius:1.0, distance:21, speed:0.01, color:[0.5,0.8,0.9],
     info: {
        realRadius: "25,362 km",
        tilt: "97.77°",
        rotationPeriod: "17.2 hours",
        orbitPeriod: "84 Earth years",
        distance: "2.87 billion km",
        moons: 27,
        description: "Known for its tilted axis and faint rings."
     }
    },
    {name:"Neptune", radius:0.98, distance:25, speed:0.006, color:[0.3,0.4,0.9],
     info: {
        realRadius: "24,622 km",
        tilt: "28.32°",
        rotationPeriod: "16.1 hours",
        orbitPeriod: "165 Earth years",
        distance: "4.5 billion km",
        moons: 14,
        description: "The farthest planet from the Sun, known for strong winds and deep blue color."
     }
    }
];


// Stars
let stars = [];
function initStars() {
    for(let i=0;i<500;i++){
        stars.push({
            position: [(Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100],
            size: Math.random()*0.05+0.02
        });
    }
}

// Asteroids
let asteroids = [];
function initAsteroids() {
    const asteroidCount = 500;
    const asteroidInner = 12;
    const asteroidOuter = 16;
    for(let i=0;i<asteroidCount;i++){
        asteroids.push({
            angle: Math.random()*Math.PI*2,
            distance: asteroidInner + Math.random()*(asteroidOuter-asteroidInner),
            speed: 0.001 + Math.random()*0.002,
            size: Math.random()*0.1+0.05
        });
    }
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
    gl.enable(gl.DEPTH_TEST);

    initStars();
    initAsteroids();
}

function drawScene(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if(!selectedPlanet) angle += 0.01;

    const camX = Math.sin(cameraAngle)*cameraDistance;
    const camZ = Math.cos(cameraAngle)*cameraDistance;
    const camY = 5;
    const view = lookAt([camX,camY,camZ], cameraTarget || [0,0,0],[0,1,0]);
    const aspect = gl.canvas.clientWidth/gl.canvas.clientHeight;
    const proj = perspective(Math.PI/4, aspect, 0.1, 100);
    const lightPos = [0,0,0];

    // Stars
    stars.forEach(s=>drawSphere(s.position, s.size, [1,1,1], view, proj, lightPos, true));

    // Sun
    drawSphere([0,0,0], 2.5, [1.0,0.9,0.3], view, proj, lightPos, true);

    // Planets
    planetData.forEach(p=>{
        const pAngle = angle*p.speed;
        const x = Math.cos(pAngle)*p.distance;
        const z = Math.sin(pAngle)*p.distance;
        const scale = (selectedPlanet===p.name)? p.radius*1.3 : p.radius;
        drawSphere([x,0,z], scale, p.color, view, proj, lightPos, false);
        p.center = [x,0,z];

        // Moons
        if(p.moons){
            p.moons.forEach(m=>{
                const mAngle = angle*m.speed;
                const mx = x + Math.cos(mAngle)*m.distance;
                const mz = z + Math.sin(mAngle)*m.distance;
                drawSphere([mx,0,mz], m.radius, m.color, view, proj, lightPos, false);
            });
        }
    });

    // Asteroids
    asteroids.forEach(a=>{
        const x = Math.cos(a.angle + angle*a.speed)*a.distance;
        const z = Math.sin(a.angle + angle*a.speed)*a.distance;
        drawSphere([x,0,z], a.size, [0.7,0.7,0.7], view, proj, lightPos, false);
    });
}

function drawSphere(position, scale, color, view, proj, lightPos, isEmissive=false){
    gl.bindVertexArray(sphere.vao);
    let model = mat4Identity();
    model = mat4Translate(model, position);
    model = mat4Scale(model, [scale,scale,scale]);
    let normalMatrix = mat4Transpose(mat4Invert(model));

    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uModel"),false,model);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uView"),false,view);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uProjection"),false,proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"uNormalMatrix"),false,normalMatrix);
    gl.uniform3fv(gl.getUniformLocation(program,"uLightPos"), lightPos);
    gl.uniform3fv(gl.getUniformLocation(program,"uColor"), color);
    gl.uniform1f(gl.getUniformLocation(program,"uEmissive"), isEmissive?1.0:0.0);

    gl.drawElements(gl.TRIANGLES, sphere.count, gl.UNSIGNED_SHORT,0);
}

function resizeCanvas(canvas){
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if(canvas.width!==displayWidth || canvas.height!==displayHeight){
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0,0,canvas.width,canvas.height);
    }
}
