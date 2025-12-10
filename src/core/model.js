class Material {
    constructor(shader, data) {
        this.shader = shader;
        this.data = data;
    }

    copy(other) {
        this.shader = other.shader;
        for (let key in other.data) {
            this.data[key] = other.data[key];
        }
        return this;
    }

    static clone(other) {
        let m = new Material(other.shader, {});
        m.copy(other);
        return m;
    }
}

class Model {
    constructor(vertices, triangles, attributes, autocenter=false) {
        if (autocenter) {
            let center = glMatrix.vec3.create();
            for (const v of vertices) {
                glMatrix.vec3.add(center, center, v);
            }
            glMatrix.vec3.localScale(center, center, 1 / vertices.length);

            this.vertices = [];
            let vertexArray = [];
            for (const v of vertices) {
                const adjustedV = glMatrix.vec3.sub(glMatrix.vec3.create(), v, center);

                this.vertices.push([adjustedV[0], adjustedV[1], adjustedV[2]]);
                vertexArray.push(adjustedV[0], adjustedV[1], adjustedV[2]);
            }

            this.vertexBuffer = new Float32Array(vertexArray);
        } else {
            this.vertices = vertices;
            this.vertexBuffer = new Float32Array(vertices.flat());
        }
        this.vertexCount = vertices.length;

        this.attributes = attributes;

        this.triangles = triangles;
        this.triangleBuffer = new Uint16Array(triangles.flat());
        this.triangleCount = triangles.length;

        // Set up attributes
        for (const attrib in attributes) {
            this[attrib + "Buffer"] = new Float32Array(attributes[attrib].flat());
        }
    }

    static fromOBJ(dataURL, autocenter=false) {
        const objData = getOBJFile(dataURL, "model");
        const convertedData = OBJ_to_JSON(objData);

        const model = new Model(
            convertedData.vertices,
            convertedData.triangles,
            {
                normal: convertedData.normals,
                uv: convertedData.uvs
            },
            autocenter
        );

        return model;
    }

    calculateTangents() {
        if (!('normal' in this.attributes)) throw "Tried to compute tangent on model without normals";
        if (!('uv' in this.attributes)) throw "Tried to compute tangent on model without uvs";

        let tan1 = new Array(this.vertexCount);
        let tan2 = new Array(this.vertexCount);

        for (let i = 0; i < this.vertexCount; i++) {
            tan1[i] = glMatrix.vec3.create();
            tan2[i] = glMatrix.vec3.create();
        }

        for (const t of this.triangles) {
            const i0 = t[0];
            const i1 = t[1];
            const i2 = t[2];
            
            const v0 = this.vertices[i0];
            const v1 = this.vertices[i1];
            const v2 = this.vertices[i2];
            
            const w0 = this.attributes.uv[i0];
            const w1 = this.attributes.uv[i1];
            const w2 = this.attributes.uv[i2];

            const x1 = v1[0] - v0[0];
            const x2 = v2[0] - v0[0];
            const y1 = v1[1] - v0[1];
            const y2 = v2[1] - v0[1];
            const z1 = v1[2] - v0[2];
            const z2 = v2[2] - v0[2];

            const s1 = w1[0] - w0[0];
            const s2 = w2[0] - w0[0];
            const t1 = w1[1] - w0[1];
            const t2 = w2[1] - w0[1];

            const r = 1 / (s1 * t2 - s2 * t1);
            const sdir = glMatrix.vec3.fromValues((t2 * x1 - t1 * x2) * r, (t2 * y1 - t1 * y2) * r,
                (t2 * z1 - t1 * z2) * r);
            const tdir = glMatrix.vec3.fromValues((s1 * x2 - s2 * x1) * r, (s1 * y2 - s2 * y1) * r,
                (s1 * z2 - s2 * z1) * r);

            glMatrix.vec3.add(tan1[i0], tan1[i0], sdir);
            glMatrix.vec3.add(tan1[i1], tan1[i1], sdir);
            glMatrix.vec3.add(tan1[i2], tan1[i2], sdir);

            glMatrix.vec3.add(tan2[i0], tan2[i0], tdir);
            glMatrix.vec3.add(tan2[i1], tan2[i1], tdir);
            glMatrix.vec3.add(tan2[i2], tan2[i2], tdir);
        }

        this.attributes.tangent = new Array(this.vertexCount);

        for (let i = 0; i < this.vertexCount; i++)
        {
            const n = this.attributes.normal[i];
            const t = tan1[i];

            // Gram-Schmidt orthogonalize
            const x = glMatrix.vec3.dot(n, t);
            this.attributes.tangent[i] = [0, 0, 0];
            glMatrix.vec3.sub(this.attributes.tangent[i],
                t,
                glMatrix.vec3.scale(glMatrix.vec3.create(), n, x));
            glMatrix.vec3.normalize(this.attributes.tangent[i], this.attributes.tangent[i]);

            // Calculate handedness
            const bitangent = glMatrix.vec3.cross(glMatrix.vec3.create(), n, t);
            const handedness = glMatrix.vec3.dot(bitangent, tan2[i]);
            if (handedness < 0) {
                glMatrix.vec3.scale(this.attributes.tangent[i], this.attributes.tangent[i], -1);
            }
            // tangent[i].w = (Dot(Cross(n, t), tan2[a]) < 0.0F) ? -1.0F : 1.0F;
        }

        this.tangentBuffer = new Float32Array(this.attributes.tangent.flat());

        return this;
    }
}

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try

    catch(e) {
        console.log(e);
        return(String.null);
    }
}

