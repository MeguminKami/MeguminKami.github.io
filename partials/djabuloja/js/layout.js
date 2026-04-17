import {
  clearCart,
  getCartSummary,
  getCurrentUser,
  isAdminUser,
  isAuthenticated,
  logoutCurrentUser,
  removeCartItem
} from "./db.js";
import { escapeHtml, formatPrice, redirectTo, setSearchHandoff, toRootUrl } from "./utils.js";

function regularHeaderMarkup() {
  const currentUser = getCurrentUser();
  const authenticated = isAuthenticated();
  const admin = isAdminUser();
  const username = escapeHtml(currentUser?.username ?? "");

  if (admin) {
    return `
      <header>
        <div class="header-left">
          <a href="${toRootUrl("index.html")}"><img src="${toRootUrl("assets/logos/logo_branco.png")}" alt="Djabusabi"></a>
          <a href="${toRootUrl("store/index.html")}">Loja</a>
          <a href="${toRootUrl("admin/index.html?page=productList")}">Administracao</a>
          <div class="search-bar-container">
            <label>
              <input
                type="text"
                name="text"
                class="search-bar"
                id="search-bar"
                placeholder="Escreve aqui o que procuras..."
              >
            </label>
          </div>
        </div>

        <div class="header-right">
          <input type="checkbox" id="toggle-header-menu" style="display: none;">
          <label for="toggle-header-menu" class="background" id="header-background"></label>
          <h3>Modo de administrador</h3>
          <label for="toggle-header-menu" class="header-icon" id="settings-icon"></label>
          <div class="header-menu" id="login-menu">
            <div class="header-menu-top">
              <div style="margin: 20px;">
                <h1 class="header-menu-text-big">Ola ${username}!</h1>
                <p class="header-menu-text-small">Bem vindo ao menu de administrador.</p>
              </div>
              <div class="header-menu-buttons">
                <a href="#" class="sign-up" data-action="logout">Terminar Sessao</a>
              </div>
            </div>

            <div class="header-menu-bot">
              <a href="${toRootUrl("admin/index.html?page=productList")}" class="user-buttons">
                <img src="${toRootUrl("assets/icons/shop-list.png")}" alt="">
                <span>Lista de produtos</span>
              </a>
              <a href="${toRootUrl("admin/index.html?page=productAdd")}" class="user-buttons">
                <img src="${toRootUrl("assets/icons/shop-add.png")}" alt="">
                <span>Adicionar um novo produto</span>
              </a>
              <a href="${toRootUrl("admin/index.html?page=userList")}" class="user-buttons">
                <img src="${toRootUrl("assets/icons/user-list.png")}" alt="">
                <span>Lista de utilizadores</span>
              </a>
              <a href="${toRootUrl("admin/index.html?page=userAdd")}" class="user-buttons">
                <img src="${toRootUrl("assets/icons/user-add.png")}" alt="">
                <span>Adicionar um novo utilizador</span>
              </a>
            </div>

            <div class="header-menu-bot">
              <img src="${toRootUrl("assets/logos/logo_vigo.png")}" alt="" class="logo-img">
            </div>
          </div>
        </div>
      </header>
    `;
  }

  return `
    <header>
      <div class="header-left">
        <a href="${toRootUrl("index.html")}"><img src="${toRootUrl("assets/logos/logo_branco.png")}" alt="Djabusabi"></a>
        <a href="${toRootUrl("store/index.html")}">Loja</a>
        <div class="search-bar-container">
          <label>
            <input
              type="text"
              name="text"
              class="search-bar"
              id="search-bar"
              placeholder="Escreve aqui o que procuras..."
            >
          </label>
        </div>
      </div>

      <div class="header-right">
        <input type="checkbox" id="toggle-header-menu" style="display: none;">
        <input type="checkbox" id="toggle-cart-menu" style="display: none;">

        <label for="toggle-header-menu" class="background" id="header-background"></label>
        <label for="toggle-cart-menu" class="background" id="cart-background"></label>

        <label for="toggle-header-menu" class="header-icon" id="user-icon"></label>
        <label for="toggle-cart-menu" class="header-icon" id="cart-icon"></label>

        <div class="header-menu" id="login-menu">
          <div class="header-menu-top">
            ${
              authenticated
                ? `
                  <div style="margin: 20px;">
                    <h1 class="header-menu-text-big">Ola ${username}!</h1>
                    <p class="header-menu-text-small">Bem vindo ao site dos Djabusabi.</p>
                  </div>
                  <div class="header-menu-buttons">
                    <a href="#" class="sign-up" data-action="logout">Terminar Sessao</a>
                  </div>
                `
                : `
                  <div style="margin: 20px;">
                    <h1 class="header-menu-text-big">Como assim ainda nao es um Djabusabi?</h1>
                    <p class="header-menu-text-small">Regista-te agora e torna-te um primo metralha!</p>
                  </div>
                  <div class="header-menu-buttons">
                    <a href="${toRootUrl("account/signup/index.html")}" class="sign-up">Regista-te</a>
                    <a href="${toRootUrl("account/login/index.html")}" class="log-in">Iniciar Sessao</a>
                  </div>
                `
            }
          </div>

          <div class="header-menu-bot">
            <a href="${toRootUrl("account/index.html")}" class="user-buttons">
              <img src="${toRootUrl("assets/icons/personal-data.png")}" alt="">
              <span>Dados Pessoais</span>
            </a>
            <a href="${toRootUrl("orders/index.html")}" class="user-buttons">
              <img src="${toRootUrl("assets/icons/orders.png")}" alt="">
              <span>Encomendas e Faturas</span>
            </a>
          </div>

          <div class="header-menu-bot">
            <img src="${toRootUrl("assets/logos/logo_vigo.png")}" alt="" class="logo-img">
          </div>
        </div>

        <div class="header-menu" id="cart-menu">
          <div class="header-menu-top" style="border-bottom: 20px">
            ${
              authenticated
                ? `
                  <div style="margin: 20px;">
                    <h1 class="header-menu-text-big">Carrinho de Compras</h1>
                    <h1 class="header-menu-text-small">Ola ${username}!</h1>
                  </div>
                  <div class="header-menu-buttons">
                    <a href="#" class="sign-up" data-action="logout">Terminar Sessao</a>
                  </div>
                  <div class="header-cart-bot">
                    <div class="cart-container"></div>
                  </div>
                `
                : `
                  <div style="margin-left: 20px">
                    <h1 class="header-menu-text-big">Carrinho de Compras</h1>
                    <p class="header-menu-text-small">Regista-te ou entra na tua conta Djabusabi para veres o teu carrinho.</p>
                  </div>
                  <div class="header-menu-buttons">
                    <a href="${toRootUrl("account/signup/index.html")}" class="sign-up">Regista-te</a>
                    <a href="${toRootUrl("account/login/index.html")}" class="log-in">Iniciar Sessao</a>
                  </div>
                  <div class="header-cart-bot"></div>
                `
            }
          </div>
        </div>
      </div>
    </header>
  `;
}

