let ALL_AUDIO_SOURCES = new Set();

class AudioSource {
    constructor(url, volume, transform) {
        this.player = new Audio(url);
        this.volume = volume;
        this.transform = transform;
        this.looping = false;
        this.oneshot = false;

        ALL_AUDIO_SOURCES.add(this);
    }

    setLooping(buffer) {
        this.looping = true;

        this.player.addEventListener("timeupdate", function() {
            if (this.currentTime > this.duration - buffer) {
                this.currentTime = 0;
                this.play();
            }
        });
        return this;
    }

    setOneShot() {
        this.oneshot = true;
        return this;
    }

    reset() {
        this.player.currentTime = 0;
    }

    play() {
        this.player.play();
    }

    pause() {
        this.player.pause();
    }

    setPlaybackRate(rate) {
        this.player.playbackRate = rate;
        return this;
    }

    isPaused() {
        return this.player.paused;
    }

    unregister() {
        this.pause();
        ALL_AUDIO_SOURCES.delete(this);
    }

}

const AUDIO_FALLOFF_DISTANCE = 7;
const AUDIO_FALLOFF_FACTOR = 1.5;
function attenuateSources(camera) {
    let finishedSources = new Set();
    for (const src of ALL_AUDIO_SOURCES) {
        if (src.oneshot && src.player.ended) finishedSources.add(src);

        if (src.transform !== null) {
            const distance = glMatrix.vec3.distance(src.transform.GetWorldPosition(), camera.transform.GetWorldPosition());
            const ratio = distance / AUDIO_FALLOFF_DISTANCE;
            src.player.volume = src.volume * Math.pow(Math.max(1, ratio), -AUDIO_FALLOFF_FACTOR);
        } else {
            src.player.volume = src.volume;
        }
    }

    for (const src of finishedSources)
        src.unregister();
}