class Animation {
    constructor(material, framecount, framerate) {
        this.material = material; // the material that will be animated
        this.frameCount = framecount;

        this.secondsPerFrame = 1 / framerate;
        this.timer = 0;

        this.currentFrame = 0;

        this.material.data['scale'] = [1 / framecount, 1];
        this.material.data['offset'] = [0, 0];

        this.playing = false;
        this.onComplete = () => {};
    }

    play() {
        this.playing = true;
    }

    reset() {
        this.playing = false;
        this.currentFrame = 0;
        this.timer = 0;
    }

    update() {
        if (!this.playing) return;

        this.timer += DELTA_TIME;
        if (this.timer < this.secondsPerFrame)
            return;

        this.timer -= this.secondsPerFrame;

        this.currentFrame++;

        if (this.currentFrame >= this.frameCount) {
            this.reset();
            this.onComplete();
        } else {
            this.material.data['offset'] = [this.currentFrame, 0];
        }
    }
}