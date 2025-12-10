/* GLOBAL CONSTANTS AND VARIABLES */

/* webgl globals */
let gl = null; // the all powerful gl object. It's all here folks!

/* shader buffers */
let GL_VERTEX_BUFFER;
let GL_NORMAL_BUFFER;
let GL_UV_BUFFER;
let GL_TANGENT_BUFFER;
let GL_TRIANGLE_BUFFER;

// RENDER CACHING
let GL_CURRENT_MATERIAL = null;
let GL_CURRENT_MODEL = null;

let GL_TEXTURES = {};

let GL_DEPTH_FRAMEBUFFER;
let GL_DEPTH_TEXTURE;

// set up the webGL environment
function setupWebGL(canvas) {

    // Get the canvas and context
    gl = canvas.getContext("webgl"); // get a webgl object from it

    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }

        // initialize shader buffers
        GL_VERTEX_BUFFER = gl.createBuffer();
        GL_NORMAL_BUFFER = gl.createBuffer();
        GL_UV_BUFFER = gl.createBuffer();
        GL_TANGENT_BUFFER = gl.createBuffer();
        GL_TRIANGLE_BUFFER = gl.createBuffer();

        // Set up testing texture
        const testTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, testTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            16,
            16,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            COMMON_TEXTURE_TEST0
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);

        GL_TEXTURES["Test0"] = testTexture;

        // Depth buffer?
        const ext = gl.getExtension("WEBGL_depth_texture")

        GL_DEPTH_FRAMEBUFFER = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, GL_DEPTH_FRAMEBUFFER);

        COLOR_TEXTURE = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, COLOR_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, COLOR_TEXTURE, 0);


        GL_DEPTH_TEXTURE = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, GL_DEPTH_TEXTURE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.DEPTH_COMPONENT,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            0,
            gl.DEPTH_COMPONENT,
            gl.UNSIGNED_SHORT,
            null,
        );

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, GL_DEPTH_TEXTURE, 0);
        // */


        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`Framebuffer is not complete: ${status}`);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // flip texture cause webgl stupid
    } // end try

    catch(e) {
        console.log(e);
    } // end catch

} // end setupWebGL

function getTexture(textureName) {
    if (!(textureName in GL_TEXTURES)) return null;

    return GL_TEXTURES[textureName];
}

function loadTexture(url, callback, options) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width,
        height,
        border,
        srcFormat,
        srcType,
        pixel,
    );

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
        console.log("Loaded " + url);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            image,
        );

        // WebGL1 has different requirements for power of 2 images
        // vs. non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        if (options !== undefined) {

            if (options['wrap'] === true) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            }

            if (options['mag_filter'] === "point") {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            }
        }

        if (callback !== undefined) {
            callback();
        }
    };
    image.src = url;

    GL_TEXTURES[url] = texture;

    return texture;
}

function tryGetTexture(url) {
    if (url in GL_TEXTURES) return getTexture(url);
    return loadTexture(url);
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

function clearScreen() {
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
}

function resetShader() {
    GL_CURRENT_SHADER = null;
}

function bindDepthRender() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, GL_DEPTH_FRAMEBUFFER);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function unbindDepthRender() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function loadMaterial(material, scene) {
    if (GL_CURRENT_MATERIAL === material) return;

    let lastShader = null;
    if (GL_CURRENT_MATERIAL !== null)
        lastShader = GL_CURRENT_MATERIAL.shader;

    GL_CURRENT_MATERIAL = material;

    // Switch out shader program if necessary
    if (lastShader !== GL_CURRENT_MATERIAL.shader) {
        if (lastShader !== null)
            lastShader.unloadAttributes();
        gl.useProgram(GL_CURRENT_MATERIAL.shader.program);

        GL_CURRENT_MATERIAL.shader.configGL();
        GL_CURRENT_MATERIAL.shader.loadLight(scene.light);
        GL_CURRENT_MATERIAL.shader.loadCamera(scene.camera);
        GL_CURRENT_MATERIAL.shader.prepareAttributes();
    }

    // Load new material data
    GL_CURRENT_MATERIAL.shader.loadMaterial(material);
}

function renderObject(object) {
    if (GL_CURRENT_MODEL !== object.model) {
        GL_CURRENT_MODEL = object.model;

        // vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, GL_VERTEX_BUFFER); // bind active buffer
        gl.bufferData(gl.ARRAY_BUFFER, GL_CURRENT_MODEL.vertexBuffer, gl.STATIC_DRAW); // send vertex data to GPU

        // vertex normal buffer
        if ('normalBuffer' in GL_CURRENT_MODEL) {
            gl.bindBuffer(gl.ARRAY_BUFFER, GL_NORMAL_BUFFER); // bind active buffer
            gl.bufferData(gl.ARRAY_BUFFER, GL_CURRENT_MODEL.normalBuffer, gl.STATIC_DRAW); // send normal data to GPU
        }

        if ('tangentBuffer' in GL_CURRENT_MODEL) {
            gl.bindBuffer(gl.ARRAY_BUFFER, GL_TANGENT_BUFFER); // bind active buffer
            gl.bufferData(gl.ARRAY_BUFFER, GL_CURRENT_MODEL.tangentBuffer, gl.STATIC_DRAW); // send tangent data to GPU
        }

        if ('uvBuffer' in GL_CURRENT_MODEL) {
            gl.bindBuffer(gl.ARRAY_BUFFER, GL_UV_BUFFER);
            gl.bufferData(gl.ARRAY_BUFFER, GL_CURRENT_MODEL.uvBuffer, gl.STATIC_DRAW);
        }

        // Draw model
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GL_TRIANGLE_BUFFER);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, GL_CURRENT_MODEL.triangleBuffer, gl.STATIC_DRAW);
    }

    GL_CURRENT_MATERIAL.shader.loadTransform(object.transform);
    gl.drawElements(gl.TRIANGLES, 3 * GL_CURRENT_MODEL.triangleCount, gl.UNSIGNED_SHORT, 0); // render
}

function renderBox(collider) {
    let vertices = new Float32Array(collider.getLocalPoints().flat());

    gl.bindBuffer(gl.ARRAY_BUFFER, GL_VERTEX_BUFFER);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GL_TRIANGLE_BUFFER);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 3, 2]), gl.STATIC_DRAW);

    GL_CURRENT_MATERIAL.shader.loadTransform(collider.transform);
    gl.drawElements(gl.LINE_LOOP, 4, gl.UNSIGNED_BYTE, 0);

    GL_CURRENT_MODEL = null; // clear cache
}

function renderCircle(collider) {
    let vertices = new Float32Array(collider.getLocalPoints().flat());

    gl.bindBuffer(gl.ARRAY_BUFFER, GL_VERTEX_BUFFER);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GL_TRIANGLE_BUFFER);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), gl.STATIC_DRAW);

    GL_CURRENT_MATERIAL.shader.loadTransform(collider.transform);
    gl.drawElements(gl.LINE_LOOP, 8, gl.UNSIGNED_BYTE, 0);

    GL_CURRENT_MODEL = null; // clear cache
}
