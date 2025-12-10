function collisionCheck(collider) {
    for (const c of MAIN_SCENE.colliders) {
        if (circleAgainstBoxCollision(collider, c)) {
            return true;
        }
    }

    return false;
}

const CAMERA_MOVE_SPEED = 3;
const CAMERA_TURN_SPEED = 1;

function cameraUpdate(camera) {
    if (FREECAM_ENABLED) {

        let movement = glMatrix.vec3.fromValues(
            AXIS_INPUTS.camera_xAxis * DELTA_TIME * CAMERA_MOVE_SPEED,
            AXIS_INPUTS.camera_yAxis * DELTA_TIME * CAMERA_MOVE_SPEED,
            AXIS_INPUTS.camera_zAxis * DELTA_TIME * CAMERA_MOVE_SPEED
        );
        MAIN_SCENE.camera.transform.translateRelative(movement);

        let rotationDelta = glMatrix.vec3.fromValues(
            DELTA_TIME * CAMERA_TURN_SPEED * MOUSE_DELTA_Y / 10,
            DELTA_TIME * CAMERA_TURN_SPEED * MOUSE_DELTA_X / 10,
            0,
        );
        clearMouseDelta()
        MAIN_SCENE.camera.transform.rotateEuler(rotationDelta);
    }
}

/*
PLAYER UPDATES
 */

let IS_PLAYER_DEAD = false;

function createBullet(shooter) {
    let spawnLoc = glMatrix.vec3.transformMat4([0, 0, 0], [0, 0.75, 1], shooter.transform.LocalToWorldMatrix());
    const bullet = new SceneObject(
        new Transform(spawnLoc, [0, 0, 0], [0.1, 0.1, 0.1]),
        BULLET_MODEL,
        BULLET_MAT
    );

    bullet.transform.localRotationMatrix = shooter.transform.GetWorldRotation();

    bullet.hurtbox = new BoxCollider(2, 11);
    bullet.hurtbox.transform = bullet.transform;

    MAIN_SCENE.addObject(bullet);

    return bullet;
}

const BULLET_SPEED = 5; // meters per second

const COLLISION_SOUND_COOLDOWN = 3;
let playerCollisionCooldown = COLLISION_SOUND_COOLDOWN;

