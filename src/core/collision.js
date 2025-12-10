class BoxCollider {
    constructor(width, height) {
        this.transform = null;
        this.object = null;
        this.width = width;
        this.height = height;
    }

    getLocalPoints() {
        let p0 = [-this.width/2, 0, -this.height/2];
        let p1 = [this.width/2, 0, -this.height/2];
        let p2 = [-this.width/2, 0, this.height/2];
        let p3 = [this.width/2, 0, this.height/2];

        return [p0, p1, p2, p3];
    }

    getWorldPoints() {
        let points = this.getLocalPoints();

        if (this.transform !== null) {
            this.transform.updateMatrices();

            for (const p of points) {
                p.push(1);
                glMatrix.vec4.transformMat4(p, p, this.transform.LocalToWorldMatrix());
            }
        }

        const p0 = points[0];
        const p1 = points[1];
        const p2 = points[2];
        const p3 = points[3];

        points[0] = [p0[0], 0, p0[2]];
        points[1] = [p1[0], 0, p1[2]];
        points[2] = [p2[0], 0, p2[2]];
        points[3] = [p3[0], 0, p3[2]];

        return points;
    }
}

class CircleCollider {
    constructor(radius) {
        this.transform = null;
        this.radius = radius;
    }

    getLocalPoints() {
        const cornervalue = this.radius / Math.sqrt(2)
        return [
            [-this.radius, 0, 0],
            [-cornervalue, 0, cornervalue],
            [0, 0, this.radius],
            [cornervalue, 0, cornervalue],
            [this.radius, 0, 0],
            [cornervalue, 0, -cornervalue],
            [0, 0, -this.radius],
            [-cornervalue, 0, -cornervalue],
        ];
    }
}

function checkForCollision(box1, box2) {
    if (box1 === box2) return false; // no self-intersection

    box1.transform.updateMatrices();
    box2.transform.updateMatrices();

    let box1Points = box1.getWorldPoints();
    let box2Points = box2.getWorldPoints();

    // transform the box2 points to box1 local space
    for (let p of box2Points) {
        p.push(1); // add fourth component for multiplication
        glMatrix.vec4.transformMat4(p, p, box1.transform.WorldToLocalMatrix());

        // compare to box1 dimensions
        if (p[0] <= box1.width / 2 && p[0] >= -box1.width / 2
            && p[2] <= box1.height / 2 && p[2] >= -box1.height / 2) return true;
    }

    // transform the box1 points to box2 local space
    for (let p of box1Points) {
        p.push(1); // add fourth component for multiplication
        glMatrix.vec4.transformMat4(p, p, box2.transform.WorldToLocalMatrix());

        // compare to box1 dimensions
        if (p[0] <= box2.width / 2 && p[0] >= -box2.width / 2
            && p[2] <= box2.height / 2 && p[2] >= -box2.height / 2) return true;
    }
    return false;
}

function pointInBox(box, point) {
    box.transform.updateMatrices();
    let p = glMatrix.vec3.transformMat4([0, 0, 0], point, box.transform.WorldToLocalMatrix());

    // compare to box1 dimensions
    return p[0] <= box.width / 2 && p[0] >= -box.width / 2
        && p[2] <= box.height / 2 && p[2] >= -box.height / 2;
}

function circleAgainstBoxCollision(circle, box) {
    const origin = [...circle.transform.GetWorldPosition(), 1];
    glMatrix.vec4.transformMat4(origin, origin, box.transform.WorldToLocalMatrix());

    const a = circle.radius / box.transform.localScale[0];
    const b = circle.radius / box.transform.localScale[2];

    const boxHalfwidth = box.width / 2;
    const boxHalfheight = box.height / 2;

    const testx1 = boxHalfwidth - origin[0];
    const testx2 = -boxHalfwidth - origin[0];
    const testy1 = boxHalfheight - origin[2] ;
    const testy2 = -boxHalfheight - origin[2];

    // (y - p_y)^2 = (a^2 - (x - p_x)^2) * b^2 / a^2

    const leftDeterminant = a * a - testx1 * testx1;
    if (leftDeterminant >= 0) {
        const intersectOffset = Math.sqrt(leftDeterminant * (b * b) / (a * a));

        if (Math.abs(origin[2] + intersectOffset) <= boxHalfheight) return true;
        if (Math.abs(origin[2] - intersectOffset) <= boxHalfheight) return true;
    }

    const rightDeterminant = a * a - testx2 * testx2;
    if (rightDeterminant >= 0) {
        const intersectOffset = Math.sqrt(rightDeterminant * (b * b) / (a * a));

        if (Math.abs(origin[2] + intersectOffset) <= boxHalfheight) return true;
        if (Math.abs(origin[2] - intersectOffset) <= boxHalfheight) return true;
    }

    const upDeterminant = b * b - testy1 * testy1;
    if (upDeterminant >= 0) {
        const intersectOffset = Math.sqrt(upDeterminant * (a * a) / (b * b));

        if (Math.abs(origin[0] + intersectOffset) <= boxHalfwidth) return true;
        if (Math.abs(origin[0] - intersectOffset) <= boxHalfwidth) return true;
    }

    const downDeterminant = b * b - testy2 * testy2;
    if (downDeterminant >= 0) {
        const intersectOffset = Math.sqrt(downDeterminant * (a * a) / (b * b));

        if (Math.abs(origin[0] + intersectOffset) <= boxHalfwidth) return true;
        if (Math.abs(origin[0] - intersectOffset) <= boxHalfwidth) return true;
    }

    return false;
}

function boxAgainstRayCollision(box, rayStart, rayDir) {
    box.transform.updateMatrices();

    let localRayStart = glMatrix.vec4.transformMat4(glMatrix.vec4.create(), [...rayStart, 1], box.transform.WorldToLocalMatrix());
    let localRayDir = glMatrix.vec4.transformMat4(glMatrix.vec4.create(), [...rayDir, 0], box.transform.WorldToLocalMatrix());

    // first, check vertical intersections
    let ret = Infinity;
    if (localRayDir[2] != 0) {
        let t0 = (box.height / 2 - localRayStart[2]) / localRayDir[2];
        if (t0 >= 0 && Math.abs(localRayStart[0] + t0 * localRayDir[0]) < box.width / 2)
            ret = Math.min(t0, ret);

        let t1 = (-box.height / 2 - localRayStart[2]) / localRayDir[2];
        if (t1 >= 0 && Math.abs(localRayStart[0] + t1 * localRayDir[0]) < box.width / 2)
            ret = Math.min(t1, ret);
    }

    if (localRayDir[0] !== 0) {
        let t2 = (box.width / 2 - localRayStart[0]) / localRayDir[0];
        if (t2 >= 0 && Math.abs(localRayStart[2] + t2 * localRayDir[2]) < box.height / 2)
            ret = Math.min(t2, ret);

        let t3 = (-box.width / 2 - localRayStart[0]) / localRayDir[0];
        if (t3 >= 0 && Math.abs(localRayStart[2] + t3 * localRayDir[2]) < box.height / 2)
            ret = Math.min(t3, ret);
    }

    if (ret !== Infinity) return ret * glMatrix.vec3.length(rayDir);
    return Infinity;
}