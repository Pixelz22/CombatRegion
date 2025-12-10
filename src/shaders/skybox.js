let SP_SKYBOX = new Shader();

SP_SKYBOX.init = function() {
    SP_SKYBOX.transparent = true;

    SP_SKYBOX.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
    ];

    SP_SKYBOX.uniformNames = [
        // Camera properties
        "u_ViewToCameraSpace",
        "u_CameraToWorldSpace",
        "u_EyePosition",
        // Light
        "u_Light.direction",
        "u_Light.ambient",
        "u_Light.diffuse",
        "u_Light.specular",
        // Textures
        "u_GroundColorTex",
        "u_GroundNormalTex",
        "u_GroundAOTex",
        "u_TextureScale",
    ];

    SP_SKYBOX.vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition;
        
        uniform mat4 u_ViewToCameraSpace;
        uniform mat4 u_CameraToWorldSpace;
    
        varying vec3 viewVector;
        void main(void) {
            gl_Position = vec4(vertexPosition, 1.0);
            viewVector = vec3(u_ViewToCameraSpace * vec4(vertexPosition.xy, 0.0, 1.0));
            viewVector = vec3(u_CameraToWorldSpace * vec4(viewVector, 0.0));
        }
    `;

    SP_SKYBOX.fShaderCode = `
        precision mediump float;
        
        uniform vec3 u_EyePosition;
        
        struct Light {
            vec3 direction;
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
        };
        uniform Light u_Light;
        
        uniform sampler2D u_GroundColorTex;
        uniform sampler2D u_GroundNormalTex;
        uniform sampler2D u_GroundAOTex;
        
        uniform vec2 u_TextureScale;
        
        varying vec3 viewVector;
        void main(void) {
            vec3 viewRay = viewVector / length(viewVector);
            
            vec3 groundColor = vec3(0.29, 0.29, 0.29);
            
            vec3 skyColorLow = vec3(0.2, 0.2, 0.4);
            vec3 skyColorMid = vec3(0.5, 0.5, 0.8);
            vec3 skyColorHigh = vec3(0.86, 0.86, 1.0);
            
            vec3 skyColor;
        
            if (viewRay.y <= 0.0) skyColor = mix(skyColorMid, skyColorLow, -viewRay.y);
            else skyColor = mix(skyColorMid, skyColorHigh, viewRay.y);
            
            if (viewRay.y == 0.0) gl_FragColor = vec4(skyColor, 1.0);
            else {
                float t = u_EyePosition.y / -viewRay.y;
                if (t <= 0.0) gl_FragColor = vec4(skyColor, 1.0);
                else {
                    
                    vec3 groundPos = u_EyePosition + (t * viewRay);
                    vec2 uv = u_TextureScale * groundPos.xz;
                    
                    vec3 groundCol = texture2D(u_GroundColorTex, uv).rgb;
                    float groundAO = texture2D(u_GroundAOTex, uv).r;
                    vec3 groundNormal = texture2D(u_GroundNormalTex, uv).rgb * 2.0 - 1.0;
                    groundNormal = groundNormal.xzy;
                    
                    vec3 color = groundCol * u_Light.ambient * groundAO;
                    vec3 lightRay = normalize(-u_Light.direction);
                    
                    float diffuseIntensity = clamp(dot(lightRay, groundNormal), 0.0, 1.0);
                    color += diffuseIntensity * u_Light.diffuse * groundCol;
                    
                    gl_FragColor = vec4(color, 1.0);
                    
                    //gl_FragColor = vec4(groundPos, 1.0);
                }
            }
        }
    `;

    SP_SKYBOX.configGL = function () {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.EQUAL);
        gl.depthMask(false);
        gl.disable(gl.BLEND);
    };

    SP_SKYBOX.loadLight = function (light) {
        gl.uniform3fv(this["u_Light.direction"], light.direction);
        gl.uniform3fv(this["u_Light.ambient"], light.ambient);
        gl.uniform3fv(this["u_Light.diffuse"], light.diffuse);
        gl.uniform3fv(this["u_Light.specular"], light.specular);
    };

    SP_SKYBOX.loadMaterial = function (material) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, getTexture(material.data["texture"]));
        gl.uniform1i(this["u_GroundColorTex"], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, getTexture(material.data['normalTexture']));
        gl.uniform1i(this["u_GroundNormalTex"], 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, getTexture(material.data['aoTexture']));
        gl.uniform1i(this["u_GroundAOTex"], 2);

        gl.uniform2fv(this["u_TextureScale"], material.data['scale']);
    };

    SP_SKYBOX.loadCamera = function (camera) {
        camera.setAspectRatio(gl.drawingBufferWidth / gl.drawingBufferHeight);
        camera.updateProjectionMatrix();
        camera.updateTransformMatrices();

        const viewToCamera = glMatrix.mat4.invert(
            glMatrix.mat4.create(),
            camera.ProjectionMatrix
        );

        gl.uniformMatrix4fv(this["u_ViewToCameraSpace"], false, viewToCamera);
        gl.uniformMatrix4fv(this["u_CameraToWorldSpace"], false, camera.transform.LocalToWorldMatrix());
        gl.uniform3fv(this["u_EyePosition"], camera.transform.GetWorldPosition());
    };

    SP_SKYBOX.build();
};