const PLAYER_RESPAWN_COOLDOWN = 5;
let playerRespawnTimer = PLAYER_RESPAWN_COOLDOWN;
function playerUpdate(player) {
    if (FREECAM_ENABLED) return;

    if (playerCollisionCooldown > 0)
        playerCollisionCooldown -= DELTA_TIME;

    if (IS_PLAYER_DEAD) {
        playerRespawnTimer -= DELTA_TIME;

        if (playerRespawnTimer < 4 && playerRespawnTimer > 1) {
            document.getElementById("respawnText").hidden = false;
            document.getElementById("respawnCountdown").hidden = false;
            document.getElementById("respawnFinal").hidden = true;

            document.getElementById("respawnCountdownNumber").innerHTML = Math.floor(playerRespawnTimer);
        } else if (playerRespawnTimer > 0) {
            document.getElementById("respawnCountdown").hidden = true;
            document.getElementById("respawnFinal").hidden = false;
        } else {
            document.getElementById("respawnText").hidden = true;
            document.getElementById("respawnCountdown").hidden = false;
            document.getElementById("respawnFinal").hidden = true;
            IS_PLAYER_DEAD = false;
        }

        PLAYER.audioSources.treads.pause();
    } else {

        // Bullet firing
        if (SHOULD_SHOOT) {
            SHOULD_SHOOT = false;
            if (player.bullet === null) {
                player.bullet = createBullet(player);
                player.audioSources.bullet_shoot.play();
            }
        }

        if (player.bullet === null) {
            player.crosshair.material.data['texture'] = "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/crosshair.png";
        } else {
            player.crosshair.material.data['texture'] = "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/crosshair_used.png";
        }

        // Save old transform data
        let oldTransform = Transform.clone(player.transform);

        // Attempt to move
        let movement = glMatrix.vec3.fromValues(
            0,
            0,
            AXIS_INPUTS.game_driveAxis * DELTA_TIME * TANK_MOVE_SPEED
        );
        player.transform.translateRelative(movement);

        let didMove = false;
        if (collisionCheck(player.movementCollider)) {
            player.transform.copy(oldTransform);

            // Collision noise
            if (playerCollisionCooldown <= 0 && AXIS_INPUTS.game_driveAxis !== 0) {
                player.audioSources.wall_collision.play();
                playerCollisionCooldown = COLLISION_SOUND_COOLDOWN;
            }
        } else if (AXIS_INPUTS.game_driveAxis !== 0) {
            didMove = true;
            playerCollisionCooldown = 0;
        }
        didMove |= AXIS_INPUTS.game_turnAxis !== 0;

        player.transform.rotateAroundAxis(
            [0, 1, 0], AXIS_INPUTS.game_turnAxis * DELTA_TIME * TANK_TURN_SPEED
        );

        if (didMove && player.audioSources.treads.isPaused()) {
            player.audioSources.treads.reset();
            player.audioSources.treads.play();
        } else if (!didMove && !player.audioSources.treads.isPaused())
            player.audioSources.treads.pause();

        // move the minimap too
        MINIMAP_ROTATER.rotateAroundAxis(
            [0, 0, 1], AXIS_INPUTS.game_turnAxis * DELTA_TIME * TANK_TURN_SPEED
        )
        const playerWorldPos = player.transform.GetWorldPosition();
        MINIMAP_POSITIONER.setLocalPosition([-playerWorldPos[0], -playerWorldPos[2], 0]);

        //
        // BULLET CODE //
        //

        if (player.bullet !== null) {
            let forward = player.bullet.transform.GetWorldForward();
            glMatrix.vec3.scale(forward, forward, DELTA_TIME * BULLET_SPEED)
            player.bullet.transform.translate(forward);

            let surface = null;
            for (const c of MAIN_SCENE.colliders) {
                if (c === player.collider) continue;

                if (checkForCollision(player.bullet.hurtbox, c)) {
                    surface = c;
                    break;
                }
            }

            if (surface !== null) {
                console.log("Bullet hit! Surface tag: " + surface.object.tag);
                if (surface.object.tag === "enemy") { // the IDE is wrong. it does work
                    const explosionSFX = new AudioSource(
                        "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/tank_blowup.wav",
                        1,
                        surface.object.transform
                    ).setOneShot();
                    explosionSFX.play();

                    let explosionEffectPos = surface.object.transform.GetWorldPosition();
                    explosionEffectPos[1] = 3;

                    addPoints();

                    const explosionEffect = new SceneObject(
                        new Transform(explosionEffectPos, [0, 0, 0], [3, 3, 1]),
                        COMMON_MODEL_QUAD,
                        new Material(
                            SP_BILLBOARD,
                            {
                                texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/animations/explosion_large.png"
                            }
                        )
                    );
                    explosionEffect.animation = new Animation(explosionEffect.material, 12, 12);
                    explosionEffect.animation.onComplete = () => {MAIN_SCENE.queueForDestruction(explosionEffect)};
                    explosionEffect.animation.play();
                    MAIN_SCENE.addObject(explosionEffect);

                    destroyEnemy(surface.object);


                } else {
                    const explosionSFX = new AudioSource(
                        "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/bullet_shoot_wall.wav",
                        1,
                        player.bullet.transform
                    ).setOneShot();
                    explosionSFX.play();
                }

                MAIN_SCENE.removeObject(player.bullet);
                player.bullet = null;

            }
        }
    }
}

function killPlayer() {
    if (IS_PLAYER_DEAD) return; // don't double trigger

    const explosionSFX = new AudioSource(
        "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/tank_blowup.wav",
        1,
        PLAYER.transform
    ).setOneShot();
    explosionSFX.play();

    console.log("PLAYER IS DEAD!");
    IS_PLAYER_DEAD = true;
    enemySafetyTimer = ENEMY_SAFETY_COOLDOWN;
    playerRespawnTimer = PLAYER_RESPAWN_COOLDOWN;
    PLAYER.audioSources.treads.pause();

    if (PLAYER.bullet !== null) {
        MAIN_SCENE.removeObject(PLAYER.bullet);
        PLAYER.bullet = null;
    }

    PLAYER.explosion.hidden = false;
    PLAYER.explosion.animation.play();

    // Update the almighty game logic
    removeLife();
}

let minimapSweepAngle = 0;
const MINIMAP_SWEEP_THRESHOLD = 10;
const MINIMAP_SWEEP_SPEED = 0.2;
const MINIMAP_SWEEP_DISTANCE = 29;

