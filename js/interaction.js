const canvas = document.getElementById("glcanvas");
const infoPanel = document.getElementById("planet-info");
const infoName = document.getElementById("info-name");
const infoText = document.getElementById("info-text");
const infoClose = document.getElementById("info-close");

infoClose.addEventListener("click", ()=>{
    selectedPlanet=null;
    cameraTarget=null;
    cameraZooming=false;
    infoPanel.style.display="none";
});

canvas.addEventListener("click", (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left)/canvas.clientWidth)*2 -1;
    const mouseY = -(((e.clientY - rect.top)/canvas.clientHeight)*2 -1);

    let closest = null;
    let minDist = Infinity;

    planetData.forEach(p=>{
        if(!p.center) return;
        const dx = mouseX - (p.center[0]/30);
        const dy = mouseY - (p.center[2]/30);
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist<minDist && dist<0.15){
            minDist=dist;
            closest=p;
        }
    });

    if(closest){
        selectedPlanet = closest.name;
        cameraTarget = closest.center;
        cameraZooming = true;

        infoPanel.style.display="block";
        infoName.innerHTML = closest.name;
        infoText.innerHTML = closest.info;
    }
});
