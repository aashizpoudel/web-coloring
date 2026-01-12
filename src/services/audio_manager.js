
export const AudioManager = {
    audio: null,
    volume: 0.5,
    currentTrack: null,
    tracks: {},

    init(defaultUrl) {
        this.currentTrack = 'default';
        this.tracks = { default: defaultUrl };
        this.audio = new Audio(defaultUrl);
        this.audio.loop = true;
        this.audio.volume = this.volume;
    },

    addTrack(name, url) {
        this.tracks[name] = url;
    },

    switchTrack(name) {
        if (name === 'none') {
            if (this.audio) {
                this.audio.pause();
                this.audio.currentTime = 0;
            }
            this.currentTrack = 'none';
            return;
        }

        if (!this.tracks[name]) return;

        const wasPlaying = this.audio && !this.audio.paused;
        const wasMuted = this.audio ? this.audio.muted : false;

        // Stop current audio
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }

        // Create new audio
        this.audio = new Audio(this.tracks[name]);
        this.audio.loop = true;
        this.audio.volume = this.volume;
        this.audio.muted = wasMuted;
        this.currentTrack = name;

        // Resume if was playing, UNLESS we are switching from 'none' to a track
        // In that case, we should probably play?
        // Logic: specific request to switch track implies desire to hear it.
        // But if we were previously 'none', wasPlaying is false.

        if (wasPlaying || this.currentTrack !== 'none') {
            this.play();
        }
    },

    getCurrentTrack() {
        return this.currentTrack;
    },

    getTrackNames() {
        return Object.keys(this.tracks);
    },

    play() {
        if (this.currentTrack === 'none') return;
        if (this.audio) {
            this.audio.play().catch(e => console.log("Audio play failed (user interaction needed):", e));
        }
    },

    pause() {
        if (this.audio) {
            this.audio.pause();
        }
    },

    toggle() {
        if (this.audio.paused) this.play();
        else this.pause();
    },

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    },

    getVolume() {
        return this.volume;
    },

    volumeUp() {
        this.setVolume(this.volume + 0.1);
    },

    volumeDown() {
        this.setVolume(this.volume - 0.1);
    },

    mute() {
        if (this.audio) {
            this.audio.muted = !this.audio.muted;
            return this.audio.muted;
        }
        return false;
    },

    isMuted() {
        return this.audio ? this.audio.muted : false;
    }
};