const BLIP_TIME = 3;
class Blip {
    constructor(worldPos) {
        this.object = new SceneObject(
            new Transform([worldPos[0], worldPos[2], 0], [0, 0, 0], [1, 1, 1]),
            COMMON_MODEL_QUAD,
            new Material(
                SP_UI_MINIMAP,
                {
                    color: [1, 0, 0, 1],
                    minimapTransform: MINIMAP_CONTAINER
                }
            ),
            null,
            "hud"
        );

        this.object.transform.parent = MINIMAP_POSITIONER;

        this.timer = BLIP_TIME;
    }
}

let blips = [];
let lastChecked = new Set();

function minimapUpdate() {
    if (IS_PLAYER_DEAD) {

        // clear any blips if we have them
        if (blips.length > 0) {
            for (const b of blips)
                MAIN_SCENE.removeUIObject(b.object);
            blips = [];
            lastChecked = new Set();
        }

        return;
    }

    // Decrease current blips

    let toDelete = [];
    for (const b of blips) {
        b.timer -= DELTA_TIME;
        if (b.timer <= 0) toDelete.push(b);
        else b.object.material.data.color[3] = b.timer / BLIP_TIME;
    }

    for (const b of toDelete) {
        MAIN_SCENE.removeUIObject(b.object);
        blips.splice(blips.indexOf(b), 1);
    }

    // Add new blips
    minimapSweepAngle += MINIMAP_SWEEP_SPEED * 360 * DELTA_TIME;
    for (; minimapSweepAngle > 360; minimapSweepAngle -= 360) ; // funny for-loop :)

    MINIMAP_SWEEPER.transform.setLocalRotationEuler([0, 0, minimapSweepAngle - 90]);

    for (const enemy of ENEMIES) {
        const relPos = glMatrix.vec3.transformMat4(glMatrix.vec3.create(),
            enemy.transform.GetWorldPosition(),
            PLAYER.transform.WorldToLocalMatrix()
        );

        if (glMatrix.vec3.length(relPos) > MINIMAP_SWEEP_DISTANCE) continue;

        const relAngle = Math.atan2(relPos[2], relPos[0]) * 180 / Math.PI;
        let diff = minimapSweepAngle - relAngle;
        if (diff > 180) diff = diff - 360;
        if (diff < -180) diff = diff + 360;


        if (diff > 0 && diff < MINIMAP_SWEEP_THRESHOLD) {
            if (!lastChecked.has(enemy)) {
                lastChecked.add(enemy);
                console.log("BLIP!");

                enemy.audioSources.radar_bleep.play();

                const blip = new Blip(enemy.transform.GetWorldPosition());
                MAIN_SCENE.addUIObject(blip.object);

                blips.push(blip);
            }
        } else if (lastChecked.has(enemy)) {
            lastChecked.delete(enemy);
        }
    }
}

/*
ENEMY UPDATES
 */

const ENEMY_STATE = Object.freeze({
    WAIT: 0,
    WANDER: 1,
    SHOOT: 2
});

/*
ENEMY SPAWNING
 */

const ENEMY_SPAWN_RADIUS_MIN = 15;
const ENEMY_SPAWN_RADIUS_MAX = 80;

const ENEMY_SPAWN_ANGLE_TOLERANCE = Math.PI / 8;

const ARENA_BOUNDS = 28;
function createEnemy() {
    // Get player look dir
    const playerLook = PLAYER.transform.GetWorldForward();
    const playerLookAngle = Math.atan2(playerLook[2], playerLook[0]);
    const playerPos = PLAYER.transform.GetWorldPosition();

    let enemy;
    let skip;
    let attempts = 0;
    do {
        if (++attempts > 10)
            return false;

        skip = false;
        const spawnDist = ENEMY_SPAWN_RADIUS_MIN + Math.random() * (ENEMY_SPAWN_RADIUS_MAX - ENEMY_SPAWN_RADIUS_MIN);
        const spawnAngle = Math.random() * Math.PI * 2;

        let diff = spawnAngle - playerLookAngle;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) < MAIN_SCENE.camera.fovy / 2 + ENEMY_SPAWN_ANGLE_TOLERANCE) {
            skip = true;
            continue; // Don't spawn within player's FOV
        }

        const spawnX = playerPos[0] + spawnDist * Math.cos(spawnAngle);
        const spawnZ = playerPos[2] + spawnDist * Math.sin(spawnAngle);

        if (Math.abs(spawnX) >= ARENA_BOUNDS || Math.abs(spawnZ) >= ARENA_BOUNDS) {
            skip = true;
            continue; // don't let them spawn outside the arena
        }


        enemy = new SceneObject(
            new Transform([spawnX, 1, spawnZ]),
            TANK_MODEL,
            ENEMY_MAT,
            new BoxCollider(3, 4.5)
        );

        enemy.movementCollider = new CircleCollider(3);
        enemy.movementCollider.transform = enemy.transform;
    } while (skip || collisionCheck(enemy.movementCollider));

    enemy.bullet = null;

    enemy.audioSources = {
        bullet_shoot: new AudioSource(
            "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/bullet_shoot.wav",
            1,
            enemy.transform
        ),
        radar_bleep: new AudioSource(
            "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/radar_bleep.mp3",
            1,
            null
        ),
    }


    enemy.data = {
        currentState: ENEMY_STATE.WAIT,
        wanderTarget: [0, 0, 0],
        waitTimer: 0
    };

    toggleWait(enemy);

    enemy.tag = "enemy";

    ENEMIES.push(enemy);
    MAIN_SCENE.addObject(enemy);

    return true;
}

