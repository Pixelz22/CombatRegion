class ShaderAttribute {
    constructor(destName, srcBuffer, attribSize, attribType) {
        this.destName = destName;
        this.srcBuffer = srcBuffer;
        this.size = attribSize;
        this.type = attribType;
        this.handle = null;
    }
}

class Shader {
    constructor() {
        // These variables should be set prior to the build process
        this.vShaderCode = ""
        this.fShaderCode = ""
        this.attributes = [] // array of ShaderAttributes
        this.uniformNames = [] // array of strings

        // These functions are meant to be overridden.
        // They'll be called by the rasterizer when a change
        // to each happens
        this.configGL = function() {};
        this.loadMaterial = function(material) {}
        this.loadTransform = function(transform) {};
        this.loadCamera = function(camera) {};
        this.loadLight = function(light) {};

        // These will be initialized during the build process
        this.vShader = null;
        this.fShader = null;
        this.program = null;

        // Additional flags for rendering logic
        this.transparent = false;
    }

    prepareAttributes() {
        for (let attrib of this.attributes) {
            gl.bindBuffer(gl.ARRAY_BUFFER, attrib.srcBuffer);
            gl.enableVertexAttribArray(attrib.handle);
            gl.vertexAttribPointer(attrib.handle, attrib.size, attrib.type, false, 0, 0);
        }
    }

    unloadAttributes() {
        for (let attrib of this.attributes) {
            gl.disableVertexAttribArray(attrib.handle);
        }
    }

    build() {
        this.vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.vShader, this.vShaderCode);
        gl.compileShader(this.vShader);

        this.fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.fShader, this.fShaderCode);
        gl.compileShader(this.fShader);

        if (!gl.getShaderParameter(this.vShader, gl.COMPILE_STATUS)) {
            let logData = gl.getShaderInfoLog(this.vShader);
            gl.deleteShader(this.vShader);
            throw "error during vertex shader compile: " + logData;
        }

        if (!gl.getShaderParameter(this.fShader, gl.COMPILE_STATUS)) {
            let logData = gl.getShaderInfoLog(this.fShader);
            gl.deleteShader(this.fShader);
            throw "error during fragment shader compile: " + logData;
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vShader);
        gl.attachShader(this.program, this.fShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            let logData = gl.getProgramInfoLog(this.program);
            throw "error during shader linking: " + logData;
        }

        for (let attrib of this.attributes) {
            attrib.handle = gl.getAttribLocation(this.program, attrib.destName);
        }

        for (let name of this.uniformNames) {
            if (name in this) {
                throw "tried to redefine property '" + name + "' in shader";
            }
            this[name] = gl.getUniformLocation(this.program, name);

            if (this[name] === null) {
                throw "tried to bind non-existent uniform '" + name + "' in shader";
            }
        }
    }
}
