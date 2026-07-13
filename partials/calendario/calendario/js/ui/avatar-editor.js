import { decodeAvatarStrokes, encodeAvatarStrokes } from "../core/avatar.js";

function parseAvatar(profile) {
  if (!profile?.avatar?.strokesJson) return [];
  return decodeAvatarStrokes(profile.avatar.strokesJson) || [];
}

function drawStrokes(context, strokes, size) {
  context.clearRect(0, 0, size, size);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of strokes) {
    if (stroke.points.length < 4) continue;
    context.save();
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color || "#6f58ae";
    context.lineWidth = (stroke.width / 1000) * size;
    context.beginPath();
    context.moveTo((stroke.points[0] / 1000) * size, (stroke.points[1] / 1000) * size);
    for (let index = 2; index < stroke.points.length; index += 2) context.lineTo((stroke.points[index] / 1000) * size, (stroke.points[index + 1] / 1000) * size);
    context.stroke();
    context.restore();
  }
}

export function renderAvatar(element, profile, fallback = "?") {
  element.replaceChildren();
  const strokes = parseAvatar(profile);
  if (!strokes.length) {
    const initial = document.createElement("span");
    initial.className = "avatar-initial";
    initial.textContent = fallback;
    element.append(initial);
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  drawStrokes(canvas.getContext("2d"), strokes, 128);
  element.append(canvas);
}

export class AvatarEditor {
  constructor({ onSave }) {
    this.dialog = document.querySelector("#avatar-dialog");
    this.canvas = document.querySelector("#avatar-canvas");
    this.preview = document.querySelector("#avatar-preview");
    this.context = this.canvas.getContext("2d");
    this.strokes = [];
    this.redoStack = [];
    this.tool = "pen";
    this.profile = null;
    this.onSave = onSave;
    this.bind();
  }

  bind() {
    this.canvas.addEventListener("pointerdown", (event) => this.start(event));
    this.canvas.addEventListener("pointermove", (event) => this.move(event));
    this.canvas.addEventListener("pointerup", (event) => this.end(event));
    this.canvas.addEventListener("pointercancel", (event) => this.end(event));
    document.querySelector("#drawing-pen").addEventListener("click", () => this.setTool("pen"));
    document.querySelector("#drawing-eraser").addEventListener("click", () => this.setTool("eraser"));
    document.querySelector("#drawing-undo").addEventListener("click", () => { if (this.history.length) { this.redoStack.push(structuredClone(this.strokes)); this.strokes = this.history.pop(); this.render(); } });
    document.querySelector("#drawing-redo").addEventListener("click", () => { if (this.redoStack.length) { this.history.push(structuredClone(this.strokes)); this.strokes = this.redoStack.pop(); this.render(); } });
    document.querySelector("#drawing-clear").addEventListener("click", () => { if (this.strokes.length) { this.history.push(structuredClone(this.strokes)); this.strokes = []; this.redoStack = []; this.render(); } });
    document.querySelector("#avatar-save").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const encoded = encodeAvatarStrokes(this.strokes);
      if (!encoded) { document.querySelector("#avatar-error").textContent = "O desenho é demasiado grande mesmo depois da compactação automática. Desfaz apenas alguns traços e tenta novamente."; return; }
      this.strokes = encoded.strokes;
      document.querySelector("#avatar-error").textContent = encoded.tolerance ? `A otimizar o desenho sem perder a forma… (${Math.round(encoded.size / 1024)} KB)` : "";
      button.disabled = true;
      const previous = button.textContent;
      button.textContent = "A guardar…";
      try { await this.onSave({ formatVersion: 1, width: 256, height: 256, strokesJson: encoded.strokesJson }); }
      finally { button.disabled = false; button.textContent = previous; }
    });
  }

  open(profile) {
    this.profile = profile;
    this.strokes = parseAvatar(profile);
    this.history = [];
    this.redoStack = [];
    document.querySelector("#avatar-error").textContent = "";
    this.render();
    this.dialog.showModal();
  }

  setTool(tool) {
    this.tool = tool;
    document.querySelector("#drawing-pen").classList.toggle("button-week", tool === "pen");
    document.querySelector("#drawing-eraser").classList.toggle("button-week", tool === "eraser");
  }

  point(event) {
    const rect = this.canvas.getBoundingClientRect();
    const clamp = (value) => Math.max(0, Math.min(1000, Math.round(value)));
    return [clamp(((event.clientX - rect.left) / rect.width) * 1000), clamp(((event.clientY - rect.top) / rect.height) * 1000)];
  }

  start(event) {
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    const [x, y] = this.point(event);
    this.history.push(structuredClone(this.strokes));
    this.current = { tool: this.tool, color: document.querySelector("#drawing-color").value, width: Number(document.querySelector("#drawing-width").value) * 2, points: [x, y, x + 1, y + 1] };
    this.strokes.push(this.current);
    this.redoStack = [];
    this.render();
  }

  move(event) {
    if (!this.current || !this.canvas.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const [x, y] = this.point(event);
    const points = this.current.points;
    const dx = x - points.at(-2); const dy = y - points.at(-1);
    if (dx * dx + dy * dy >= 16) { points.push(x, y); this.render(); }
  }

  end(event) {
    if (!this.current) return;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.current = null;
  }

  render() {
    drawStrokes(this.context, this.strokes, this.canvas.width);
    const previewContext = this.preview.getContext("2d");
    previewContext.save();
    previewContext.beginPath(); previewContext.arc(128, 128, 128, 0, Math.PI * 2); previewContext.clip();
    drawStrokes(previewContext, this.strokes, 256);
    previewContext.restore();
  }
}