const MAX_ENEMIES_EASY = 3;
const MAX_ENEMIES_MEDIUM = 6;
const MAX_ENEMIES_HARD = 10;
let MAX_ENEMIES = MAX_ENEMIES_EASY;

const ENEMY_SPAWN_COOLDOWN_EASY = 12;
const ENEMY_SPAWN_COOLDOWN_MEDIUM = 8;
const ENEMY_SPAWN_COOLDOWN_HARD = 5;
let ENEMY_SPAWN_COOLDOWN = ENEMY_SPAWN_COOLDOWN_EASY;
let enemySpawnTimer = 10;

const ENEMY_SAFETY_COOLDOWN = 10;
let enemySafetyTimer = ENEMY_SAFETY_COOLDOWN;
function enemySpawnerUpdate() {
    if (enemySafetyTimer > 0 && !IS_PLAYER_DEAD) {
        enemySafetyTimer -= DELTA_TIME;
    }

    // difficulty scaling
    if (MAX_ENEMIES === MAX_ENEMIES_EASY && SCORE >= 3000) {
        PLAYER.audioSources.level_up.play();
        currentLevelUpFlash = 0;
        levelUpAnimation();
        console.log("Difficulty: MEDIUM");

        MAX_ENEMIES = MAX_ENEMIES_MEDIUM;
        ENEMY_SPAWN_COOLDOWN = ENEMY_SPAWN_COOLDOWN_MEDIUM;
        ENEMY_MOVE_SPEED = ENEMY_MOVE_SPEED_MEDIUM;
        ENEMY_ROTATE_SPEED = ENEMY_ROTATE_SPEED_MEDIUM;
    } else if (MAX_ENEMIES === MAX_ENEMIES_MEDIUM && SCORE >= 15000) {
        PLAYER.audioSources.level_up.play();
        currentLevelUpFlash = 0;
        levelUpAnimation();
        console.log("Difficulty: HARD");

        MAX_ENEMIES = MAX_ENEMIES_HARD;
        ENEMY_SPAWN_COOLDOWN = ENEMY_SPAWN_COOLDOWN_HARD;
        ENEMY_MOVE_SPEED = ENEMY_MOVE_SPEED_HARD;
        ENEMY_ROTATE_SPEED = ENEMY_ROTATE_SPEED_HARD;
    }

    if (ENEMIES.length >= MAX_ENEMIES) {
        enemySpawnTimer = ENEMY_SPAWN_COOLDOWN;
        return;
    }

    enemySpawnTimer -= DELTA_TIME;
    if (enemySpawnTimer > 0)
        return;

    if (createEnemy())
        enemySpawnTimer = ENEMY_SPAWN_COOLDOWN;
}


const LEVEL_UP_FLASH_DELAY = 150;
const LEVEL_UP_FLASH_COUNT = 12;
let currentLevelUpFlash = 0;
function levelUpAnimation() {
    document.getElementById("score").hidden = (currentLevelUpFlash % 2) === 0;
    currentLevelUpFlash++;

    if (currentLevelUpFlash < LEVEL_UP_FLASH_COUNT)
        setTimeout(levelUpAnimation, LEVEL_UP_FLASH_DELAY)
}


/*
ENEMY LOGIC
 */

const MAX_WAIT_TIME = 3;
const MIN_WAIT_TIME = 0.2;


const ENEMY_MOVE_SPEED_EASY = 1;
const ENEMY_MOVE_SPEED_MEDIUM = 1.5;
const ENEMY_MOVE_SPEED_HARD = 2.5;

const ENEMY_ROTATE_SPEED_EASY = Math.PI * 20 / 180;
const ENEMY_ROTATE_SPEED_MEDIUM = Math.PI * 30 / 180;
const ENEMY_ROTATE_SPEED_HARD = Math.PI * 45 / 180;

