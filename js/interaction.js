document.addEventListener("DOMContentLoaded",()=>{

    const canvas=document.getElementById("glcanvas");
    const infoPanel=document.getElementById("planet-info");
    const infoName=document.getElementById("info-name");
    const infoText=document.getElementById("info-text");
    const infoClose=document.getElementById("info-close");

    let isDragging=false;
    let lastMouseX=0;

    if(infoClose){
        infoClose.addEventListener("click",()=>{
            infoPanel.style.display="none";
            selectedPlanet=null;
            cameraTarget=null;
        });
    }

    function showPlanetInfo(planet){
        if(!infoPanel||!infoName||!infoText) return;
        infoName.textContent=planet.name;
        infoText.innerHTML=`
            <p><strong>Radius:</strong> ${planet.info.realRadius}</p>
            <p><strong>Tilt:</strong> ${planet.info.tilt}</p>
            <p><strong>Rotation:</strong> ${planet.info.rotationPeriod}</p>
            <p><strong>Orbit:</strong> ${planet.info.orbitPeriod}</p>
            <p><strong>Distance:</strong> ${planet.info.distance}</p>
            <p><strong>Moons:</strong> ${planet.info.moons}</p>
            <p><strong>Info:</strong> ${planet.info.description}</p>
        `;
        infoPanel.style.display="block";
    }

    // Mouse drag
    canvas.addEventListener("mousedown",e=>{isDragging=true; lastMouseX=e.clientX;});
    canvas.addEventListener("mousemove",e=>{
        if(isDragging){cameraAngle+=(e.clientX-lastMouseX)*0.01; lastMouseX=e.clientX;}
    });
    canvas.addEventListener("mouseup",()=>{isDragging=false;});

    // Click planet
    canvas.addEventListener("click",e=>{
        if(isDragging) return;
        const rect=canvas.getBoundingClientRect();
        const mouseX=((e.clientX-rect.left)/canvas.clientWidth)*2-1;
        const mouseY=-(((e.clientY-rect.top)/canvas.clientHeight)*2-1);

        let closest=null; let minDist=Infinity;
        planetData.forEach(p=>{
            if(!p.center) return;
            const dx=mouseX-(p.center[0]/30);
            const dy=mouseY-(p.center[2]/30);
            const dist=Math.sqrt(dx*dx+dy*dy);
            if(dist<minDist && dist<0.15){ minDist=dist; closest=p;}
        });

        if(closest){
            selectedPlanet=closest.name;
            cameraTarget=closest.center;
            showPlanetInfo(closest);
        }
    });

    // Zoom
    canvas.addEventListener("wheel",e=>{
        e.preventDefault();
        const zoomFactor=e.deltaY>0?1.05:0.95;
        cameraDistance*=zoomFactor;
        cameraDistance=Math.max(5,Math.min(cameraDistance,60));
    },{passive:false});

    // UI controls
    const uiContainer=document.createElement("div");
    uiContainer.style.position="absolute";
    uiContainer.style.top="10px";
    uiContainer.style.left="10px";
    uiContainer.style.background="rgba(0,0,0,0.5)";
    uiContainer.style.padding="10px";
    uiContainer.style.borderRadius="8px";
    uiContainer.style.color="white";
    document.body.appendChild(uiContainer);

    const speedLabel=document.createElement("label");
    speedLabel.textContent="Animation Speed:";
    const speedSlider=document.createElement("input");
    speedSlider.type="range";
    speedSlider.min="0";
    speedSlider.max="5";
    speedSlider.step="0.1";
    speedSlider.value=animationSpeed;
    speedSlider.oninput=()=>{animationSpeed=parseFloat(speedSlider.value);};
    uiContainer.appendChild(speedLabel);
    uiContainer.appendChild(speedSlider);
    uiContainer.appendChild(document.createElement("br"));

    const shipToggle=document.createElement("button");
    shipToggle.textContent=showSpaceships?"Hide Spaceships":"Show Spaceships";
    shipToggle.onclick=()=>{
        showSpaceships=!showSpaceships;
        shipToggle.textContent=showSpaceships?"Hide Spaceships":"Show Spaceships";
    };
    uiContainer.appendChild(shipToggle);

});
