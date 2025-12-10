const TANK_MOVE_SPEED = 2.5;
const TANK_TURN_SPEED = 1.25;

const MAT_RED_WIRE = new Material(SP_WIREFRAME, {color: [1, 0, 0]});
const MAT_GREEN_WIRE = new Material(SP_WIREFRAME, {color: [0, 1, 0]});

let FREECAM_ENABLED = false;
let WIREFRAMES_ENABLED = false;
let FANCY_ENABLED = false;

let SCORE = 0;
let HIGH_SCORE = 0;
const ENEMY_POINTS = 1000;

const MAX_LIVES = 4;
let LIVES = MAX_LIVES;

let IS_GAME_OVER = false;
let GAME_OVER_TIMER = 0;

function addPoints() {
    SCORE += ENEMY_POINTS;
    document.getElementById("score").innerHTML = `${SCORE}`;

    if (SCORE > HIGH_SCORE) {
        HIGH_SCORE = SCORE;
        document.getElementById("highScore"). innerHTML = `${HIGH_SCORE}`;
        sessionStorage.setItem("highScore", HIGH_SCORE);
    }
}

function removeLife() {
    document.getElementById(`life${LIVES}`).hidden = true;
    LIVES--;

    if (LIVES <= 0) {
        IS_GAME_OVER = true;
        console.log("GAME OVER!");
    }
}

function toggleFancy() {
    FANCY_ENABLED = !FANCY_ENABLED;

    if (FANCY_ENABLED) {
        ENEMY_MAT.copy(ENEMY_MAT_FANCY);
        BULLET_MAT.copy(BULLET_MAT_FANCY);
        WALL_MAT_1.copy(WALL_MAT_1_FANCY);
        WALL_MAT_2.copy(WALL_MAT_2_FANCY);
        PLAYER.crosshair.material.data['color'] = [1, 1, 1, 0.5];
    } else {
        ENEMY_MAT.copy(ENEMY_MAT_DEFAULT);
        BULLET_MAT.copy(BULLET_MAT_DEFAULT);
        WALL_MAT_1.copy(WALL_MAT_1_DEFAULT);
        WALL_MAT_2.copy(WALL_MAT_2_DEFAULT);
        PLAYER.crosshair.material.data['color'] = [0, 1, 0, 0.5];
    }
}

let LAST_LOOP_START;
let DELTA_TIME;
function loop() {
    // Time regulation
    const loopStart = Date.now();
    DELTA_TIME = (loopStart - LAST_LOOP_START) / 1000;
    LAST_LOOP_START = loopStart;

    if (!IS_GAME_OVER) {
        // Game Logic
        cameraUpdate(MAIN_SCENE.camera);
        playerUpdate(PLAYER);

        for (const e of ENEMIES)
            enemyUpdate(e);

        enemySpawnerUpdate();
        minimapUpdate();
    } else if (GAME_OVER_TIMER < 6) {
        GAME_OVER_TIMER += DELTA_TIME;

        if (GAME_OVER_TIMER >= 2) {
            document.getElementById("myWebGLCanvas").hidden = true;
            document.getElementById("gameOverContainer").hidden = false;
        }

        if (GAME_OVER_TIMER >= 4) {
            document.getElementById("replayButton").hidden = false;
            document.exitPointerLock();
        }
    }

    // animations
    MAIN_SCENE.updateAnimations();

    // cleanup
    MAIN_SCENE.destroyQueuedObjects();

    // Audio
    attenuateSources(MAIN_SCENE.camera);

    // Rendering
    renderScene();
    // updateDebugDisplay();

    // Loop
    requestAnimationFrame(loop);
}

function renderScene() {
    clearScreen();
    resetShader();


    let transparents = [];
    for (let o of MAIN_SCENE.objects) {
        if (o.model === null || o.hidden) continue;

        if (o.tag === "mountain" && FANCY_ENABLED) continue;
        if (o.tag === "decoration" && !FANCY_ENABLED) continue;

        if (o.material.shader.transparent) {
            // Calculate depth from camera

            let offset = glMatrix.vec3.transformMat4([0, 0, 0],
                o.transform.GetWorldPosition(),
                MAIN_SCENE.camera.transform.WorldToLocalMatrix()
            );

            let distance = glMatrix.vec3.length(offset);

            transparents.push({
                object: o,
                distance: distance
            });
        } else {
            loadMaterial(o.material, MAIN_SCENE);
            renderObject(o);
        }
    }

    // Render skybox now
    if (FANCY_ENABLED) {
        loadMaterial(MAIN_SCENE.skybox.material, MAIN_SCENE);
        renderObject(MAIN_SCENE.skybox);
    }

    // Render transparent models afterwards
    transparents.sort((a, b) => b.distance - a.distance);
    for (let bundle of transparents) {
        loadMaterial(bundle.object.material, MAIN_SCENE);
        renderObject(bundle.object);
    }

    // Render wireframes for debug
    if (WIREFRAMES_ENABLED) {
        loadMaterial(MAT_RED_WIRE, MAIN_SCENE);
        for (let c of MAIN_SCENE.colliders) {
            renderBox(c);
        }

        loadMaterial(MAT_GREEN_WIRE, MAIN_SCENE);
        renderCircle(PLAYER.movementCollider);

        for (const enemy of ENEMIES)
            renderCircle(enemy.movementCollider);

        if (PLAYER.bullet !== null)
            renderBox(PLAYER.bullet.hurtbox);
    }

    // Render UI
    if (!FREECAM_ENABLED) {
        for (let o of MAIN_SCENE.uiObjects) {
            if (o.hidden) continue;

            if (IS_PLAYER_DEAD && o.tag === "hud")
                continue; // don't render hud while player's dead

            loadMaterial(o.material, MAIN_SCENE);
            renderObject(o);
        }
    }
}

