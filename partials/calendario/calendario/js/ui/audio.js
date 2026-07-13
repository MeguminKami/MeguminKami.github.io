export class SoundPlayer {
  constructor(enabled = true) { this.enabled = enabled; this.context = null; }
  setEnabled(value) { this.enabled = Boolean(value); }
  play(kind = "save") {
    if (!this.enabled) return;
    try {
      this.context ||= new AudioContext();
      const frequencies = { save: [523, 659], cancel: [392, 330], remove: [294, 220] }[kind] || [440];
      const now = this.context.currentTime;
      frequencies.forEach((frequency, index) => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * .07);
        gain.gain.exponentialRampToValueAtTime(.025, now + index * .07 + .01);
        gain.gain.exponentialRampToValueAtTime(.0001, now + index * .07 + .13);
        oscillator.connect(gain).connect(this.context.destination);
        oscillator.start(now + index * .07);
        oscillator.stop(now + index * .07 + .15);
      });
    } catch { /* O som nunca deve bloquear uma ação. */ }
  }
}
