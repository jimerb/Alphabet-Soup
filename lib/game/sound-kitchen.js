export class SoundKitchen {
  constructor(hornUrl, levelUpUrl, musicUrl) {
    this.ctx = null;
    this.effects = null;
    this.volume = 0;
    this.hornUrl = hornUrl;
    this.horn = null;
    this.levelUpUrl = levelUpUrl;
    this.levelUp = null;
    this.musicUrl = musicUrl;
    this.music = null;
  }
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.effects = this.ctx.createGain();
      this.effects.gain.value = this.volume;
      this.effects.connect(this.ctx.destination);
      this.horn = new Audio(this.hornUrl);
      this.horn.preload = 'auto';
      this.horn.volume = this.volume * 0.65;
      if (this.levelUpUrl) {
        this.levelUp = new Audio(this.levelUpUrl);
        this.levelUp.preload = 'auto';
        this.levelUp.volume = this.volume;
      }
      if (this.musicUrl) {
        this.music = new Audio(this.musicUrl);
        this.music.preload = 'auto';
        this.music.loop = true;
        this.music.volume = 0.1;
      }
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
  }
  setEffects(sound, muted) {
    this.volume = muted ? 0 : Math.max(0, Math.min(1, sound / 100));
    if (this.effects) this.effects.gain.value = this.volume;
    if (this.horn) {
      this.horn.volume = this.volume * 0.65;
      if (!this.volume) this.stopHorn();
    }
    if (this.levelUp) {
      this.levelUp.volume = this.volume;
      if (!this.volume) this.stopLevelUp();
    }
  }
  setMusic(music, muted) {
    const volume = muted ? 0 : Math.max(0, Math.min(1, music / 100));
    if (!this.music) return;
    this.music.volume = volume;
    if (volume) this.music.play().catch(() => {});
    else this.music.pause();
  }
  note(f, v, d = 0.18, type = 'sine', delay = 0, effect = false) {
    if (!this.ctx || !v || (effect && !this.volume)) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    const when = c.currentTime + delay;
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(v * 0.15, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    o.connect(g);
    g.connect(effect ? this.effects : c.destination);
    o.onended = () => { o.disconnect(); g.disconnect(); };
    o.start(when);
    o.stop(when + d + 0.03);
  }
  scoreTick(progress) {
    this.note(620 + progress * 380, 0.18, 0.06, 'sine', 0, true);
  }
  plop(delay = 0) {
    if (!this.ctx || !this.volume) return;
    const c = this.ctx, when = c.currentTime + delay;
    const oscillator = c.createOscillator(), gain = c.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(340, when);
    oscillator.frequency.exponentialRampToValueAtTime(85, when + 0.13);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.035, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    oscillator.connect(gain); gain.connect(this.effects);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(when); oscillator.stop(when + 0.18);
  }
  singe() {
    if (!this.ctx || !this.volume) return;
    const c = this.ctx, duration = 0.22;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(900, c.currentTime + duration);
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.075, c.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.effects);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(); source.stop(c.currentTime + duration);
  }
  play(kind) {
    if (!this.volume) return;
    if (kind === 'singe') return this.singe();
    if (kind === 'level-up') {
      if (!this.levelUp) return;
      this.levelUp.currentTime = 0;
      this.levelUp.play().catch(() => {});
      return;
    }
    if (kind === 'bonus') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this.note(f, 0.5, 0.38, 'sine', i * 0.095, true));
    } else if (kind === 'loss') {
      if (!this.horn) return;
      this.horn.currentTime = 0;
      this.horn.play().catch(() => {});
    } else {
      this.note(kind === 'invalid' ? 140 : 330, 0.65, 0.12, 'sine', 0, true);
    }
  }
  stopHorn() {
    if (this.horn) { this.horn.pause(); this.horn.currentTime = 0; }
  }
  stopLevelUp() {
    if (this.levelUp) { this.levelUp.pause(); this.levelUp.currentTime = 0; }
  }
  close() {
    this.stopHorn();
    this.stopLevelUp();
    if (this.music) { this.music.pause(); this.music.currentTime = 0; }
    void this.ctx?.close();
    this.ctx = null;
    this.effects = null;
    this.horn = null;
    this.levelUp = null;
    this.music = null;
  }
}
