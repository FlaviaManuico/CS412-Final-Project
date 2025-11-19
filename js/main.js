window.onload = () => {
    const canvas = document.getElementById("glcanvas");

    initScene(canvas);

    function loop() {
        drawScene();
        requestAnimationFrame(loop);
    }

    loop();
};