// get the OBJ file from the passed URL
function getOBJFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getOBJFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return httpReq.response;
        } // end if good params
    } // end try

    catch(e) {
        console.log(e);
        return(String.null);
    }
}

function OBJ_to_JSON(objData) {
    let verticesTEMP = [];
    let normalsTEMP = [];
    let uvsTEMP = [];

    let triangles = [];
    let vFinal = [];
    let nFinal = [];
    let tFinal = [];

    let vertex_mapping = {};

    for (let line of objData.split('\n')) {
        line = line.split(' ');
        if (line[0] === "v") {
            // Defining a vertex
            verticesTEMP.push([
                Number(line[1]),
                Number(line[2]),
                Number(line[3])
            ]);
        } else if (line[0] === "vt") {
            // Defining a normal
            uvsTEMP.push([
                Number(line[1]),
                Number(line[2])
            ]);
        } else if (line[0] === "vn") {
            // Defining a normal
            normalsTEMP.push([
                Number(line[1]),
                Number(line[2]),
                Number(line[3])
            ]);
        } else if (line[0] === "f") {
            // Defining a face
            // Loop over the index groups
            let vIdxs = [];

            for (const idxgroup of line.slice(1)) {
                if (idxgroup in vertex_mapping) {
                    vIdxs.push(vertex_mapping[idxgroup]);
                    continue;
                }

                const idxs = idxgroup.split('/');
                const vidx = Number(idxs[0]) - 1;
                let tidx = null;
                let nidx = null;

                if (idxs.length >= 2 && idxs[1] !== "") {
                    tidx = Number(idxs[1]) - 1;
                }

                if (idxs.length === 3) {
                    nidx = Number(idxs[2]) - 1;
                }

                vertex_mapping[idxgroup] = vFinal.length;

                vFinal.push(verticesTEMP[vidx]);
                nFinal.push(normalsTEMP[nidx]);
                tFinal.push(uvsTEMP[tidx]);

                vIdxs.push(vertex_mapping[idxgroup])
            }

            triangles.push(vIdxs);
        }
    }

    // Assign the normals to the vertices

    return {
        vertices: vFinal,
        normals: nFinal,
        uvs: tFinal,
        triangles: triangles
    }
}