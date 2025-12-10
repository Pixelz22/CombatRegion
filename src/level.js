const WALL_MAT_1_DEFAULT = new Material(
    SP_TEXTURED,
    {
        ambient: [1, 1, 1],
        diffuse: [1, 1, 1],
        specular: [0, 0, 0],
        n: 15,
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/orginal_assets/green_square.png"
    }
);

const WALL_MAT_1_FANCY = new Material(
    SP_FANCY,
    {
        ambient: [1, 1, 1],
        diffuse: [1, 1, 1],
        specular: [0.1, 0.1, 0.1],
        n: 1,
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_color.png",
        normalTexture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_normal.png",
        aoTexture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_ao.png",
        scale: [0.5, 0.5],
    }
);

const WALL_MAT_1 = Material.clone(WALL_MAT_1_DEFAULT);

const WALL_MAT_2_DEFAULT = WALL_MAT_1_DEFAULT;

const WALL_MAT_2_FANCY = new Material(
    SP_FANCY,
    {
        ambient: [1, 0.85, 0.8],
        diffuse: [1, 0.85, 0.8],
        specular: [0.1, 0.1, 0.1],
        n: 1,
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_color.png",
        normalTexture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_normal.png",
        aoTexture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/wall_ao.png",
        scale: [0.5, 0.5],
    }
);

const WALL_MAT_2 = Material.clone(WALL_MAT_2_DEFAULT);

const BULLET_MAT_DEFAULT = new Material(
    SP_BLINN_PHONG,
    {
        ambient: [0.8, 0, 0],
        diffuse: [0.9, 0, 0],
        specular: [0, 0, 0],
        n: 15
    }
);

const BULLET_MAT_FANCY = new Material(
    SP_BLINN_PHONG,
    {
        ambient: [0.8, 0.6, 0],
        diffuse: [0.9, 0.7, 0],
        specular: [0, 0, 0],
        n: 15,
    }
);

const BULLET_MAT = Material.clone(BULLET_MAT_DEFAULT);

const ENEMY_MAT_DEFAULT = new Material(
    SP_BLINN_PHONG,
    {
        ambient: [0, 0.7, 0],
        diffuse: [0, 0.9, 0],
        specular: [0, 0, 0],
        n: 15
    }
);

const ENEMY_MAT_FANCY = new Material(
    SP_TEXTURED,
    {
        ambient: [1, 0, 0],
        diffuse: [2, 0, 0],
        specular: [1, 1, 1],
        n: 60,
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/panzer_III_color_palette.png"
    }
);

const ENEMY_MAT = Material.clone(ENEMY_MAT_DEFAULT);

const MOUNTAIN_MAT = new Material(
    SP_TEXTURED,
    {
        ambient: [1, 1, 1],
        diffuse: [1, 1, 1],
        specular: [0, 0, 0],
        n: 0,
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/orginal_assets/mountains.png"
    }
);

const DECORATION_MAT_1 = new Material(
    SP_BILLBOARD,
    {
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/decoration/bush1.png"
    }
);
const DECORATION_MAT_2 = new Material(
    SP_BILLBOARD,
    {
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/decoration/bush2.png"
    }
);
const DECORATION_MAT_3 = new Material(
    SP_BILLBOARD,
    {
        texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/decoration/bush3.png"
    }
);

const TANK_MODEL = Model.fromOBJ("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/panzer_III_low_poly.obj");
const BULLET_MODEL = Model.fromOBJ("https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/bullet.obj");

let PLAYER = null;
let MINIMAP_CONTAINER = null;
let MINIMAP_ROTATER = null;
let MINIMAP_POSITIONER = null;
let MINIMAP_SWEEPER = null;
const MINIMAP_SCALE = 0.04;
let MAP_WALL_MAT = null;

const PLANT_COUNT = 100;
const PLANT_GEN_SCALE = 1;
const PLANT_BOUNDS = 40;

let ENEMIES = [];

