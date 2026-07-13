const MOTIFS = ["♡", "✦", "✿", "☾", "☕", "☆", "❀", "⌁", "amor", "✨", "♧", "🎁"];

export function createBackground(container) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = reduced ? 10 : 18;
  for (let index = 0; index < count; index += 1) {
    const item = document.createElement("span");
    item.className = "floating-motif";
    item.textContent = MOTIFS[index % MOTIFS.length];
    item.style.left = `${(index * 37 + Math.random() * 20) % 100}%`;
    item.style.top = reduced ? `${(index * 23) % 95}%` : `${105 + Math.random() * 25}%`;
    item.style.setProperty("--size", `${14 + Math.random() * 24}px`);
    item.style.setProperty("--duration", `${19 + Math.random() * 18}s`);
    item.style.setProperty("--delay", `${-Math.random() * 32}s`);
    item.style.setProperty("--drift", `${-70 + Math.random() * 140}px`);
    item.style.setProperty("--rotate", `${-160 + Math.random() * 320}deg`);
    container.append(item);
  }
  document.addEventListener("visibilitychange", () => container.getAnimations({ subtree: true }).forEach((animation) => document.hidden ? animation.pause() : animation.play()));
}