function checkoutHeaderMarkup() {
  return `
    <header>
      <div class="header-small">
        <a href="${toRootUrl("index.html")}"><img src="${toRootUrl("assets/logos/logo_branco.png")}" alt="Djabusabi"></a>
      </div>
    </header>
  `;
}

function footerMarkup() {
  return `
    <footer>
      <div class="footer-container">
        <div class="flex-item left">
          <p>&copy; 2024 Djabusabi. Todos os direitos reservados.</p>
        </div>
        <div class="flex-item center">
          <a href="https://www.instagram.com/12djabusabis/" target="_blank" rel="noreferrer">
            <img src="${toRootUrl("assets/icons/instagram.png")}" class="socials" alt="Instagram">
          </a>
          <a href="https://www.youtube.com/@joaoferreira328" target="_blank" rel="noreferrer">
            <img src="${toRootUrl("assets/icons/youtube.png")}" class="socials" alt="YouTube">
          </a>
          <a href="https://open.spotify.com/show/2waRgYTe2XDCNVomccBckl?si=838bb7c260c34c05" target="_blank" rel="noreferrer">
            <img src="${toRootUrl("assets/icons/spotify.png")}" class="socials" alt="Spotify">
          </a>
          <a href="https://discord.com/" target="_blank" rel="noreferrer">
            <img src="${toRootUrl("assets/icons/discord.png")}" class="socials" alt="Discord">
          </a>
        </div>
        <div class="flex-item right">
          <a href="${toRootUrl("index.html")}">Sobre os Djabusabi</a>
          <a href="${toRootUrl("index.html")}">Recrutamento</a>
        </div>
      </div>
    </footer>
  `;
}

