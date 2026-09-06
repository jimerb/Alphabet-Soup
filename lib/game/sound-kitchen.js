export class SoundKitchen {
  constructor(hornUrl) {
    this.ctx = null;
    this.effects = null;
    this.volume = 0;
    this.hornUrl = hornUrl;
    this.horn = null;
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
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  setEffects(sound, muted) {
    this.volume = muted ? 0 : Math.max(0, Math.min(1, sound / 100));
    if (this.effects) this.effects.gain.value = this.volume;
    if (this.horn) {
      this.horn.volume = this.volume * 0.65;
      if (!this.volume) this.stopHorn();
    }
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
  close() {
    this.stopHorn();
    void this.ctx?.close();
    this.ctx = null;
    this.effects = null;
    this.horn = null;
  }
}
