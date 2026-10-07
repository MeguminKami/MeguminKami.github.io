import test from "node:test";
import assert from "node:assert/strict";
import { SoundPlayer } from "../js/ui/audio.js";

test("desbloqueia e retoma o áudio num gesto antes das operações assíncronas", async (t) => {
  const original = globalThis.AudioContext;
  const contexts = [];
  class FakeAudioContext {
    constructor() { this.state = "suspended"; this.resumeCalls = 0; this.currentTime = 0; this.destination = {}; contexts.push(this); }
    async resume() { this.resumeCalls += 1; this.state = "running"; }
    createOscillator() { return { type: "", frequency: { value: 0 }, connect: () => ({ connect: () => {} }), start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect: () => {} }) }; }
  }
  globalThis.AudioContext = FakeAudioContext;
  t.after(() => { if (original === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = original; });

  const target = new EventTarget();
  const player = new SoundPlayer(true);
  player.bindUnlock(target);
  target.dispatchEvent(new Event("pointerdown"));
  await Promise.resolve();
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].resumeCalls, 1);
  contexts[0].state = "suspended";
  assert.equal(await player.resume(), true);
  assert.equal(contexts[0].resumeCalls, 2);
});

test("não cria AudioContext quando os sons estão desligados", async (t) => {
  const original = globalThis.AudioContext;
  let created = 0;
  globalThis.AudioContext = class { constructor() { created += 1; } };
  t.after(() => { if (original === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = original; });
  const player = new SoundPlayer(false);
  assert.equal(await player.unlock(), false);
  player.play();
  assert.equal(created, 0);
});
