let SP_UI_SPRITE = new Shader();

SP_UI_SPRITE.init = function() {
    SP_UI_SPRITE.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("texCoord", GL_UV_BUFFER, 2, gl.FLOAT),
    ];

    SP_UI_SPRITE.uniformNames = [
        "u_SpriteTex",
        "u_TintColor",
        "u_TransformMatrix",
        "u_TextureScale",
        "u_TextureOffset",
    ];

    SP_UI_SPRITE.vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition;
        attribute vec2 texCoord;
        
        uniform mat4 u_TransformMatrix;
    
        varying vec2 v_TexCoord;
        void main(void) {
            vec4 viewPos = u_TransformMatrix * vec4(vertexPosition, 1.0);
            gl_Position = vec4(viewPos.xy, 0.0, viewPos.w);
            v_TexCoord = texCoord;
        }
    `;

    SP_UI_SPRITE.fShaderCode = `
        precision mediump float;
        
        uniform sampler2D u_SpriteTex;
        
        uniform vec4 u_TintColor;
        
        uniform vec2 u_TextureScale;
        uniform vec2 u_TextureOffset;
        
        varying vec2 v_TexCoord;
        void main(void) {
            gl_FragColor = u_TintColor * texture2D(u_SpriteTex, u_TextureScale * (v_TexCoord + u_TextureOffset));
        }
    `;

    SP_UI_SPRITE.configGL = function () {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    };

    SP_UI_SPRITE.loadMaterial = function (material) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tryGetTexture(material.data['texture']));
        gl.uniform1i(this["u_SpriteTex"], 0);

        gl.uniform4fv(this["u_TintColor"], material.data['color']);

        if ("scale" in material.data)
            gl.uniform2fv(this["u_TextureScale"], material.data['scale']);
        else gl.uniform2fv(this["u_TextureScale"], [1, 1]);

        if ("offset" in material.data)
            gl.uniform2fv(this["u_TextureOffset"], material.data['offset']);
        else gl.uniform2fv(this["u_TextureOffset"], [0, 0]);
    };

    SP_UI_SPRITE.loadTransform = function (transform) {
        transform.updateMatrices();

        gl.uniformMatrix4fv(this["u_TransformMatrix"], false, transform.LocalToWorldMatrix());
    }

    SP_UI_SPRITE.build();
};