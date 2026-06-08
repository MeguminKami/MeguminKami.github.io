export function showPopup(message, type = "info") {
  const popup = document.getElementById("popup-notification");
  if (!popup) {
    return;
  }

  popup.textContent = message;
  popup.className = `popup show ${type}`;
  popup.style.top = "80px";
  popup.style.opacity = "1";

  window.setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.top = "50px";

    window.setTimeout(() => {
      popup.className = "popup hidden";
    }, 500);
  }, 900);
}