let ENEMY_ROTATE_SPEED = ENEMY_ROTATE_SPEED_EASY; // radians per second
let ENEMY_MOVE_SPEED = ENEMY_MOVE_SPEED_EASY; // meters per second



const ROTATE_THRESHOLD = Math.PI * 2 / 180; // radians
const MOVE_THRESHOLD = 0.1; // meters

const ENEMY_SHOOT_CHANCE = 0.5;

const WANDER_MAX_DISTANCE = 15; // meters
const WANDER_MIN_DISTANCE = 5; // meters

function toggleWait(enemy) {
    enemy.data.currentState = ENEMY_STATE.WAIT;
    enemy.data.waitTimer = MIN_WAIT_TIME + Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME);
}

function toggleShoot(enemy) {
    enemy.data.currentState = ENEMY_STATE.SHOOT;
}

function toggleWander(enemy) {
    enemy.data.currentState = ENEMY_STATE.WANDER;
    let isPathClear = true
    let attempts = 0;
    do {
        attempts++;

        const dist = WANDER_MIN_DISTANCE + Math.random() * (WANDER_MAX_DISTANCE - WANDER_MIN_DISTANCE);

        let alpha = Math.pow(2 * Math.random() - 1, 3); // choose a number biased towards 0
        const angle = alpha * Math.PI; // use alpha to generate target angle

        let offset = glMatrix.vec3.sub(glMatrix.vec3.create(),
            PLAYER.transform.GetWorldPosition(),
            enemy.transform.GetWorldPosition()
        );
        offset[1] = 0;
        glMatrix.vec3.normalize(offset, offset);
        glMatrix.vec3.scale(offset, offset, dist);
        glMatrix.vec3.transformMat4(offset,
            offset,
            glMatrix.mat4.fromYRotation(
                glMatrix.mat4.create(),
                angle
            )
        );

        glMatrix.vec3.add(enemy.data.wanderTarget, offset, enemy.transform.GetWorldPosition());

        // check for collisions along the path
        isPathClear = true;

        let rayStart = enemy.transform.GetWorldPosition();
        for (const collider of MAIN_SCENE.colliders) {
            if (collider === enemy.collider) continue; // ignore own collider

            if (boxAgainstRayCollision(collider, rayStart, offset) < dist) {
                isPathClear = false;
                break;
            }
        }
    } while (!isPathClear && attempts < 10);

    if (!isPathClear) {
        console.log("failed to find path");
        toggleWait(enemy);
    }

}

