// main.js
window.animationSpeed = 1.0;   // Global animation speed
window.animationEnabled = true; // Toggle animation

window.onload = () => {
    const canvas = document.getElementById("glcanvas");
    initScene(canvas);

    function loop(){
        drawScene();
        if(window.__updateInteraction) window.__updateInteraction(); // smooth focus update
        requestAnimationFrame(loop);
    }

    loop();
};
