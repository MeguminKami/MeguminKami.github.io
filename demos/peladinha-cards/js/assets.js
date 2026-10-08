export const ASSET_PATHS = Object.freeze({
  avatar: "./assets/default-avatar.svg",
  logo: "./assets/logo.svg",
  cards: "./assets/cards/",
  backgrounds: "./assets/backgrounds/",
  icons: "./assets/icons/",
});
export const safeImage = (url) =>
  /^(https?:\/\/|\.\/assets\/)/i.test(url || "") ? url : ASSET_PATHS.avatar;
