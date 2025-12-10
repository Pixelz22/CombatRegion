let SP_UV_TEST = new Shader();

SP_UV_TEST.init = function() {

    SP_UV_TEST.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("texCoord", GL_UV_BUFFER, 2, gl.FLOAT),
    ];

    SP_UV_TEST.uniformNames = [
        // Camera properties
        "u_WorldToViewSpace",
        // Model properties
        "u_ModelToWorldSpace",
    ];

    SP_UV_TEST.vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition;
        attribute vec2 texCoord;
        
        uniform mat4 u_WorldToViewSpace;
        uniform mat4 u_ModelToWorldSpace;
    
        varying vec2 v_TexCoord;
        varying vec4 debug;
        void main(void) {
            vec4 worldPos = u_ModelToWorldSpace * vec4(vertexPosition, 1.0);
            gl_Position = u_WorldToViewSpace * worldPos;
            
            v_TexCoord = texCoord; // pass uv coordinates to fragment shader
        }
    `;

    SP_UV_TEST.fShaderCode = `
        precision mediump float;
        
        varying vec2 v_TexCoord;
        void main(void) {
            gl_FragColor = vec4(v_TexCoord.xy, 0.0, 1.0);
        }
    `;

    SP_UV_TEST.configGL = function () {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    };

    SP_UV_TEST.loadCamera = function (camera) {
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

    SP_UV_TEST.loadTransform = function (transform) {
        transform.updateMatrices();

        let invNormalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), transform.WorldToLocalMatrix());

        // Set the model's transform matrix
        gl.uniformMatrix4fv(this["u_ModelToWorldSpace"], false, transform.LocalToWorldMatrix());
    }

    SP_UV_TEST.build();
};