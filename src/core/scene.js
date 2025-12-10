class Light {
    constructor(direction, ambient, diffuse, specular) {
        this.direction = direction;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
    }
}

class SceneObject {
    constructor(transform, model, material, collider, tag) {
        this.transform = transform;
        this.model = model;
        this.material = material;

        if (collider !== undefined && collider !== null) {
            this.collider = collider;
            this.collider.transform = this.transform;
            this.collider.object = this;
        } else {
            this.collider = null;
        }

        if (tag !== undefined) {
            this.tag = tag;
        }

        this.hidden = false;
    }
}

class Scene {
    constructor(camera, light, objects) {
        if (arguments.length === 0) return;

        this.camera = camera;
        this.light = light
        this.objects = objects;
        this.colliders = [];

        this.uiObjects = [];

        for (let object of objects) {
            if (object.collider !== null) this.colliders.push(object.collider);
        }

        this.skybox = null;
        this.queuedForDestruction = [];
    }

    addObject(object) {
        this.objects.push(object);

        if (object.collider !== null) this.colliders.push(object.collider);

        return this;
    }

    removeObject(object) {
        let colliderIdx = this.colliders.indexOf(object.collider);
        if (colliderIdx >= 0) this.colliders.splice(colliderIdx, 1);

        let objectIdx = this.objects.indexOf(object);
        if (objectIdx >= 0) this.objects.splice(objectIdx, 1);
    }

    addUIObject(object) {
        this.uiObjects.push(object);
    }

    removeUIObject(object) {
        let objectIdx = this.uiObjects.indexOf(object);
        if (objectIdx >= 0) this.uiObjects.splice(objectIdx, 1);
    }

    addSkybox(object) {
        this.skybox = object;
        return this;
    }

    queueForDestruction(object) {
        this.queuedForDestruction.push(object);
    }

    updateAnimations() {
        for (let o of this.objects) {
            if ("animation" in o)
                o.animation.update();
        }

        for (let o of this.uiObjects) {
            if ("animation" in o)
                o.animation.update();
        }
    }

    destroyQueuedObjects() {
        for (let o of this.queuedForDestruction) {
            this.removeObject(o);
        }
    }

    static fromURL(camera, light, dataURL, autocenter=false) {
        const s = new Scene();

        s.srcFolderURL = dataURL.substring(0, dataURL.lastIndexOf("/") + 1);
        s.camera = camera;
        s.light = light
        s.models = [];

        if (dataURL.endsWith(".json"))
            s.loadJSON(dataURL, autocenter);
        else if (dataURL.endsWith(".obj"))
            s.loadOBJ(dataURL, autocenter);

        return s;
    }

    loadJSON(dataURL, autocenter=false) {
        const modelsJSON = getJSONFile(dataURL, "model");
        for (let data of modelsJSON) {
            let materialJSON = data['material'];

            if ('texture' in materialJSON) { // add full path to texture name
                materialJSON['texture'] = this.srcFolderURL + materialJSON['texture'];
            }

            let material = new Material(
                SP_TEXTURED_TRANSPARENT,
                materialJSON
            );
            let model = new Model(
                new Transform(),
                material,
                data['vertices'],
                data['triangles'],
                {
                    normal: data['normals'],
                    uv: data['uvs'],
                },
                autocenter
            );

            this.models.push(model);
        }
    }

    loadOBJ(dataURL, autocenter=false) {
        // Construct the model
        const m = Model.fromOBJ(dataURL,
            [0, 0, 0],
            new Material(
                SP_BLINN_PHONG,
                {
                    ambient: [0.1, 0.1, 0.1],
                    diffuse: [0.8, 0.8, 0.7],
                    specular: [0.2, 0.1, 0],
                    n: 20
                }
            ),
            autocenter
        );

        // Add to the model list
        this.models.push(m);
    }
}
