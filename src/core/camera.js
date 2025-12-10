class Camera {
    constructor(position, rotation, fovy, nearPlane, farPlane=200) {
        this.transform = new Transform(position, rotation);
        this.fovy = fovy * Math.PI / 180;
        this.aspectRatio = null;
        this.nearPlane = nearPlane;
        this.farPlane = farPlane;

        this.ProjectionMatrix = null;
    }

    setAspectRatio(aspectRatio) {
        if (this.aspectRatio !== aspectRatio)
            this.shouldUpdateProjectionMatrix = true;
        this.aspectRatio = aspectRatio;
    }

    setFOV(fovy) {
        const newValue = fovy * Math.PI / 180;
        if (this.fovy !== newValue)
            this.shouldUpdateProjectionMatrix = true;
        this.fovy = newValue;
    }

    setClippingPlanes(near, far) {
        if (this.nearPlane !== near || this.farPlane !== far)
            this.shouldUpdateProjectionMatrix = true;
        this.nearPlane = near;
        this.farPlane = far;
    }

    updateTransformMatrices() {
        this.transform.updateMatrices();
    }

    updateProjectionMatrix() {
        if (this.aspectRatio === null)
            throw "Cannot calculate projection matrix. You must set the aspect ratio first";

        if (!this.shouldUpdateProjectionMatrix)
            return;

        let perspectiveMatrix = glMatrix.mat4.fromValues(
            this.nearPlane, 0, 0, 0,
            0, this.nearPlane, 0, 0,
            0, 0, this.nearPlane + this.farPlane, 1,
            0, 0, -this.nearPlane * this.farPlane, 0
        );

        let halfWidth = this.nearPlane * Math.tan(this.fovy / 2);
        let halfHeight = halfWidth * this.aspectRatio;

        let orthoMatrix = glMatrix.mat4.fromValues(
            1 / halfWidth, 0, 0, 0,
            0, 1 / halfHeight, 0, 0,
            0, 0, 2 / (this.farPlane - this.nearPlane), 0,
            0, 0, -(this.farPlane + this.nearPlane) / (this.farPlane - this.nearPlane), 1
        );

        this.ProjectionMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(),
            orthoMatrix,
            perspectiveMatrix
        );

        this.shouldUpdateProjectionMatrix = false;
    }
}
