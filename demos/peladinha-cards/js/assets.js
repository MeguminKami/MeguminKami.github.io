export const ASSET_PATHS = Object.freeze({
  avatar: "./assets/default-avatar.svg",
  logo: "./assets/logo.svg",
  cards: "./assets/cards/",
  backgrounds: "./assets/backgrounds/",
  icons: "./assets/icons/",
});
export const safeImage = (url) =>
  /^(https?:\/\/|\.\/assets\/)/i.test(url || "") ? url : ASSET_PATHS.avatar;

export const PLAYSTYLE_ICONS = Object.freeze({
  pace: "./assets/playstyle/ps_vel.png",
  shooting: "./assets/playstyle/ps_fin.png",
  passing: "./assets/playstyle/ps_pas.png",
  dribbling: "./assets/playstyle/ps_dri.png",
  defending: "./assets/playstyle/ps_def.png",
  physical: "./assets/playstyle/ps_fis.png",
  goalkeeping: "./assets/playstyle/ps_gr.png",
  stamina: "./assets/playstyle/ps_res.png",
});
