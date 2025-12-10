let SP_UI_MINIMAP = new Shader();

SP_UI_MINIMAP.init = function() {
    SP_UI_MINIMAP.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
    ];

    SP_UI_MINIMAP.uniformNames = [
        "u_TintColor",
        "u_TransformMatrix",
        "u_MinimapMatrixInv"
    ];

    SP_UI_MINIMAP.vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition;
        
        uniform mat4 u_TransformMatrix;
        uniform mat4 u_MinimapMatrixInv;
    
        varying vec4 v_MapPos;
        void main(void) {
            vec4 viewPos = u_TransformMatrix * vec4(vertexPosition, 1.0);
            v_MapPos = u_MinimapMatrixInv * viewPos;
            gl_Position = vec4(viewPos.xy, 0.0, viewPos.w);
        }
    `;

    SP_UI_MINIMAP.fShaderCode = `
        precision mediump float;
        
        uniform vec4 u_TintColor;
        
        varying vec4 v_MapPos;
        void main(void) {
            if (v_MapPos.x * v_MapPos.x + v_MapPos.y * v_MapPos.y > 1.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            } else {
                gl_FragColor = u_TintColor;
            }
        }
    `;

    SP_UI_MINIMAP.configGL = function () {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    };

    SP_UI_MINIMAP.loadMaterial = function (material) {
        gl.uniform4fv(this["u_TintColor"], material.data['color']);
        gl.uniformMatrix4fv(this["u_MinimapMatrixInv"], false, material.data['minimapTransform'].WorldToLocalMatrix());
    };

    SP_UI_MINIMAP.loadTransform = function (transform) {
        transform.updateMatrices();

        gl.uniformMatrix4fv(this["u_TransformMatrix"], false, transform.LocalToWorldMatrix());
    }

    SP_UI_MINIMAP.build();
};