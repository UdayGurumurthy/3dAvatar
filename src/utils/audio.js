// src/audio/AudioManager.js
import { Howl } from "howler";

class AudioManager {
  constructor() {
    this.currentSound = null;
    this.queueList = [];
    this.onEndCallback = null;
  }

  // Play a specific audio immediately
  play(fileName, { loop = false } = {}) {
    this._stopCurrent();

    const sound = new Howl({
      src: [`/audio/${fileName}.mp3`],
      html5: true,
      loop,
      volume: 1.0,
    });

    this.currentSound = sound;

    sound.on("end", () => {
      if (this.onEndCallback) this.onEndCallback(fileName);
      this._playNextInQueue();
    });

    sound.play();
  }

  // Add next audio to queue
  queue(fileName) {
    this.queueList.push(fileName);
  }

  // Clear everything
  stop() {
    this._stopCurrent();
    this.queueList = [];
  }

  // Fade out and stop
  fadeOut(duration = 600) {
    if (this.currentSound) {
      this.currentSound.fade(1, 0, duration);
      setTimeout(() => this._stopCurrent(), duration);
    }
  }

  onEnd(callback) {
    this.onEndCallback = callback;
  }

  // PRIVATE
  _stopCurrent() {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound = null;
    }
  }

  _playNextInQueue() {
    if (this.queueList.length === 0) return;

    const nextFile = this.queueList.shift();
    this.play(nextFile);
  }
}

export default new AudioManager();
