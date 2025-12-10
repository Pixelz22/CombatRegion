let SP_TEXTURED_TRANSPARENT = new Shader();

SP_TEXTURED_TRANSPARENT.init = function() {

    SP_TEXTURED_TRANSPARENT.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("vertexNormal", GL_NORMAL_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("texCoord", GL_UV_BUFFER, 2, gl.FLOAT),
    ];

    SP_TEXTURED_TRANSPARENT.uniformNames = [
        // Camera properties
        "u_WorldToViewSpace",
        "u_EyePosition",
        // Model properties
        "u_ModelToWorldSpace",
        "u_ModelNormalMatrix",
        // Material properties
        "u_Material.ambient",
        "u_Material.diffuse",
        "u_Material.specular",
        "u_Material.specExp",
        "u_Material.alpha",
        // Light properties
        "u_Light.position",
        "u_Light.ambient",
        "u_Light.diffuse",
        "u_Light.specular",
        // Texture
        "u_Texture",
        "u_UseLighting"
    ];

    SP_TEXTURED_TRANSPARENT.vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition;
        attribute vec3 vertexNormal;
        attribute vec2 texCoord;
        
        uniform mat4 u_WorldToViewSpace;
        uniform mat4 u_ModelToWorldSpace;
        uniform mat4 u_ModelNormalMatrix;
    
        varying vec3 worldPos;
        varying vec3 worldNormal;
        varying vec2 v_TexCoord;
        varying vec4 debug;
        void main(void) {
            worldPos = vec3(u_ModelToWorldSpace * vec4(vertexPosition, 1.0));
            gl_Position = u_WorldToViewSpace * vec4(worldPos, 1.0);
            debug = gl_Position;
            
            worldNormal = normalize(vec3(u_ModelNormalMatrix * vec4(vertexNormal, 0.0))); // pass vertex normal to fragment shader
            
            v_TexCoord = texCoord; // pass uv coordinates to fragment shader
        }
    `;

    SP_TEXTURED_TRANSPARENT.fShaderCode = `
        precision mediump float;
        
        struct Material {
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
            float specExp;
            float alpha;
        };
        
        struct Light {
            vec3 position;
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
        };
        
        uniform Light u_Light;
        uniform Material u_Material;
        uniform vec3 u_EyePosition;
        
        uniform sampler2D u_Texture;
        
        uniform bool u_UseLighting;
        
        varying vec3 worldPos;
        varying vec3 worldNormal;
        varying vec2 v_TexCoord;
        varying vec4 debug;
        void main(void) {
            vec4 texColor = texture2D(u_Texture, v_TexCoord);
            
            if (u_UseLighting) {
                vec3 viewRay = normalize(u_EyePosition - worldPos);
                
                vec3 color = texColor.rgb * u_Material.ambient * u_Light.ambient;
                vec3 lightRay = normalize(u_Light.position - worldPos);
                
                float diffuseIntensity = clamp(dot(lightRay, worldNormal), 0.0, 1.0);
                color += diffuseIntensity * u_Material.diffuse * u_Light.diffuse;
                
                if (diffuseIntensity > 0.0) {
                    vec3 halfVec = normalize(lightRay + viewRay);
                    
                    float specularIntensity = dot(worldNormal, halfVec);
                    specularIntensity = pow(specularIntensity, u_Material.specExp);
                    color += specularIntensity * u_Material.specular * u_Light.specular;
                }
                
                gl_FragColor = vec4(color, u_Material.alpha * texColor.a);
            } else {
                gl_FragColor = vec4(v_TexCoord, 0.0, 1.0);
            }
        }
    `;

    SP_TEXTURED_TRANSPARENT.configGL = function () {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.uniform1i(this["u_UseLighting"], LIGHTING_TOGGLE);
    };

    SP_TEXTURED_TRANSPARENT.loadLight = function (light) {
        gl.uniform3fv(this["u_Light.position"], light.localPosition);
        gl.uniform3fv(this["u_Light.ambient"], light.ambient);
        gl.uniform3fv(this["u_Light.diffuse"], light.diffuse);
        gl.uniform3fv(this["u_Light.specular"], light.specular);
    };

    SP_TEXTURED_TRANSPARENT.loadCamera = function (camera) {
        camera.setAspectRatio(gl.drawingBufferWidth / gl.drawingBufferHeight);
        camera.updateProjectionMatrix();
        camera.updateTransformMatrices();

        const worldToView = glMatrix.mat4.multiply(
            glMatrix.mat4.create(),
            camera.ProjectionMatrix,
            camera.transform.WorldToLocalMatrix()
        );

        gl.uniform3fv(this["u_EyePosition"], camera.transform.localPosition);
        gl.uniformMatrix4fv(this["u_WorldToViewSpace"], false, worldToView);
    };

    SP_TEXTURED_TRANSPARENT.loadModel = function (model) {
        model.transform.updateMatrices();

        let modelNormal = glMatrix.mat4.transpose(glMatrix.mat4.create(), model.transform.WorldToLocalMatrix());

        // Set the model's transform matrix
        gl.uniformMatrix4fv(this["u_ModelToWorldSpace"], false, model.transform.LocalToWorldMatrix());
        gl.uniformMatrix4fv(this["u_ModelNormalMatrix"], false, modelNormal);


        // Query the texture handle from our data
        let textureHandle = getTexture(model.material.data['texture']);

        if (textureHandle === null) {
            // if we haven't seen this texture before, load it from src
            textureHandle = loadTexture(model.material.data['texture']);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // flip texture cause webgl stupid
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureHandle);
        gl.uniform1i(this["u_Texture"], 0);

        // Set the model's material
        gl.uniform3fv(this["u_Material.ambient"], model.material.data['ambient']);
        gl.uniform3fv(this["u_Material.diffuse"], model.material.data['diffuse']);
        gl.uniform3fv(this["u_Material.specular"], model.material.data['specular']);
        gl.uniform1f(this["u_Material.specExp"], model.material.data['n']);
        gl.uniform1f(this["u_Material.alpha"], model.material.data['alpha']);
    };

    SP_TEXTURED_TRANSPARENT.build();
};