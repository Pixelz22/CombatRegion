let SP_WIREFRAME = new Shader();

SP_WIREFRAME.init = function() {

    SP_WIREFRAME.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT)
    ];

    SP_WIREFRAME.uniformNames = [
        // Camera properties
        "u_WorldToViewSpace",
        // Model properties
        "u_ModelToWorldSpace",
        // Material properties
        "u_Color",
    ];

    SP_WIREFRAME.vShaderCode = `
    precision mediump float;
    
    attribute vec3 vertexPosition;
    
    uniform mat4 u_WorldToViewSpace;
    uniform mat4 u_ModelToWorldSpace;

    void main(void) {
        vec4 worldPos = u_ModelToWorldSpace * vec4(vertexPosition, 1.0);
        gl_Position = u_WorldToViewSpace * vec4(worldPos.x, 0, worldPos.z, 1.0);
    }
`;

    SP_WIREFRAME.fShaderCode = `
    precision mediump float;
    
    uniform vec3 u_Color;
    
    void main(void) {
        gl_FragColor = vec4(u_Color, 1.0);
    }
`;

    SP_WIREFRAME.configGL = function () {
        gl.disable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(false);
        gl.disable(gl.BLEND);
    };

    SP_WIREFRAME.loadCamera = function (camera) {
        camera.setAspectRatio(gl.drawingBufferWidth / gl.drawingBufferHeight);
        camera.updateProjectionMatrix();
        camera.updateTransformMatrices();

        const worldToView = glMatrix.mat4.multiply(
            glMatrix.mat4.create(),
            camera.ProjectionMatrix,
            camera.transform.WorldToLocalMatrix()
        );

        gl.uniformMatrix4fv(this["u_WorldToViewSpace"], false, worldToView);
    };

    SP_WIREFRAME.loadTransform = function (transform) {
        transform.updateMatrices();

        // Set the model's transform matrix
        gl.uniformMatrix4fv(this["u_ModelToWorldSpace"], false, transform.LocalToWorldMatrix());
    }

    SP_WIREFRAME.loadMaterial = function (material) {
        // Set the model's material
        gl.uniform3fv(this["u_Color"], material.data['color']);
    };

    SP_WIREFRAME.build();
};