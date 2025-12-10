let AXIS_INPUTS = {
    // Freecam controls
    camera_xAxis: 0,
    camera_yAxis: 0,
    camera_zAxis: 0,
    // Game controls
    game_driveAxis: 0,
    game_turnAxis: 0,

};

let SHOULD_SHOOT = false;

let AXIS_BINDINGS = {
    "camera_xAxis": ["d", "a"],
    "camera_yAxis": ["e", "q"],
    "camera_zAxis": ["w", "s"],
    "game_driveAxis": ["ArrowUp", "ArrowDown"],
    "game_turnAxis": ["ArrowRight", "ArrowLeft"],
}

let KEY_VALUES = {}

// Input readers
onkeydown = function(e) {
    e = e || window.event;

    if (e.repeat)
        return;

    if (e.key === "f") {
        FREECAM_ENABLED = !FREECAM_ENABLED;
        document.getElementById("freecamNotif").hidden = !FREECAM_ENABLED;
        clearMouseDelta();

        if (FREECAM_ENABLED) {
            const worldPos = MAIN_SCENE.camera.transform.GetWorldPosition();
            const worldRot = MAIN_SCENE.camera.transform.GetWorldRotation();
            MAIN_SCENE.camera.transform.parent = null;
            MAIN_SCENE.camera.transform.setLocalPosition(worldPos);
            MAIN_SCENE.camera.transform.setLocalRotation(worldRot);
            // updateDebugDisplay();
        } else {
            MAIN_SCENE.camera.transform.parent = PLAYER.transform
            MAIN_SCENE.camera.transform.setLocalPosition([0, 1, 0]);
            MAIN_SCENE.camera.transform.setLocalRotationEuler([0, 0, 0]);
            // updateDebugDisplay();
        }
    }

    if (e.key === "g") {
        WIREFRAMES_ENABLED = !WIREFRAMES_ENABLED;
        document.getElementById("wireframeNotif").hidden = !WIREFRAMES_ENABLED;
    }

    if (e.key === " ") {
        SHOULD_SHOOT = true;
    }

    if (e.key === "!") {
        toggleFancy();
    }

    console.log(e.key);

    KEY_VALUES[e.key] = true;

    for (let axisName in AXIS_BINDINGS) {
        let binding = AXIS_BINDINGS[axisName];

        if (e.key === binding[0])
            AXIS_INPUTS[axisName] += 1;
        else if (e.key === binding[1])
            AXIS_INPUTS[axisName] -= 1;
    }
}

onkeyup = function(e) {
    e = e || window.event;

    if (e.repeat || KEY_VALUES[e.key] === undefined || !KEY_VALUES[e.key])
        return;

    KEY_VALUES[e.key] = false;

    for (let axisName in AXIS_BINDINGS) {
        let binding = AXIS_BINDINGS[axisName];

        if (e.key === binding[0])
            AXIS_INPUTS[axisName] -= 1;
        else if (e.key === binding[1])
            AXIS_INPUTS[axisName] += 1;
    }
};

let MOUSE_DELTA_X = 0;
let MOUSE_DELTA_Y = 0;

function clearMouseDelta() {
    MOUSE_DELTA_X = 0;
    MOUSE_DELTA_Y = 0;
}

onmousemove = function(e) {
    e = e || window.event;

    if (!POINTER_LOCK) return;

    MOUSE_DELTA_X += e.movementX;
    MOUSE_DELTA_Y += e.movementY;
};

let POINTER_LOCK = false;

function setupInput(canvas) {
    canvas.addEventListener("click", async () => {
       await canvas.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", function() {
        if (document.pointerLockElement === canvas) {
            console.log("Pointer locked");
            POINTER_LOCK = true;
        } else {
            console.log("Pointer unlocked");
            POINTER_LOCK = false;
        }
    });
}