function updateDebugDisplay() {
    const camera = MAIN_SCENE.camera;
    document.getElementById("cameraFOV").value = camera.fovy * 180 / Math.PI;

    const worldPos = camera.transform.GetWorldPosition();

    document.getElementById("cameraX").value = worldPos[0];
    document.getElementById("cameraY").value = worldPos[1];
    document.getElementById("cameraZ").value = worldPos[2];
}

// Builds the various shaders
function setupShaders() {
    SP_BLINN_PHONG.init();
    SP_TEXTURED.init();
    // SP_TEXTURED_TRANSPARENT.init();
    SP_SKYBOX.init();
    SP_FANCY.init();
    SP_WIREFRAME.init();
    SP_BILLBOARD.init();
    SP_UI_SPRITE.init();
    SP_UV_TEST.init();
    SP_UI_MINIMAP.init();
}

function setup() {
    let canvas = document.getElementById("myWebGLCanvas");
    setupWebGL(canvas); // set up the webGL environment
    setupInput(canvas);
    setupShaders(); // setup the webGL shaders

    let assetPromise = new Promise((resolve, reject) => {
        let numAssetsLoaded = 0;
        const totalAssets = 18;

        const loadCallback = function() {
            numAssetsLoaded++;
            document.getElementById("loadingBarInner").style.width = `${Math.floor(100 * numAssetsLoaded / totalAssets)}%`;

            if (numAssetsLoaded >= totalAssets) {
                setTimeout(resolve, 500);
            }
        }

        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/minimap_sweeper.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/minimap.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/crosshair.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/crosshair_used.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/orginal_assets/green_square.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/orginal_assets/mountains.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/panzer_III_color_palette.png", loadCallback);
        //
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/dirt_floor_diff_4k.png", loadCallback, {'wrap': true});
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/dirt_floor_disp_4k.png", loadCallback, {'wrap': true});
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/dirt_floor_nor_gl_4k.png", loadCallback, {'wrap': true});
        //
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_color.png", loadCallback, {'wrap': true});
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_normal.png", loadCallback, {'wrap': true});
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_ao.png", loadCallback, {'wrap': true});
        //
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/animations/explosion_small.png", loadCallback, {'mag_filter': "point"});
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/animations/explosion_large.png", loadCallback, {'mag_filter': "point"});
        //
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/decoration/bush1.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/decoration/bush2.png", loadCallback);
        loadTexture("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/decoration/bush3.png", loadCallback);
    });

    assetPromise.then(() => {
        console.log("Assets loaded!");
        document.getElementById("loadingScreen").hidden = true;
        document.getElementById("startButton").hidden = false;
    });
}

function runGame() {
    document.activeElement.blur(); // get rid of the focus so we don't press the button multiple times
    document.getElementById("startButton").disabled = true;
    document.getElementById("startButton").hidden = true;
    setupScene();
    // updateDebugDisplay();

    HIGH_SCORE = Number(sessionStorage.getItem("highScore"));
    if (HIGH_SCORE === null) {
        HIGH_SCORE = 10000;
        sessionStorage.setItem("highScore", HIGH_SCORE);
    }

    if (HIGH_SCORE === 0) document.getElementById("highScore").innerHTML = "0000";
    else document.getElementById("highScore").innerHTML = HIGH_SCORE;

    resetGame();

    document.getElementById("gameContainer").hidden = false;
    LAST_LOOP_START = Date.now()
    loop();

}

function resetGame() {
    // Game logic setup
    LIVES = MAX_LIVES;
    IS_GAME_OVER = false;
    GAME_OVER_TIMER = 0;
    document.getElementById("score").innerHTML = "0000";
    SCORE = 0;

    // Player setup
    PLAYER.transform.setLocalPosition([0, 1, 0]);
    PLAYER.transform.setLocalRotation(glMatrix.mat4.create());
    PLAYER.bullet = null;

    IS_PLAYER_DEAD = false;
    playerRespawnTimer = 0;

    minimapSweepAngle = 0;
    MINIMAP_SWEEPER.transform.setLocalRotationEuler([0, 0, 0]);
    MINIMAP_ROTATER.setLocalRotationEuler([0, 0, 0]);

    // Enemy setup
    // Clear any existing enemies
    for (let enemy of ENEMIES) {
        enemy.audioSources.bullet_shoot.unregister();
        enemy.audioSources.radar_bleep.unregister();

        if (enemy.bullet !== null) {
            MAIN_SCENE.removeObject(enemy.bullet);
            enemy.bullet = null;
        }

        MAIN_SCENE.removeObject(enemy);
    }
    ENEMIES = [];

    // Final steps
    clearScreen();
    document.getElementById("gameOverContainer").hidden = true;
    document.getElementById("replayButton").hidden = true;

    for (let icon of document.getElementById("lives").children) {
        icon.hidden = false;
    }

    let canvas = document.getElementById("myWebGLCanvas");
    canvas.requestPointerLock();
    canvas.hidden = false;
}