let MAIN_SCENE = new Scene(
    new Camera(
        [0, 1, 0],
        [0, 0, 0],
        60,
        0.1
    ),
    new Light(
        [-0.5, -1, -0.4],
        [0.3, 0.3, 0.3],
        [1, 1, 1],
        [1, 1, 1]
    ),
    [
        // BEGIN MOUNTAINS
        new SceneObject(
            new Transform(
                [0, 50, 100],
                [0, 0, 0],
                [100, 50, 1],
            ),
            COMMON_MODEL_QUAD,
            MOUNTAIN_MAT,
            null,
            "mountain"
        ),
        new SceneObject(
            new Transform(
                [0, 50, -100],
                [0, 0, 0],
                [100, 50, 1],
            ),
            COMMON_MODEL_QUAD,
            MOUNTAIN_MAT,
            null,
            "mountain"
        ),
        new SceneObject(
            new Transform(
                [100, 50, 0],
                [0, 90, 0],
                [100, 50, 1],
            ),
            COMMON_MODEL_QUAD,
            MOUNTAIN_MAT,
            null,
            "mountain"
        ),
        new SceneObject(
            new Transform(
                [-100, 50, 0],
                [0, 90, 0],
                [100, 50, 1],
            ),
            COMMON_MODEL_QUAD,
            MOUNTAIN_MAT,
            null,
            "mountain"
        ),
        // END MOUNTAINS
        // BEGIN OUTER WALLS
        new SceneObject(
            new Transform(
                [0, 0.5, 40.5],
                [0, 0, 0],
                [40.5, 0.5, 1],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_2,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [0, 1.5, -40],
                [0, 0, 0],
                [40.5, 1.5, 0.5],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_2,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [40, 1.5, 0],
                [0, 0, 0],
                [0.5, 1.5, 39.5],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_2,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [-40, 1.5, 0],
                [0, 0, 0],
                [0.5, 1.5, 39.5],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_2,
            new BoxCollider(2, 2),
            "wall"
        ),
        // END OUTER WALLS
        // BEGIN LEFT OBSTACLES
        new SceneObject(
            new Transform(
                [-20, 2, 16],
                [0, 0, 0],
                [2, 2, 9],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [-8, 1, 28],
                [0, 0, 0],
                [2, 1, 2],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [-25, 1, -8],
                [0, 60, 0],
                [3, 1, 1],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [-8, 1, -20],
                [0, 30, 0],
                [2, 1, 1],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [-25, 1.5, -25],
                [0, 45, 0],
                [4, 1.5, 1.5],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        // END LEFT OBSTACLES
        // BEGIN RIGHT OBSTACLES
        new SceneObject(
            new Transform(
                [8, 1, 15],
                [0, 0, 0],
                [6, 1, 1.5],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [15, 1, 0],
                [0, 0, 0],
                [1.5, 1, 6],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [20, 1.5, -23],
                [0, 45, 0],
                [4, 1.5, 4],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [5, 1, -30],
                [0, 0, 0],
                [2, 1, 2],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [29, 1, 5],
                [0, 15, 0],
                [3, 1, 2],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        new SceneObject(
            new Transform(
                [26, 2, 31],
                [0, 30, 0],
                [20, 2, 1.5],
            ),
            COMMON_MODEL_CUBE,
            WALL_MAT_1,
            new BoxCollider(2, 2),
            "wall"
        ),
        // END LEFT OBSTACLES
    ]
).addSkybox(
    new SceneObject(
        new Transform(),
        COMMON_MODEL_QUAD,
        new Material(
            SP_SKYBOX,
            {
                texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/dirt_floor_diff_4k.png",
                normalTexture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/dirt_floor_nor_gl_4k.png",
                aoTexture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/dirt_floor_disp_4k.png",
                scale: [0.25, 0.25],
            }
        )
    )
);

function setupScene() {
    // PLAYER SETUP //
    PLAYER = new SceneObject(
        new Transform([0, 1, 0]),
        null,
        null,
        new BoxCollider(2.5, 3.5),
        "player"
    );

    PLAYER.movementCollider = new CircleCollider(2.3);
    PLAYER.movementCollider.transform = PLAYER.transform;

    PLAYER.audioSources = {
        treads: new AudioSource(
            "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/tank_treads.mp3",
            0.5,
            null
        ).setLooping(0.5),
        bullet_shoot: new AudioSource(
            "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/bullet_shoot.wav",
            1,
            null
        ),
        wall_collision: new AudioSource(
            "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/tank_collision.wav",
            1,
            null
        ),
        level_up: new AudioSource(
            "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/sounds/level_up.wav",
            1,
            null
        )
    }

    PLAYER.bullet = null;

    MAIN_SCENE.addObject(PLAYER);
    MAIN_SCENE.camera.transform.parent = PLAYER.transform;

    // UI SETUP //

    PLAYER.crosshair = new SceneObject(
        new Transform([0, 0, 0], [0, 0, 0], [0.25, 0.25, 1]),
        COMMON_MODEL_QUAD,
        new Material(
            SP_UI_SPRITE,
            {
                color: [0, 1, 0, 0.5],
                texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/crosshair.png"
            }
        ),
        null,
        "hud"
    );
    MAIN_SCENE.addUIObject(PLAYER.crosshair);

    // Explosion setup

    PLAYER.explosion = new SceneObject(
        new Transform(),
        COMMON_MODEL_QUAD,
        new Material(
            SP_UI_SPRITE,
            {
                color: [1, 1, 1, 1],
                texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/animations/explosion_small.png"
            }
        )
    );
    PLAYER.explosion.hidden = true;
    PLAYER.explosion.animation = new Animation(PLAYER.explosion.material, 8, 12);
    PLAYER.explosion.animation.onComplete = () => {PLAYER.explosion.hidden = true;};
    MAIN_SCENE.addUIObject(PLAYER.explosion);

    // Minimap setup

    const minimap = new SceneObject(
        new Transform([0, 0.725, 0], [0, 0, 0], [0.3, 0.3, 1]),
        COMMON_MODEL_QUAD,
        new Material(
            SP_UI_SPRITE,
            {
                color: [1, 1, 1, 1],
                texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/minimap.png"
            }
        ),
        null,
        "hud"
    );
    MAIN_SCENE.addUIObject(minimap);

    MINIMAP_CONTAINER = new Transform([0, 0, 0], [0, 0, 0], [0.75, 0.75, 1]);
    MINIMAP_CONTAINER.parent = minimap.transform;
    MAP_WALL_MAT = new Material(
        SP_UI_MINIMAP,
        {
            color: [0, 0.7, 0, 1],
            minimapTransform: MINIMAP_CONTAINER
        }
    );

    MINIMAP_ROTATER = new Transform([0, 0, 0], [0, 0, 0], [MINIMAP_SCALE, MINIMAP_SCALE, 1]);
    MINIMAP_ROTATER.parent = MINIMAP_CONTAINER;
    MINIMAP_POSITIONER = new Transform([0, 0, 0], [0, 0, 0], [1, 1, 1]);
    MINIMAP_POSITIONER.parent = MINIMAP_ROTATER;

    for (const obj of MAIN_SCENE.objects) {
        if ("tag" in obj && obj.tag === "wall") {
            const wallMapObject = new SceneObject(
                new Transform(),
                COMMON_MODEL_QUAD,
                MAP_WALL_MAT,
                null,
                "hud"
            );

            const wallWorldPos = obj.transform.GetWorldPosition();
            wallMapObject.transform.setLocalPosition([wallWorldPos[0], wallWorldPos[2], 0.1]);
            wallMapObject.transform.setLocalScale([obj.transform.localScale[0], obj.transform.localScale[2], 1]);

            // Set the objects rotation
            let rot = obj.transform.GetWorldRotation();
            wallMapObject.transform.setLocalRotation([
                rot[0], rot[2], rot[1], rot[3], // column 1: x
                rot[8], rot[10], rot[9], rot[11], // column 2: z (swapped with y)
                0, 0, 1, 0, // column 3: y (swapped with z)
                0, 0, 0, 1, // column 4: should be blank
            ]);

            wallMapObject.transform.parent = MINIMAP_POSITIONER;

            MAIN_SCENE.addUIObject(wallMapObject);
        }
    }

    MINIMAP_SWEEPER = new SceneObject(
        new Transform(),
        COMMON_MODEL_QUAD,
        new Material(
            SP_UI_SPRITE,
            {
                color: [1, 1, 1, 1],
                texture: "https://pixelz22.github.io/randomly-hosted-resources/csc561/prog5/minimap_sweeper.png"
            }
        ),
        null,
        "hud"
    );
    MINIMAP_SWEEPER.transform.parent = minimap.transform;
    MAIN_SCENE.addUIObject(MINIMAP_SWEEPER);

    // DECORATIONS

    for (let i = 0; i < PLANT_COUNT; i++) {
        let x;
        let z;
        let isInBox
        do {
            x = (Math.random() * 2 - 1) * PLANT_BOUNDS;
            z = (Math.random() * 2 - 1) * PLANT_BOUNDS;

            isInBox = false;
            for (let c of MAIN_SCENE.colliders) {
                if (pointInBox(c, [x, 0, z])) {
                    isInBox = true;
                    break;
                }
            }

        } while (0.25 > perlin.get(x * PLANT_GEN_SCALE, z * PLANT_GEN_SCALE) || isInBox);

        let plantType = Math.random();

        let plant;
        if (plantType < 0.2) {
            plant = new SceneObject(
                new Transform(
                    [x, 1, z],
                    [0, 0, 0],
                    [2.5, 1, 1]
                ),
                COMMON_MODEL_QUAD,
                DECORATION_MAT_2,
                null,
                "decoration"
            );
        } else if (plantType < 0.6) {
            plant = new SceneObject(
                new Transform(
                    [x, 0.75, z],
                    [0, 0, 0],
                    [0.75, 0.75, 1])
                ,
                COMMON_MODEL_QUAD,
                DECORATION_MAT_1,
                null,
                "decoration"
            );
        } else {
            plant = new SceneObject(
                new Transform(
                    [x, 0.75, z],
                    [0, 0, 0],
                    [0.75, 0.75, 1]
                ),
                COMMON_MODEL_QUAD,
                DECORATION_MAT_3,
                null,
                "decoration"
            );
        }

        MAIN_SCENE.addObject(plant);
    }
}