function cartMarkup() {
  const summary = getCartSummary();
  if (summary.items.length === 0) {
    return '<h2 style="color: white;">O carrinho esta vazio!</h2>';
  }

  const itemsMarkup = summary.items
    .map(
      (item) => `
        <div class="cart-item">
          <div class="cart-item-left">
            <img src="${item.imageUrl}" alt="Product Image" class="cart-item-image">
          </div>
          <div class="cart-item-right">
            <h3 class="cart-item-name">${escapeHtml(item.name)}</h3>
            <p class="cart-item-quantity">Quantidade: ${escapeHtml(item.quantity)}</p>
            <p class="${escapeHtml(item.stockClass)}">${escapeHtml(item.stockStatus)}</p>
            <p class="cart-item-price">${formatPrice(item.price)}</p>
          </div>
          <div class="cart-item-remove">
            <button class="delete-button" data-cart-remove="${item.id}"></button>
          </div>
        </div>
      `
    )
    .join("");

  return `
    <div class="cart-cost">
      <h3 style="margin-bottom: 5px">Total de Artigos: ${summary.totalQuantity}</h3>
      <h2 style="margin: 0 0 10px 0">${formatPrice(summary.totalCost)}</h2>
    </div>
    ${itemsMarkup}
    <div class="cart-buttons">
      <button class="button-sliding" id="clear-cart">
        <span class="button-sliding-content" id="clear-cart">Limpar Carrinho</span>
      </button>
      <button class="button-sliding" id="buy-now">
        <span class="button-sliding-content" id="buy-now">Comprar</span>
      </button>
    </div>
  `;
}

function bindSearchBehaviour() {
  const searchBar = document.getElementById("search-bar");
  if (!searchBar) {
    return;
  }

  const page = document.body.dataset.page;
  const isAdminProductList = page === "admin" && new URLSearchParams(window.location.search).get("page") === "productList";

  if (isAdminUser() && page === "admin" && !isAdminProductList) {
    searchBar.placeholder = "Procurar items como administrador";
  }

  searchBar.addEventListener("input", (event) => {
    const searchValue = event.target.value;
    if (searchValue.length <= 1) {
      return;
    }

    if (page === "store" || isAdminProductList) {
      return;
    }

    setSearchHandoff(searchValue);

    if (isAdminUser() && page === "admin") {
      redirectTo("admin/index.html?page=productList");
      return;
    }

    redirectTo("store/index.html");
  });
}

function bindLayoutActions(headerRoot) {
  headerRoot.addEventListener("click", (event) => {
    const logoutButton = event.target.closest("[data-action='logout']");
    if (logoutButton) {
      event.preventDefault();
      logoutCurrentUser();
      redirectTo("index.html");
      return;
    }

    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return;
      }

      removeCartItem(currentUser.id, Number(removeButton.getAttribute("data-cart-remove")));
      const cartContainer = headerRoot.querySelector(".cart-container");
      if (cartContainer) {
        cartContainer.innerHTML = cartMarkup();
      }
      return;
    }

    if (event.target.id === "clear-cart") {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return;
      }

      clearCart(currentUser.id);
      const cartContainer = headerRoot.querySelector(".cart-container");
      if (cartContainer) {
        cartContainer.innerHTML = cartMarkup();
      }
      return;
    }

    if (event.target.id === "buy-now") {
      redirectTo("store/delivery/index.html");
    }
  });

  const cartToggle = document.getElementById("toggle-cart-menu");
  const cartContainer = headerRoot.querySelector(".cart-container");
  if (cartToggle && cartContainer) {
    const refreshCart = () => {
      if (cartToggle.checked) {
        cartContainer.innerHTML = cartMarkup();
      }
    };

    cartToggle.addEventListener("change", refreshCart);
    refreshCart();
  }
}

export function renderLayout() {
  const layout = document.body.dataset.layout ?? "default";
  const headerRoot = document.getElementById("app-header");
  const footerRoot = document.getElementById("app-footer");

  if (headerRoot) {
    if (layout === "default") {
      headerRoot.innerHTML = regularHeaderMarkup();
      bindSearchBehaviour();
      bindLayoutActions(headerRoot);
    } else if (layout === "checkout") {
      headerRoot.innerHTML = checkoutHeaderMarkup();
    } else {
      headerRoot.innerHTML = "";
    }
  }

  if (footerRoot) {
    footerRoot.innerHTML = footerMarkup();
  }
}
