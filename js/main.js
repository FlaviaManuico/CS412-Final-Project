// main.js
window.animationSpeed = 1.0;   // Global animation speed
window.animationEnabled = true; // Toggle animation
let lastTime = 0;

function loop(time) {
    const dt = (time - lastTime) / 1000 || 0.016;
    lastTime = time;
    if (window.__updateInteraction) {
        window.__updateInteraction(dt);
    }
    drawScene();
    requestAnimationFrame(loop);
}

window.onload = () => {
    const canvas = document.getElementById("glcanvas");
    initScene(canvas);
    requestAnimationFrame(loop);
};