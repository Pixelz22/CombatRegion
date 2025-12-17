let SP_NINE = new Shader();

SP_NINE.init = function() {

    SP_NINE.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("vertexNormal", GL_NORMAL_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("texCoord", GL_UV_BUFFER, 2, gl.FLOAT),
        new ShaderAttribute("vertexTangent", GL_TANGENT_BUFFER, 3, gl.FLOAT),
    ];

    SP_NINE.uniformNames = [
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
        // Nine Slicing
        "u_UVCut",
        "u_TextureScale",
    ];

    SP_NINE.vShaderCode = `
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
            scaledPos = u_ModelScale * (vertexPosition + 1.0) / 2.0;
            gl_Position = u_WorldToViewSpace * vec4(worldPos, 1.0);
            depth = gl_Position.w;
            
            v_ModelNormal = normalize(vertexNormal); // pass vertex normal to fragment shader
            v_ModelTangent = normalize(vertexTangent);
            
            v_TexCoord = texCoord; // pass uv coordinates to fragment shader
        }
    `;

    SP_NINE.fShaderCode = `
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
        
        uniform float u_UVCut;
        uniform float u_TextureScale;
        
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
            float worldU = abs(dot(flattened, v_ModelTangent));
            float worldV = abs(dot(flattened, bitangent));
            vec2 worldUV = vec2(worldU, worldV);
            
            vec3 worldNormal = normalize(vec3(u_ModelNormalMatrix * vec4(v_ModelNormal, 0.0))); 
            
            // Nine-Slicing
            vec2 sampleUV = v_TexCoord;
            vec2 worldDimensions = worldUV / v_TexCoord;
            
            if (worldU < u_TextureScale)
                sampleUV.x = u_UVCut * worldU / u_TextureScale;
            else if (worldU < worldDimensions.x - u_TextureScale) {
                float t = (worldU - u_TextureScale) / (worldDimensions.x - 2.0 * u_TextureScale);
                sampleUV.x = mix(u_UVCut, 1.0 - u_UVCut, t);
            } else {
                float t = (worldDimensions.x - worldU) / u_TextureScale;
                sampleUV.x = 1.0 - t * u_UVCut;
            }
            
            if (worldV < u_TextureScale)
                sampleUV.y = u_UVCut * worldV / u_TextureScale;
            else if (worldV < worldDimensions.y - u_TextureScale) {
                float t = (worldV - u_TextureScale) / (worldDimensions.y - 2.0 * u_TextureScale);
                sampleUV.y = mix(u_UVCut, 1.0 - u_UVCut, t);
            } else {
                float t = (worldDimensions.y - worldV) / u_TextureScale;
                sampleUV.y = 1.0 - t * u_UVCut;
            }
           
            // Coloring
            vec3 texColor = texture2D(u_Texture, sampleUV).rgb;
            
            vec3 viewRay = normalize(u_EyePosition - worldPos);
            
            vec3 color = u_Material.ambient * u_Light.ambient * texColor;
            vec3 lightRay = normalize(-u_Light.direction);
            
            float diffuseIntensity = clamp(dot(lightRay, worldNormal), 0.0, 1.0);
            color += diffuseIntensity * u_Material.diffuse * u_Light.diffuse * texColor;
            
            if (diffuseIntensity > 0.0) {
                vec3 halfVec = normalize(lightRay + viewRay);
                
                float specularIntensity = dot(worldNormal, halfVec);
                specularIntensity = pow(specularIntensity, u_Material.specExp);
                color += specularIntensity * u_Material.specular * u_Light.specular;
            }
            
            gl_FragColor = vec4(color, 1.0);
            
            // gl_FragColor = vec4(worldUV, 0.0, 1.0);
        }
    `;

    SP_NINE.configGL = function () {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    };

    SP_NINE.loadLight = function (light) {
        gl.uniform3fv(this["u_Light.direction"], light.direction);
        gl.uniform3fv(this["u_Light.ambient"], light.ambient);
        gl.uniform3fv(this["u_Light.diffuse"], light.diffuse);
        gl.uniform3fv(this["u_Light.specular"], light.specular);
    };

    SP_NINE.loadCamera = function (camera) {
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

    SP_NINE.loadTransform = function (transform) {
        transform.updateMatrices();

        let invNormalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), transform.WorldToLocalMatrix());

        // Set the model's transform matrix
        gl.uniformMatrix4fv(this["u_ModelToWorldSpace"], false, transform.LocalToWorldMatrix());
        gl.uniformMatrix4fv(this["u_ModelNormalMatrix"], false, invNormalMatrix);
        gl.uniform3fv(this["u_ModelScale"], transform.localScale);
    }

    SP_NINE.loadMaterial = function (material) {
        // Query the texture handle from our data
        let textureHandle = tryGetTexture(material.data['texture']);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureHandle);
        gl.uniform1i(this["u_Texture"], 0);

        gl.uniform1f(this["u_TextureScale"], material.data['scale']);
        gl.uniform1f(this["u_UVCut"], material.data['uv_cut']);

        // Set the model's material
        gl.uniform3fv(this["u_Material.ambient"], material.data['ambient']);
        gl.uniform3fv(this["u_Material.diffuse"], material.data['diffuse']);
        gl.uniform3fv(this["u_Material.specular"], material.data['specular']);
        gl.uniform1f(this["u_Material.specExp"], material.data['n']);
    };

    SP_NINE.build();
};