let SP_BLINN_PHONG = new Shader();

SP_BLINN_PHONG.init = function() {

    SP_BLINN_PHONG.attributes = [
        new ShaderAttribute("vertexPosition", GL_VERTEX_BUFFER, 3, gl.FLOAT),
        new ShaderAttribute("vertexNormal", GL_NORMAL_BUFFER, 3, gl.FLOAT),
    ];

    SP_BLINN_PHONG.uniformNames = [
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
        // Light properties
        "u_Light.direction",
        "u_Light.ambient",
        "u_Light.diffuse",
        "u_Light.specular",
    ];

    SP_BLINN_PHONG.vShaderCode = `
    precision mediump float;
    
    attribute vec3 vertexPosition;
    attribute vec3 vertexNormal;
    
    uniform mat4 u_WorldToViewSpace;
    uniform mat4 u_ModelToWorldSpace;
    uniform mat4 u_ModelNormalMatrix;

    varying vec3 worldPos;
    varying vec3 worldNormal;
    varying vec4 debug;
    void main(void) {
        worldPos = vec3(u_ModelToWorldSpace * vec4(vertexPosition, 1.0));
        gl_Position = u_WorldToViewSpace * vec4(worldPos, 1.0);
        debug = gl_Position;
        
        worldNormal = normalize(vec3(u_ModelNormalMatrix * vec4(vertexNormal, 0.0))); // pass vertex normal to fragment shader
    }
`;

    SP_BLINN_PHONG.fShaderCode = `
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
    
    varying vec3 worldPos;
    varying vec3 worldNormal;
    varying vec4 debug;
    void main(void) {
        vec3 viewRay = normalize(u_EyePosition - worldPos);
        
        vec3 color = u_Material.ambient * u_Light.ambient;
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
        float diffuseFudging = 0.1;
        float remappedAngle = -0.5 * dot(worldNormal, lightRay) + 0.5;
        diffuseIntensity = (diffuseIntensity + remappedAngle * diffuseFudging) / (1.0 + diffuseFudging);
        color += diffuseIntensity * u_Material.diffuse * u_Light.diffuse;
        
        /* Debugging
        color = u_Material.specular;
        // */
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

    SP_BLINN_PHONG.configGL = function () {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    };

    SP_BLINN_PHONG.loadLight = function (light) {
        gl.uniform3fv(this["u_Light.direction"], light.direction);
        gl.uniform3fv(this["u_Light.ambient"], light.ambient);
        gl.uniform3fv(this["u_Light.diffuse"], light.diffuse);
        gl.uniform3fv(this["u_Light.specular"], light.specular);
    };

    SP_BLINN_PHONG.loadCamera = function (camera) {
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

    SP_BLINN_PHONG.loadTransform = function (transform) {
        transform.updateMatrices();

        let invNormalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), transform.WorldToLocalMatrix());

        // Set the model's transform matrix
        gl.uniformMatrix4fv(this["u_ModelToWorldSpace"], false, transform.LocalToWorldMatrix());
        gl.uniformMatrix4fv(this["u_ModelNormalMatrix"], false, invNormalMatrix);
    }

    SP_BLINN_PHONG.loadMaterial = function (material) {
        // Set the model's material
        gl.uniform3fv(this["u_Material.ambient"], material.data['ambient']);
        gl.uniform3fv(this["u_Material.diffuse"], material.data['diffuse']);
        gl.uniform3fv(this["u_Material.specular"], material.data['specular']);
        gl.uniform1f(this["u_Material.specExp"], material.data['n']);
    };

    SP_BLINN_PHONG.build();
};