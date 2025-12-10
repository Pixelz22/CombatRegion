let SP_BILLBOARD = new Shader();

SP_BILLBOARD.init = function() {
    SP_BILLBOARD.transparent = true;

    SP_BILLBOARD.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("texCoord", GL_UV_BUFFER, 2, gl.FLOAT),
    ];

    SP_BILLBOARD.uniformNames = [
        // Camera properties
        "u_WorldToViewSpace",
        "u_EyePosition",
        // Model properties
        "u_ModelToWorldSpace",
        "u_TransformCenter",
        "u_TransformScale",
        // Texture
        "u_Texture",
        "u_TextureScale",
        "u_TextureOffset",
    ];

    SP_BILLBOARD.vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition;
        attribute vec2 texCoord;
        
        uniform mat4 u_ModelToWorldSpace;
        
        uniform vec3 u_EyePosition;
        uniform vec3 u_TransformCenter;
        uniform vec3 u_TransformScale;
        
        uniform mat4 u_WorldToViewSpace;
    
        varying vec2 v_TexCoord;
        void main(void) {
            vec3 forward = normalize(u_TransformCenter - u_EyePosition);
            vec3 up = vec3(0.0, 1.0, 0.0);
            vec3 right = normalize(cross(up, forward));
            forward = normalize(cross(right, up));
            
            mat4 rotationMat = mat4(mat3(right, up, forward));
            
            vec4 worldPos = u_ModelToWorldSpace * rotationMat * vec4(u_TransformScale * vertexPosition, 1.0);
            gl_Position = u_WorldToViewSpace * worldPos;
            v_TexCoord = texCoord;
        }
    `;

    SP_BILLBOARD.fShaderCode = `
        precision mediump float;
        
        uniform sampler2D u_Texture;
        
        uniform vec2 u_TextureScale;
        uniform vec2 u_TextureOffset;
        
        varying vec2 v_TexCoord;
        void main(void) {
            vec4 texColor = texture2D(u_Texture, u_TextureScale * (v_TexCoord + u_TextureOffset));
            
            gl_FragColor = texColor;
        }
    `;

    SP_BILLBOARD.configGL = function () {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    };

    SP_BILLBOARD.loadMaterial = function (material) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tryGetTexture(material.data['texture']));
        gl.uniform1i(this["u_Texture"], 0);

        if ("scale" in material.data)
            gl.uniform2fv(this["u_TextureScale"], material.data['scale']);
        else gl.uniform2fv(this["u_TextureScale"], [1, 1]);

        if ("offset" in material.data)
            gl.uniform2fv(this["u_TextureOffset"], material.data['offset']);
        else gl.uniform2fv(this["u_TextureOffset"], [0, 0]);
    }

    SP_BILLBOARD.loadCamera = function (camera) {
        camera.setAspectRatio(gl.drawingBufferWidth / gl.drawingBufferHeight);
        camera.updateProjectionMatrix();
        camera.updateTransformMatrices();

        const worldToView = glMatrix.mat4.multiply(
            glMatrix.mat4.create(),
            camera.ProjectionMatrix,
            camera.transform.WorldToLocalMatrix()
        );

        gl.uniformMatrix4fv(this["u_WorldToViewSpace"], false, worldToView);
        gl.uniform3fv(this["u_EyePosition"], camera.transform.GetWorldPosition());
    };

    SP_BILLBOARD.loadTransform = function (transform) {
        transform.updateMatrices();

        let testTransform = new Transform(transform.GetWorldPosition());

        // Set the model's transform matrix
        gl.uniform3fv(this["u_TransformCenter"], transform.GetWorldPosition());
        gl.uniform3fv(this["u_TransformScale"], transform.localScale);
        gl.uniformMatrix4fv(this["u_ModelToWorldSpace"], false, testTransform.LocalToWorldMatrix());
    }

    SP_BILLBOARD.build();
};