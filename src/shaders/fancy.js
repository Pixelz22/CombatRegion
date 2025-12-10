let SP_FANCY = new Shader();

SP_FANCY.init = function() {

    SP_FANCY.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("vertexNormal", GL_NORMAL_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("texCoord", GL_UV_BUFFER, 2, gl.FLOAT),
        new ShaderAttribute("vertexTangent", GL_TANGENT_BUFFER, 3, gl.FLOAT),
    ];

    SP_FANCY.uniformNames = [
        // Camera properties
        "u_WorldToViewSpace",
        "u_EyePosition",
        // Model properties
        "u_ModelToWorldSpace",
        "u_ModelNormalMatrix",
        "u_ModelScale",
        // Material properties
        "u_Material.ambient",
        "u_Material.diffuse",
        "u_Material.specular",
        "u_Material.specExp",
        // Light properties
        "u_Light.direction",
        "u_Light.ambient",
        "u_Light.diffuse",
        "u_Light.specular",
        // Texture
        "u_Texture",
        "u_NormalTexture",
        "u_AmbientOcclusionTexture",
        "u_TextureScale",
        "u_TextureOffset",
    ];

    SP_FANCY.vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition;
        attribute vec3 vertexNormal;
        attribute vec2 texCoord;
        attribute vec3 vertexTangent;
        
        uniform mat4 u_WorldToViewSpace;
        uniform mat4 u_ModelToWorldSpace;
        uniform vec3 u_ModelScale;
    
        varying vec3 worldPos;
        varying vec3 scaledPos;
        varying vec3 v_ModelNormal;
        varying vec3 v_ModelTangent;
        varying vec2 v_TexCoord;
        varying float depth;
        void main(void) {
            worldPos = vec3(u_ModelToWorldSpace * vec4(vertexPosition, 1.0));
            scaledPos = u_ModelScale * vertexPosition;
            gl_Position = u_WorldToViewSpace * vec4(worldPos, 1.0);
            depth = gl_Position.w;
            
            v_ModelNormal = normalize(vertexNormal); // pass vertex normal to fragment shader
            v_ModelTangent = normalize(vertexTangent);
            
            v_TexCoord = texCoord; // pass uv coordinates to fragment shader
        }
    `;

    SP_FANCY.fShaderCode = `
        precision mediump float;
        
        struct Material {
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
            float specExp;
        };
        
        struct Light {
            vec3 direction;
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
        };
        
        uniform Light u_Light;
        uniform Material u_Material;
        uniform vec3 u_EyePosition;
        
        uniform sampler2D u_Texture;
        uniform sampler2D u_NormalTexture;
        uniform sampler2D u_AmbientOcclusionTexture;
        
        uniform vec2 u_TextureScale;
        uniform vec2 u_TextureOffset;
        
        uniform mat4 u_ModelNormalMatrix;
        
        vec3 projectOnVector(vec3 v, vec3 onto) {
            return dot(v, onto) / length(onto) * normalize(onto);
        }
        
        varying vec3 worldPos;
        varying vec3 scaledPos;
        varying vec2 v_TexCoord;
        varying vec3 v_ModelNormal;
        varying vec3 v_ModelTangent;
        varying float depth;
        void main(void) {
            vec3 bitangent = normalize(cross(v_ModelNormal, v_ModelTangent));
            vec3 flattened = scaledPos - projectOnVector(scaledPos, v_ModelNormal);
            float worldU = dot(flattened, v_ModelTangent);
            float worldV = dot(flattened, bitangent);
            vec2 worldUV = u_TextureScale * (vec2(worldU, worldV) + u_TextureOffset);
            
            vec3 tangentSpaceNormal = texture2D(u_NormalTexture, worldUV).rgb * 2.0 - 1.0;
            
            
            vec3 worldNormal = normalize(tangentSpaceNormal.r * normalize(v_ModelTangent)
                                            + tangentSpaceNormal.g * bitangent
                                            + tangentSpaceNormal.b * normalize(v_ModelNormal));
            worldNormal = normalize(vec3(u_ModelNormalMatrix * vec4(worldNormal, 0.0)));
            
            
            vec3 texColor = texture2D(u_Texture, worldUV).rgb;
            
            vec3 viewRay = normalize(u_EyePosition - worldPos);
            
            float ao = texture2D(u_AmbientOcclusionTexture, worldUV).r;
            vec3 color = u_Material.ambient * u_Light.ambient * texColor * ao;
            vec3 lightRay = normalize(-u_Light.direction);
            
            float diffuseIntensity = clamp(dot(lightRay, worldNormal), 0.0, 1.0);
            
            if (diffuseIntensity > 0.0) {
                vec3 halfVec = normalize(lightRay + viewRay);
                
                float specularIntensity = dot(worldNormal, halfVec);
                specularIntensity = pow(specularIntensity, u_Material.specExp);
                color += specularIntensity * u_Material.specular * u_Light.specular;
            }
            
            // Fudge the diffuse intensity a bit to get variation within the darkness
            // Also not Blinn-Phong, but again it looks nicer
            float diffuseFudging = 0.5;
            float remappedAngle = -0.5 * dot(worldNormal, lightRay) + 0.5;
            diffuseIntensity = (diffuseIntensity + remappedAngle * diffuseFudging) / (1.0 + diffuseFudging);
            color += diffuseIntensity * u_Material.diffuse * u_Light.diffuse * texColor;
            
            gl_FragColor = vec4(color, 1.0);
            
            // gl_FragColor = vec4(worldUV, 0.0, 1.0);
        }
    `;

    SP_FANCY.configGL = function () {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    };

    SP_FANCY.loadLight = function (light) {
        gl.uniform3fv(this["u_Light.direction"], light.direction);
        gl.uniform3fv(this["u_Light.ambient"], light.ambient);
        gl.uniform3fv(this["u_Light.diffuse"], light.diffuse);
        gl.uniform3fv(this["u_Light.specular"], light.specular);
    };

    SP_FANCY.loadCamera = function (camera) {
        camera.setAspectRatio(gl.drawingBufferWidth / gl.drawingBufferHeight);
        camera.updateProjectionMatrix();
        camera.updateTransformMatrices();

        const worldToView = glMatrix.mat4.multiply(
            glMatrix.mat4.create(),
            camera.ProjectionMatrix,
            camera.transform.WorldToLocalMatrix()
        );

        gl.uniform3fv(this["u_EyePosition"], camera.transform.GetWorldPosition());
        gl.uniformMatrix4fv(this["u_WorldToViewSpace"], false, worldToView);
    };

    SP_FANCY.loadTransform = function (transform) {
        transform.updateMatrices();

        let invNormalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), transform.WorldToLocalMatrix());

        // Set the model's transform matrix
        gl.uniformMatrix4fv(this["u_ModelToWorldSpace"], false, transform.LocalToWorldMatrix());
        gl.uniformMatrix4fv(this["u_ModelNormalMatrix"], false, invNormalMatrix);
        gl.uniform3fv(this["u_ModelScale"], transform.localScale);
    }

    SP_FANCY.loadMaterial = function (material) {
        // Query the texture handle from our data
        let textureHandle = tryGetTexture(material.data['texture']);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureHandle);
        gl.uniform1i(this["u_Texture"], 0);

        textureHandle = tryGetTexture(material.data['normalTexture']);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textureHandle);
        gl.uniform1i(this["u_NormalTexture"], 1);

        textureHandle = tryGetTexture(material.data['aoTexture']);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, textureHandle);
        gl.uniform1i(this["u_AmbientOcclusionTexture"], 2);

        if ("scale" in material.data)
            gl.uniform2fv(this["u_TextureScale"], material.data['scale']);
        else gl.uniform2fv(this["u_TextureScale"], [1, 1]);

        if ("offset" in material.data)
            gl.uniform2fv(this["u_TextureOffset"], material.data['offset']);
        else gl.uniform2fv(this["u_TextureOffset"], [0, 0]);

        // Set the model's material
        gl.uniform3fv(this["u_Material.ambient"], material.data['ambient']);
        gl.uniform3fv(this["u_Material.diffuse"], material.data['diffuse']);
        gl.uniform3fv(this["u_Material.specular"], material.data['specular']);
        gl.uniform1f(this["u_Material.specExp"], material.data['n']);
    };

    SP_FANCY.build();
};