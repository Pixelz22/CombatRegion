class Transform {
    constructor(position, rotation, scale, parent) {
        if (position !== undefined)
            this.localPosition = position;
        else this.localPosition = glMatrix.vec3.create();

        if (rotation !== undefined)
            this.setLocalRotationEuler(rotation);
        else this.localRotationMatrix = glMatrix.mat4.create();
        //this.localRotationMatrix[15] = 0;

        if (scale !== undefined)
            this.localScale = scale;
        else this.localScale = glMatrix.vec3.fromValues(1, 1, 1);

        if (parent !== undefined)
            this.parent = parent;
        else this.parent = null;

        this.shouldUpdateMatrices = true;
        this.LocalToParentMatrix = glMatrix.mat4.create();
        this.ParentToLocalMatrix = glMatrix.mat4.create();
        this.updateMatrices();
    }

    static clone(other) {
        const t = new Transform();
        t.copy(other);
        return t;
    }

    copy(other) {
        this.setLocalPosition(other.localPosition);
        this.setLocalRotation(other.localRotationMatrix);
        this.setLocalScale(other.localScale);
        this.updateMatrices();
    }

    getLocalUp() {
        return [
            this.localRotationMatrix[4],
            this.localRotationMatrix[5],
            this.localRotationMatrix[6]
        ];
    }

    getLocalRight() {
        return [
            this.localRotationMatrix[0],
            this.localRotationMatrix[1],
            this.localRotationMatrix[2]
        ];
    }

    getLocalForward() {
        return [
            this.localRotationMatrix[8],
            this.localRotationMatrix[9],
            this.localRotationMatrix[10]
        ];
    }

    translate(offset) {
        if (glMatrix.vec3.squaredLength(offset) !== 0)
            this.shouldUpdateMatrices = true;
        glMatrix.vec3.add(this.localPosition, this.localPosition, offset);
    }

    setLocalPosition(position) {
        this.localPosition[0] = position[0];
        this.localPosition[1] = position[1];
        this.localPosition[2] = position[2];
        this.shouldUpdateMatrices = true;
    }

    setLocalRotation(rotationMatrix) {
        glMatrix.mat4.copy(this.localRotationMatrix, rotationMatrix);
        //this.localRotationMatrix[15] = 0;
        this.shouldUpdateMatrices = true;
    }

    setLocalScale(scale) {
        this.localScale[0] = scale[0];
        this.localScale[1] = scale[1];
        this.localScale[2] = scale[2];
        this.shouldUpdateMatrices = true;
    }

    translateRelative(offset) {
        this.updateMatrices();
        if (glMatrix.vec3.squaredLength(offset) !== 0)
            this.shouldUpdateMatrices = true;

        let transformedOffset = glMatrix.vec4.transformMat4(glMatrix.vec4.create(),
            glMatrix.vec4.fromValues(offset[0], offset[1], offset[2], 0),
            this.LocalToParentMatrix
        );

        glMatrix.vec3.add(this.localPosition, this.localPosition, transformedOffset);

        return this;
    }

    setLocalRotationEuler(eulerAngles) {
        this.localRotationMatrix = glMatrix.mat4.create();
        glMatrix.mat4.rotateY(this.localRotationMatrix, this.localRotationMatrix, eulerAngles[1] * Math.PI / 180);
        glMatrix.mat4.rotateX(this.localRotationMatrix, this.localRotationMatrix, eulerAngles[0] * Math.PI / 180);
        glMatrix.mat4.rotateZ(this.localRotationMatrix, this.localRotationMatrix, eulerAngles[2] * Math.PI / 180);
        this.shouldUpdateMatrices = true;
    }

    rotateEuler(rotationOffset) {
        if (glMatrix.vec3.squaredLength(rotationOffset) !== 0)
            this.shouldUpdateMatrices = true;

        const yRot = glMatrix.mat4.fromYRotation(glMatrix.mat4.create(), rotationOffset[1]);
        glMatrix.mat4.multiply(this.localRotationMatrix, yRot, this.localRotationMatrix);

        const xRot = glMatrix.mat4.fromRotation(glMatrix.mat4.create(), rotationOffset[0], this.getLocalRight());
        glMatrix.mat4.multiply(this.localRotationMatrix, xRot, this.localRotationMatrix);

        const zRot = glMatrix.mat4.fromRotation(glMatrix.mat4.create(), rotationOffset[2], this.getLocalForward());
        glMatrix.mat4.multiply(this.localRotationMatrix, zRot, this.localRotationMatrix);

        return this;
    }

    rotateAroundAxis(axis, angle) {
        if (angle !== 0)
            this.shouldUpdateMatrices = true;

        const rot = glMatrix.mat4.fromRotation(glMatrix.mat4.create(), angle, axis);
        glMatrix.mat4.multiply(this.localRotationMatrix, rot, this.localRotationMatrix);

        return this;
    }

    scaleByScalar(factor) {
        if (factor !== 1)
            this.shouldUpdateMatrices = true;

        glMatrix.vec3.localScale(this.localScale, this.localScale, factor);

        return this;
    }

    updateMatrices(force=false) {
        if (!this.shouldUpdateMatrices && !force)
            return;

        glMatrix.mat4.fromTranslation(this.LocalToParentMatrix, this.localPosition);
        glMatrix.mat4.multiply(this.LocalToParentMatrix, this.LocalToParentMatrix, this.localRotationMatrix);
        glMatrix.mat4.scale(this.LocalToParentMatrix, this.LocalToParentMatrix, this.localScale);

        glMatrix.mat4.invert(this.ParentToLocalMatrix, this.LocalToParentMatrix);

        this.shouldUpdateMatrices = false;
    }

    LocalToWorldMatrix() {
        this.updateMatrices();
        if (this.parent === null)
            return this.LocalToParentMatrix;

        this.parent.updateMatrices();
        return glMatrix.mat4.multiply(
            glMatrix.mat4.create(),
            this.parent.LocalToWorldMatrix(),
            this.LocalToParentMatrix
        );
    }

    WorldToLocalMatrix() {
        this.updateMatrices();
        if (this.parent === null)
            return this.ParentToLocalMatrix;

        this.parent.updateMatrices();
        return glMatrix.mat4.multiply(
            glMatrix.mat4.create(),
            this.ParentToLocalMatrix,
            this.parent.WorldToLocalMatrix(),
        );
    }

    GetWorldPosition() {
        let pos = [...this.localPosition, 1];

        if (this.parent !== null) {
            this.parent.updateMatrices();
            glMatrix.vec4.transformMat4(pos, pos, this.parent.LocalToWorldMatrix());
        }

        return [pos[0], pos[1], pos[2]];
    }

    GetWorldRotation() {
        let rot = glMatrix.mat4.clone(this.localRotationMatrix);

        if (this.parent !== null) {
            this.parent.updateMatrices();
            return glMatrix.mat4.multiply(
                rot,
                this.parent.GetWorldRotation(),
                rot
            );
        }

        return rot;
    }

    GetWorldUp() {
        const worldRot = this.GetWorldRotation();
        return [
            worldRot[4],
            worldRot[5],
            worldRot[6]
        ];
    }

    GetWorldRight() {
        const worldRot = this.GetWorldRotation();
        return [
            worldRot[0],
            worldRot[1],
            worldRot[2]
        ];
    }

    GetWorldForward() {
        const worldRot = this.GetWorldRotation();
        return [
            worldRot[8],
            worldRot[9],
            worldRot[10]
        ];
    }
}