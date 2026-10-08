import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") ||
      "index.html",
  );
  if (!path.startsWith(root) || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".html": "text/html",
      ".css": "text/css",
      ".svg": "image/svg+xml",
    }[extname(path)] || "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(5188, "127.0.0.1", r));
const options = { headless: true };
if (process.platform === "win32") options.channel = "msedge";
const browser = await chromium.launch(options);
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replace(
        "'../../js/utils.js'",
        "'./utils.js'",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  const navigate = async (hash, title) => {
    await page.evaluate((h) => (location.hash = h), hash);
    await page.locator("h1").filter({ hasText: title }).first().waitFor();
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".skeleton-head").count(), 0);
  };
  await page.goto("http://127.0.0.1:5188");
  await page.getByRole("heading", { name: "Melhores da semana" }).waitFor();
  await page.locator("#theme-picker").click();
  assert.equal(await page.locator("[data-interface-theme]").count(), 4);
  for (const id of ["volt", "champions", "ultimate"]) {
    await page.locator(`[data-interface-theme="${id}"]`).click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), id);
    assert.equal(
      await page
        .locator(`[data-interface-theme="${id}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.screenshot({ path: `test-results/theme-${id}.png` });
  }
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("heading", { name: "Melhores da semana" }).waitFor();
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    "ultimate",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#theme-picker").click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator('[data-interface-theme="club"]').click();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    const state = window.__testState;
    state.users.push({
      ...state.users[1],
      uid: "miguel",
      username: "miguel",
      displayName: "Miguel",
    });
    state.initialRatings.push({
      uid: "joao",
      ratings20: { ...state.initialRatings[0].ratings20, pace: 15 },
      completed: true,
    });
    state.initialRatings.push({
      uid: "miguel",
      ratings20: { ...state.initialRatings[0].ratings20, pace: 14 },
      completed: true,
    });
    location.hash = "#/ranking";
  });
  await navigate("#/", "Pedro");
  assert.equal(await page.locator(".podium-place").count(), 3);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    window.__testState.users = window.__testState.users.filter(
      (p) => p.uid !== "miguel",
    );
  });
  await navigate("#/players", "Jogadores");
  await page.locator("#search").fill("nobody");
  await page.getByText("Nenhum jogador encontrado").waitFor();
  await page.locator("#search").fill("");
  await page.locator("a.football-card").first().click();
  await page
    .getByRole("heading", { name: "Pedro", exact: true, level: 1 })
    .waitFor();
  await navigate("#/games", "Jogos");
  await page.getByText("Ainda não existem jogos").waitFor();
  await page.getByRole("link", { name: "Criar jogo" }).first().click();
  await page
    .getByRole("heading", { name: "Criar jogo", exact: true })
    .waitFor();
  await page.locator("[name=title]").fill("Peladinha de teste");
  await page
    .locator('[name="youtubeUrl"]')
    .fill("https://youtu.be/dQw4w9WgXcQ");
  assert.equal(
    await page.locator(".game-video iframe").getAttribute("src"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  await page.locator("[name=scheduledAt]").fill("2026-10-07T20:00");
  await page.locator("[data-uid=pedro][data-assign=teamA]").click();
  await page.locator("[data-uid=joao][data-assign=teamB]").click();
  assert.equal(await page.locator(".team-chip").count(), 2);
  await page.getByRole("button", { name: "Encerrar jogo" }).click();
  await page
    .getByRole("heading", { name: "Peladinha de teste", exact: true })
    .waitFor();
  await navigate("#/game/test-game/feedback", "Avaliar");
  await page.locator("[data-rating=overall]").selectOption("4");
  await page.waitForTimeout(650);
  await navigate("#/missions", "Missões");
  await navigate("#/game/test-game/feedback", "Avaliar");
  assert.equal(await page.locator("[data-rating=overall]").inputValue(), "4");
  for (const k of ["attack", "passing", "defense", "physical"])
    await page.locator(`[data-rating=${k}]`).selectOption("4");
  await page.locator("[data-rating=goalkeeping]").selectOption("na");
  await page.getByRole("button", { name: "Enviar avaliação" }).click();
  await page.getByText("Avaliação enviada", { exact: true }).waitFor();
  await navigate("#/missions/new/joao", "Avaliar João");
  for (const [k, v] of [
    ["pace", 14],
    ["shooting", 16],
    ["passing", 15],
    ["dribbling", 12],
    ["defending", 13],
  ])
    await page.locator(`[data-rating=${k}]`).fill(String(v));
  await page.waitForTimeout(700);
  await navigate("#/missions", "Missões");
  await page.getByText("5 / 12 · 42%").waitFor();
  await navigate("#/missions/new/joao", "Avaliar João");
  assert.equal(await page.locator("[data-rating=pace]").inputValue(), "14");
  await navigate("#/profile/edit", "Editar perfil");
  await page.locator("[name=displayName]").fill("Pedro Silva");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await page
    .getByRole("heading", { name: "Pedro Silva", exact: true, level: 1 })
    .waitFor();
  await page.locator("#bell").click();
  await page.locator("#notification-dropdown").waitFor();
  await page.getByRole("link", { name: "Ver todas", exact: true }).click();
  await page
    .getByRole("heading", { name: "Notificações", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator(".notification.unread").count(), 0);
  await navigate("#/ranking", "Ranking semanal");
  await navigate("#/admin", "A tua liga");
  await navigate("#/admin/cards", "Card Lab");
  await page.locator("[name=ovr]").fill("92");
  for (const theme of ["legend-form", "mvp", "gold-rare", "perfect-five"]) {
    await page.locator("[name=theme]").selectOption(theme);
    assert.equal(await page.locator(`#card-preview .${theme}`).count(), 1);
  }
  await page.locator("[name=theme]").selectOption("custom-test");
  await page.getByRole("button", { name: "Guardar tema experimental" }).click();
  await page.screenshot({
    path: "test-results/card-lab-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [hash, title] of [
    ["#/", "Pedro Silva"],
    ["#/players", "Jogadores"],
    ["#/game/test-game", "Peladinha de teste"],
    ["#/missions", "Missões"],
    ["#/profile", "Pedro Silva"],
    ["#/admin/cards", "Card Lab"],
  ]) {
    await navigate(hash, title);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Overflow mobile: ${hash}`,
    );
    await page.screenshot({
      path: `test-results/mobile-${hash.replace(/[^a-z0-9]/gi, "") || "home"}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(() => {
    window.__testState.users = [];
    window.__testState.games = [];
  });
  await navigate("#/players", "Jogadores");
  await page.getByText("Ainda não existem jogadores para mostrar").waitFor();
  await page.evaluate(() => {
    window.__fail = true;
    location.hash = "#/games";
  });
  await page.getByText("Não foi possível carregar", { exact: true }).waitFor();
  await page.evaluate(() => (window.__fail = false));
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await page.getByText("Ainda não existem jogos", { exact: true }).waitFor();
  await page.locator("#logout").click();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.locator("[name=username]").fill("novo.jogador");
  await page.locator("[name=password]").fill("segredo123");
  await page.locator("[name=confirmPassword]").fill("segredo123");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("[name=displayName]").fill("Novo Jogador");
  await page.locator("[name=birthDate]").fill("1998-05-20");
  await page.locator("[name=heightCm]").fill("178");
  await page.locator("[name=weightKg]").fill("76");
  await page.locator("[name=preferredFoot]").selectOption("right");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("[name=avatar]").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0L8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Criar conta e avaliar" }).click();
  await page
    .getByRole("heading", { name: "Conhece o teu jogo", level: 1 })
    .waitFor();
  for (const k of [
    "pace",
    "shooting",
    "passing",
    "dribbling",
    "defending",
    "physical",
    "goalkeeping",
    "stamina",
    "vision",
    "positioning",
    "teamwork",
    "composure",
  ])
    await page.locator(`[data-rating=${k}]`).fill("15");
  await page.getByRole("button", { name: "Concluir", exact: true }).click();
  await page.getByRole("heading", { name: "Missões", level: 1 }).waitFor();
  await navigate("#/profile", "Novo Jogador");
  await page.getByText("Carta provisória", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "UI: navegação, equipas, feedback, autosave 5/12, perfil, sino, ranking, Card Lab, mobile e empty states passaram.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