function enemyUpdate(enemy) {

    let targetOffset;
    let targetDir;
    let dotToTarget;
    switch (enemy.data.currentState) {
        case ENEMY_STATE.WAIT:
            enemy.data.waitTimer -= DELTA_TIME;
            if (enemy.data.waitTimer <= 0) {
                // Wait is up, pick next task

                // Raycast against scene to see if we have a clear line to the player
                let rayStart = enemy.transform.GetWorldPosition();
                let rayDir = glMatrix.vec3.sub(glMatrix.vec3.create(),
                    PLAYER.transform.GetWorldPosition(),
                    rayStart);

                let distToHit = Infinity;
                for (const collider of MAIN_SCENE.colliders) {
                    if (collider === PLAYER.collider || collider === enemy.collider) continue; // ignore player collider, we don't mind hitting that

                    distToHit = Math.min(distToHit,
                        boxAgainstRayCollision(collider, rayStart, rayDir));
                }

                if (enemySafetyTimer <= 0 && enemy.bullet === null && distToHit > glMatrix.vec3.length(rayDir)) {
                    // Shooting is possible. What should we do?

                    if (Math.random() < ENEMY_SHOOT_CHANCE)
                        toggleShoot(enemy);
                    else toggleWander(enemy);

                } else toggleWander(enemy);
            }
            break;

        case ENEMY_STATE.WANDER:
            targetOffset = glMatrix.vec3.sub(glMatrix.vec3.create(),
                enemy.data.wanderTarget,
                enemy.transform.GetWorldPosition()
            );

            if (targetOffset[0] === 0 && targetOffset[2] === 0) {
                // Reached target, trying to calculate angles will break things
                toggleWait(enemy);
                break;
            }

            targetDir = glMatrix.vec3.normalize(glMatrix.vec3.create(), targetOffset);

            dotToTarget = glMatrix.vec3.dot(targetDir, enemy.transform.GetWorldForward());
            if (dotToTarget < Math.cos(ROTATE_THRESHOLD)) {
                // Not facing target, rotate towards it
                let angleDelta = ENEMY_ROTATE_SPEED * DELTA_TIME;

                const perpOffset = [targetDir[2], 0, -targetDir[0]];
                const perpTest = glMatrix.vec3.dot(perpOffset, enemy.transform.GetWorldForward());
                if (perpTest > 0) angleDelta = -angleDelta;

                enemy.transform.rotateAroundAxis([0, 1, 0], angleDelta);

            } else if (glMatrix.vec3.squaredLength(targetOffset) > MOVE_THRESHOLD * MOVE_THRESHOLD) {
                // Facing target, move towards it
                let oldTransform = Transform.clone(enemy.transform);

                enemy.transform.translateRelative([0, 0, ENEMY_MOVE_SPEED * DELTA_TIME]);

                // check for collision
                if (collisionCheck(enemy.movementCollider)) {
                    enemy.transform.copy(oldTransform);
                    toggleWait(enemy);
                }
            } else {
                // Reached target, now wait
                toggleWait(enemy);
            }
            break;

        case ENEMY_STATE.SHOOT:
            targetOffset = glMatrix.vec3.sub(glMatrix.vec3.create(),
                PLAYER.transform.GetWorldPosition(),
                enemy.transform.GetWorldPosition()
            );
            targetOffset[1] = 0;

            if (targetOffset[0] === 0 && targetOffset[2] === 0) {
                // Reached target, trying to calculate angles will break things
                toggleWait(enemy);
                break;
            }

            targetDir = glMatrix.vec3.normalize(glMatrix.vec3.create(), targetOffset);

            dotToTarget = glMatrix.vec3.dot(targetDir, enemy.transform.GetWorldForward());
            if (dotToTarget < Math.cos(ROTATE_THRESHOLD)) {
                // Not facing target, rotate towards it
                let angleDelta = ENEMY_ROTATE_SPEED * DELTA_TIME;

                const perpOffset = [targetDir[2], 0, -targetDir[0]];
                const perpTest = glMatrix.vec3.dot(perpOffset, enemy.transform.GetWorldForward());
                if (perpTest > 0) angleDelta = -angleDelta;

                enemy.transform.rotateAroundAxis([0, 1, 0], angleDelta);

            } else {
                if (IS_PLAYER_DEAD) {
                    // Player already dead, don't shoot
                    toggleWait(enemy);
                } else {
                    // Shoot gun
                    console.log("FIRE!!");
                    enemy.bullet = createBullet(enemy);
                    enemy.audioSources.bullet_shoot.play();
                    toggleWait(enemy);
                }
            }
            break;
    }

    if (enemy.bullet !== null) {
        // Bullet logic
        let forward = enemy.bullet.transform.GetWorldForward();
        if (MAX_ENEMIES === MAX_ENEMIES_HARD) {
            // Extra speed on HARD difficulty
            glMatrix.vec3.scale(forward, forward, DELTA_TIME * BULLET_SPEED * 1.5);
        }
        else glMatrix.vec3.scale(forward, forward, DELTA_TIME * BULLET_SPEED);
        enemy.bullet.transform.translate(forward);

        let surface = null;
        for (const c of MAIN_SCENE.colliders) {
            if (c === enemy.collider) continue;

            if (checkForCollision(enemy.bullet.hurtbox, c)) {
                surface = c;
                break;
            }
        }

        if (surface !== null) {
            console.log("Bullet hit! Surface tag: " + surface.object.tag);
            if (surface.object.tag === "player") { // the IDE is wrong. it does work
                killPlayer();
            } else {
                const explosionSFX = new AudioSource(
                    "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/bullet_shoot_wall.wav",
                    1,
                    enemy.bullet.transform
                ).setOneShot();
                explosionSFX.play();
            }

            MAIN_SCENE.removeObject(enemy.bullet);
            enemy.bullet = null;

        }
    }
}

function destroyEnemy(enemy) {
    enemy.audioSources.bullet_shoot.unregister();
    enemy.audioSources.radar_bleep.unregister();

    if (enemy.bullet !== null) {
        MAIN_SCENE.removeObject(enemy.bullet);
        enemy.bullet = null;
    }

    MAIN_SCENE.removeObject(enemy);
    console.log("Enemy Destroyed!");

    let enemyIdx = ENEMIES.indexOf(enemy);
    if (enemyIdx >= 0) ENEMIES.splice(enemyIdx, 1);
}