const EMOJI_DATA = [
  ["❤️", "coração vermelho", ["heart", "amor", "coracao"]],
  ["🥰", "cara sorridente com corações", ["smiling_hearts", "apaixonado"]],
  ["😊", "cara sorridente", ["smile", "sorriso"]],
  ["✨", "faíscas", ["sparkles", "brilho"]],
  ["🌷", "tulipa", ["tulip", "flor"]],
  ["☕", "café", ["coffee", "cafe"]],
  ["🎁", "presente", ["gift", "prenda"]],
  ["😂", "cara com lágrimas de alegria", ["joy", "rir", "riso"]],
  ["😍", "cara com olhos de coração", ["heart_eyes", "apaixonada"]],
  ["😘", "cara a mandar beijo", ["kiss", "beijo"]],
  ["🤗", "abraço", ["hug", "abraco"]],
  ["😉", "piscar o olho", ["wink", "piscar"]],
  ["😋", "cara a saborear", ["yum", "delicioso"]],
  ["🥳", "cara em festa", ["partying", "festa"]],
  ["🤔", "cara pensativa", ["thinking", "pensar"]],
  ["😴", "cara a dormir", ["sleeping", "sono"]],
  ["😢", "cara a chorar", ["cry", "triste"]],
  ["😡", "cara zangada", ["angry", "zangado"]],
  ["🫶", "mãos em coração", ["heart_hands", "carinho"]],
  ["💌", "carta de amor", ["love_letter", "mensagem"]],
  ["💍", "anel", ["ring", "casamento"]],
  ["💜", "coração roxo", ["purple_heart"]],
  ["🩷", "coração rosa", ["pink_heart"]],
  ["💚", "coração verde", ["green_heart"]],
  ["🎉", "confetes", ["tada", "celebrar", "festa"]],
  ["🎂", "bolo de aniversário", ["birthday", "bolo", "aniversario"]],
  ["🎬", "cinema", ["movie", "filme"]],
  ["🎵", "música", ["music", "musica"]],
  ["🍿", "pipocas", ["popcorn", "cinema"]],
  ["🔥", "fogo", ["fire", "quente"]],
  ["🌹", "rosa", ["rose", "flor"]],
  ["🌙", "lua crescente", ["moon", "noite", "lua"]],
  ["⭐", "estrela", ["star"]],
  ["☀️", "sol", ["sun", "dia"]],
  ["🌈", "arco-íris", ["rainbow", "arcoiris"]],
  ["🏖️", "praia", ["beach", "ferias"]],
  ["🌲", "árvore", ["tree", "natureza", "arvore"]],
  ["🐶", "cão", ["dog", "cao"]],
  ["🐱", "gato", ["cat"]],
  ["🍕", "pizza", ["comida"]],
  ["🍝", "massa", ["pasta", "comida"]],
  ["🍔", "hambúrguer", ["burger", "hamburguer"]],
  ["🍓", "morango", ["strawberry", "fruta"]],
  ["🍷", "vinho", ["wine", "bebida"]],
  ["🥂", "brinde", ["cheers", "copos"]],
  ["🍰", "fatia de bolo", ["cake", "sobremesa"]],
  ["📚", "livros", ["books", "estudar"]],
  ["💡", "ideia", ["idea", "lampada"]],
  ["📅", "calendário", ["calendar", "data", "calendario"]],
  ["⏰", "despertador", ["alarm", "hora"]],
  ["✅", "concluído", ["check", "feito"]],
  ["👍", "polegar para cima", ["thumbsup", "sim"]],
  ["👏", "aplausos", ["clap", "parabens"]],
  ["🙏", "mãos juntas", ["pray", "obrigado"]],
  ["💪", "força", ["muscle", "forca"]],
  ["🏠", "casa", ["home"]],
  ["🚗", "carro", ["car", "viagem"]],
  ["✈️", "avião", ["plane", "viagem", "aviao"]],
  ["🚆", "comboio", ["train", "viagem"]],
  ["📍", "localização", ["location", "mapa", "localizacao"]],
  ["💻", "computador", ["computer", "trabalho"]],
  ["📞", "telefone", ["phone", "chamada"]],
  ["💬", "mensagem", ["message", "conversa"]],
  ["🎮", "videojogo", ["game", "jogo"]]
];

export const EMOJI_CATALOG = Object.freeze(EMOJI_DATA.map(([emoji, name, aliases]) => Object.freeze({ emoji, name, aliases })));
export const DEFAULT_EMOJIS = Object.freeze(EMOJI_CATALOG.slice(0, 7));

export function findShortcodeContext(value, cursor = value.length) {
  const before = value.slice(0, cursor);
  let complete = false;
  let colon = before.lastIndexOf(":");
  if (colon === before.length - 1) {
    const opening = before.lastIndexOf(":", colon - 1);
    const candidate = opening >= 0 ? before.slice(opening + 1, colon) : "";
    const prefix = opening <= 0 ? "" : before[opening - 1];
    if (candidate && /^[\p{L}\p{N}_+\-]+$/u.test(candidate) && (!prefix || /[\s([{'"!?.,;]/u.test(prefix))) {
      colon = opening;
      complete = true;
    }
  }
  if (colon < 0) return null;
  const prefix = colon === 0 ? "" : before[colon - 1];
  if (prefix && !/[\s([{'"!?.,;]/u.test(prefix)) return null;
  const query = before.slice(colon + 1, complete ? -1 : undefined);
  if (!/^[\p{L}\p{N}_+\-]*$/u.test(query)) return null;
  return { start: colon, end: cursor, query: query.toLocaleLowerCase("pt-PT"), complete };
}

export function searchEmoji(entries, query, limit = 7) {
  const normalize = (value) => String(value).normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-PT");
  const term = normalize(query);
  return entries
    .map((entry) => {
      const fields = [entry.name, entry.annotation, ...(entry.aliases || []), ...(entry.shortcodes || []), ...(entry.tags || [])].filter(Boolean).map(normalize);
      const exact = fields.includes(term);
      const begins = fields.some((field) => field.startsWith(term));
      const contains = fields.some((field) => field.includes(term));
      return { entry, score: exact ? 0 : begins ? 1 : contains ? 2 : 99 };
    })
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || (a.entry.name || a.entry.annotation || "").localeCompare(b.entry.name || b.entry.annotation || "", "pt"))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function replaceShortcode(value, context, emoji) {
  return {
    value: value.slice(0, context.start) + emoji + value.slice(context.end),
    cursor: context.start + emoji.length
  };
}
