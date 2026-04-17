import {
  addToCart,
  clearCart,
  createClientUser,
  finalizePurchase,
  getCartSummary,
  getCurrentUser,
  getOrderItems,
  getOrdersByUserId,
  getPaymentMethods,
  getProductById,
  getSelectedPaymentMethod,
  getUserAddressById,
  getUserPersonalDataById,
  isAdminUser,
  isAuthenticated,
  isCartEmpty,
  loginUser,
  logoutCurrentUser,
  queryCatalog,
  reorderOrder,
  setSelectedPaymentMethod,
  updateCurrentUserAddress,
  updateCurrentUserPassword,
  updateCurrentUserProfile
} from "./db.js";
import { renderLayout } from "./layout.js";
import { showPopup } from "./popup.js";
import {
  buildStoreItemHref,
  consumeSearchHandoff,
  escapeHtml,
  formatPrice,
  getIntParam,
  redirectTo,
  replaceTo,
  toRootUrl,
  updateQuery
} from "./utils.js";

function getPageRoot() {
  return document.getElementById("page-root");
}

function stockBadgeMarkup(item) {
  return `<div class="${escapeHtml(item.stockClass)}">${escapeHtml(item.stockStatus)}</div>`;
}

function accountSidebarMarkup(activePage) {
  return `
    <div class="menu-container">
      <h2>Painel de Conta</h2>
      <a href="${toRootUrl("account/index.html")}" class="item${activePage === "account" ? " active" : ""}">
        <img src="${toRootUrl("assets/icons/personal-data.png")}" alt="">
        <span>Dados Pessoais</span>
      </a>
      <a href="${toRootUrl("orders/index.html")}" class="item${activePage === "orders" ? " active" : ""}">
        <img src="${toRootUrl("assets/icons/orders.png")}" alt="">
        <span>Historico de Encomendas</span>
      </a>
    </div>
  `;
}

function userGreetingMarkup(user, logoutAttribute) {
  return `
    <div class="user-info">
      <h1>Ola ${escapeHtml(user.username)} </h1>
      <div class="end-session-button">
        <a href="#" ${logoutAttribute}>Terminar Sessao</a>
      </div>
    </div>
  `;
}

function checkoutItemsMarkup(summary) {
  return summary.items
    .map(
      (item) => `
        <div class="item">
          <div class="image">
            <img src="${item.imageUrl}" alt="${escapeHtml(item.name)}">
          </div>
          <div class="details">
            <div class="title">${escapeHtml(item.name)}</div>
            <div class="quantity">Quantidade: ${escapeHtml(item.quantity)}</div>
            <div class="price">Preco: ${formatPrice(item.price)}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function checkoutSummaryMarkup(summary) {
  return `
    <div class="top">
      <h4 class="summary-title">Resumo do Pedido</h4>
      <div class="summary-details">
        <p><span>Produtos</span> <span>${summary.totalQuantity}</span></p>
        <p><span>Envio</span> <span>0.00€</span></p>
        <p class="summary-total"><span>TOTAL</span> <span>${formatPrice(summary.totalCost)}</span></p>
      </div>
    </div>
    <div class="bot">
      ${checkoutItemsMarkup(summary)}
    </div>
  `;
}

function guardAuthenticated(path = "account/login/index.html") {
  if (!isAuthenticated()) {
    replaceTo(path);
    return false;
  }

  return true;
}

function renderHomePage() {
  const root = getPageRoot();
  root.innerHTML = `
    <div class="main-page-section">
      <div class="main-page-company-name">Djabusabi</div>
      <div class="main-page-divider"></div>
      <p class="main-page-key-sentence">Amigos, aventuras e grandes negocios - a tua loja epica!</p>
      <div class="main-page-buttons">
        <a href="${toRootUrl("ex4.rar")}" download class="main-page-button">Codigo</a>
        <a href="${toRootUrl("ex4_report.pdf")}" download class="main-page-button">Relatorio</a>
      </div>
    </div>
  `;
}

function renderStorePage() {
  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="page-container">
        <div class="page-container-spaceout"></div>
        <div class="page-container-bottom">
          <div class="menu-container" id="store-menu">
            <h2>Lista de Filtros</h2>
            <div class="filter-form">
              <form id="filterForm"></form>
              <form id="stockForm"></form>
            </div>
          </div>

          <div class="store-order-container">
            <div class="order-hidefilters-container-showing">
              <div class="hide-show-filters-container">
                <a href="#" id="toggle-filters-link">Esconder</a>
              </div>
              <div class="order-container">
                <p>Ordenar por:</p>
                <form>
                  <select id="itemOrder" name="order">
                    <option value="price_asc">Preco Crescente</option>
                    <option value="price_desc">Preco Decrescente</option>
                    <option value="name_asc">Ordem Alfabetica Crescente</option>
                    <option value="name_desc">Ordem Alfabetica Decrescente</option>
                  </select>
                </form>
              </div>
            </div>

            <div id="storeItems" class="store-container"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const filterForm = document.getElementById("filterForm");
  const stockForm = document.getElementById("stockForm");
  const itemsContainer = document.getElementById("storeItems");
  const orderSelect = document.getElementById("itemOrder");
  const searchBar = document.getElementById("search-bar");
  const menu = document.getElementById("store-menu");
  const toggleFiltersLink = document.getElementById("toggle-filters-link");
  let filtersVisible = true;

  const initialSearch = consumeSearchHandoff();
  if (searchBar && initialSearch) {
    searchBar.value = initialSearch;
    searchBar.focus();
  }

  function buildSelection() {
    const filterIds = Array.from(
      document.querySelectorAll('#filterForm input[type="checkbox"]:checked')
    ).map((checkbox) => Number(checkbox.value));
    const stockIds = Array.from(
      document.querySelectorAll('#stockForm input[type="checkbox"]:checked')
    ).map((checkbox) => Number(checkbox.value));

    return {
      filterIds,
      stockIds,
      order: orderSelect.value,
      search: searchBar?.value ?? ""
    };
  }

  function renderItems(items) {
    itemsContainer.innerHTML = items
      .map(
        (item) => `
          <div class="item">
            <a href="${buildStoreItemHref(item.id)}">
              <div class="image-container">
                <img src="${item.imageUrl}" alt="${escapeHtml(item.name)}">
              </div>
            </a>
            <div class="name">${escapeHtml(item.name)}</div>
            <div class="description">${escapeHtml(item.description)}</div>
            ${stockBadgeMarkup(item)}
            <div class="price">${formatPrice(item.price)}</div>
          </div>
        `
      )
      .join("");
  }

  function renderFilterGroup(form, title, items, selectedValues, labelKey) {
    form.innerHTML = `<h3>${title}</h3>`;

    items.forEach((item) => {
      if (item.count <= 0) {
        return;
      }

      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = item.id;
      checkbox.checked = selectedValues.includes(Number(item.id));
      checkbox.addEventListener("change", updateItems);

      const countParagraph = document.createElement("p");
      countParagraph.textContent = `(${item.count})`;

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(item[labelKey]));
      label.appendChild(countParagraph);
      form.appendChild(label);
    });
  }

  function updateItems() {
    const selection = buildSelection();
    const data = queryCatalog(selection);
    renderItems(data.items);
    renderFilterGroup(filterForm, "Categoria", data.filters, selection.filterIds, "name");
    renderFilterGroup(stockForm, "Stock", data.stocks, selection.stockIds, "status");
  }

  orderSelect.addEventListener("change", updateItems);
  searchBar?.addEventListener("input", updateItems);
  toggleFiltersLink.addEventListener("click", (event) => {
    event.preventDefault();
    filtersVisible = !filtersVisible;
    menu.style.display = filtersVisible ? "" : "none";
    toggleFiltersLink.textContent = filtersVisible ? "Esconder" : "Mostrar";
  });

  updateItems();
}

function renderItemPage() {
  const productId = getIntParam("itemId");
  const product = getProductById(productId);
  if (!product) {
    replaceTo("store/index.html");
    return;
  }

  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content body-content--item">
      <div class="item-page-container">
        <div class="left-square">
          <img src="${product.imageUrl}" alt="${escapeHtml(product.name)}" class="item-page-product-image">
        </div>

        <div class="right-square">
          <div class="flex-layer">
            <h1 class="item-page-product-product-title">${escapeHtml(product.name)}</h1>
            <p class="item-page-product-price">${formatPrice(product.price)}</p>
            <p class="item-page-product-description">${escapeHtml(product.description)}</p>
            ${stockBadgeMarkup(product)}

            <div class="item-page-buttons">
              <div class="item-page-quantity-selector">
                <button class="quantity-btn" id="decrease">-</button>
                <span class="quantity" id="quantity">1</span>
                <button class="quantity-btn" id="increase">+</button>
              </div>

              <button class="button-sliding" id="add-to-cart">
                <span class="button-sliding-content">Adicionar ao Carrinho</span>
              </button>

              <button class="button-sliding" id="buy-now-button">
                <span class="button-sliding-content">Comprar Ja</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  let quantity = 1;
  const quantityDisplay = document.getElementById("quantity");

  function updateQuantity() {
    quantityDisplay.textContent = String(quantity);
  }

  document.getElementById("decrease").addEventListener("click", () => {
    if (quantity > 1) {
      quantity -= 1;
      updateQuantity();
    }
  });

  document.getElementById("increase").addEventListener("click", () => {
    quantity += 1;
    updateQuantity();
  });

  document.getElementById("add-to-cart").addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      window.alert("Por favor, inicia sessao para adicionares produtos ao carrinho.");
      return;
    }

    const result = addToCart(user.id, product.id, quantity);
    if (result.success) {
      showPopup(`Produto adicionado ao carrinho! Quantidade: ${result.quantity}`, "success");
      return;
    }

    showPopup(result.message, "error");
  });

  document.getElementById("buy-now-button").addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      redirectTo("account/login/index.html");
      return;
    }

    const result = addToCart(user.id, product.id, quantity);
    if (result.success) {
      redirectTo("store/delivery/index.html");
      return;
    }

    showPopup(result.message, "error");
  });
}

function renderLoginPage(errorMessage = "") {
  if (isAuthenticated()) {
    replaceTo("index.html");
    return;
  }

  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="login-signup-page-container">
        <div class="home-icon-container">
          <a href="${toRootUrl("index.html")}">
            <img src="${toRootUrl("assets/logos/logo_branco.png")}" alt="Djabusabi">
          </a>
        </div>
        <div class="login-signup-side-container">
          <div class="login-signup-container">
            <h1>Entra com a tua conta Djabusabi!</h1>
            <div class="login-signup-form">
              <form id="login-form">
                <input type="text" name="logintext" placeholder="E-Mail ou Nome de Utilizador" required>
                <input type="password" name="password" placeholder="Password" required>
                ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}
                <button class="login-signup-button" type="submit">Iniciar Sessao</button>
              </form>
            </div>
          </div>
          <div class="login-signup-container">
            <h1>Ainda nao es um membro dos Djabusabi?</h1>
            <h2>O que e andas a fazer, regista-te e anda dar piscas conosco!</h2>
            <a href="${toRootUrl("account/signup/index.html")}" class="login-signup-button">Criar Conta</a>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = loginUser(formData.get("logintext"), formData.get("password"));
    if (result.success) {
      redirectTo("index.html");
      return;
    }

    renderLoginPage(result.message);
  });
}

function renderSignupPage(errorMessage = "") {
  if (isAuthenticated()) {
    replaceTo("index.html");
    return;
  }

  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="login-signup-page-container">
        <div class="home-icon-container">
          <a href="${toRootUrl("index.html")}">
            <img src="${toRootUrl("assets/logos/logo_branco.png")}" alt="Djabusabi">
          </a>
        </div>
        <div class="login-signup-side-container">
          <div class="login-signup-container">
            <h1>Torna-te um Djabusabi aqui!</h1>
            <h2>E gratis.</h2>
            <div class="login-signup-form">
              <form id="signup-form">
                <input type="text" name="username" placeholder="Nome de Utilizador" pattern=".{4,16}" required>
                <input type="email" name="email" placeholder="E-Mail" required>
                <input type="password" name="password" placeholder="Password" pattern="(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{6,}" required>
                <input type="password" name="confirmPassword" placeholder="Confirmar Password" pattern="(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{6,}" required>
                <div class="password-requirements">
                  ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}
                  <p>A password tera de cumprir os seguintes requisitos:</p>
                  <ul>
                    <li>Pelo menos 6 caracteres validos: a-z A-Z 0-9.</li>
                    <li>Pelo menos 1 caracter maiusculo.</li>
                    <li>Pelo menos 1 numero.</li>
                  </ul>
                </div>
                <label class="terms-container">
                  <input type="checkbox" required>
                  <span class="checkmark"></span>
                  Li e aceito os Termos e Condicoes, e o uso dos meus dados pessoais como explicado pela Politica de Privacidade.
                </label>
                <button class="login-signup-button" type="submit">Criar Conta</button>
              </form>
            </div>
          </div>
          <div class="login-signup-container">
            <h1>Ja es um membro dos Djabusabi?</h1>
            <h2>Clica abaixo para iniciares sessao.</h2>
            <a href="${toRootUrl("account/login/index.html")}" class="login-signup-button">Iniciar Sessao</a>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("signup-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = createClientUser({
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    });

    if (result.success) {
      redirectTo("index.html");
      return;
    }

    renderSignupPage(result.message);
  });
}

function renderAccountPage(flash = {}) {
  if (!guardAuthenticated()) {
    return;
  }

  const user = getCurrentUser();
  const personalData = getUserPersonalDataById(user.id);
  const address = getUserAddressById(user.id);
  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="page-container">
        <div class="page-container-top">
          <div class="item">${userGreetingMarkup(user, 'data-account-logout')}</div>
          <div class="item"><h1>Dados Pessoais</h1></div>
        </div>
        <div class="page-container-bottom">
          ${accountSidebarMarkup("account")}
          <div class="personal-data-container">
            <div class="item">
              <h2>Dados da Minha Conta</h2>
              <div class="user-data-form">
                <form id="personal-data-form">
                  <input type="text" name="firstname" placeholder="Nome" pattern=".{4,16}" value="${escapeHtml(personalData.firstname)}" required>
                  <input type="text" name="lastname" placeholder="Apelido" pattern=".{4,16}" value="${escapeHtml(personalData.lastname)}" required>
                  <input type="text" name="username" placeholder="Nome de Utilizador" pattern=".{4,16}" value="${escapeHtml(user.username)}" required>
                  <input type="email" name="email" placeholder="E-Mail" value="${escapeHtml(user.email)}" required>
                  <input type="date" name="birthdate" value="${escapeHtml(personalData.birthdate)}" required>
                  <input style="visibility: hidden">
                  <button class="save-button" type="submit">Guardar</button>
                  ${
                    flash.section === "personal"
                      ? `<p class="${flash.type === "error" ? "error-message" : "success-message"}">${escapeHtml(flash.message)}</p>`
                      : ""
                  }
                </form>
              </div>
            </div>

            <div class="item">
              <h2>Alterar Password</h2>
              <div class="user-data-form">
                <form id="password-form">
                  <input type="password" name="oldPassword" placeholder="Password Atual" pattern="(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{4,18}" required>
                  <input style="visibility: hidden">
                  <input type="password" name="newPassword" placeholder="Nova Password" pattern="(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{4,18}" required>
                  <input type="password" name="confirmPassword" placeholder="Confirmar Password" pattern="(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{4,18}" required>
                  <button class="save-button" type="submit">Alterar</button>
                  ${
                    flash.section === "password"
                      ? `<p class="${flash.type === "error" ? "error-message" : "success-message"}">${escapeHtml(flash.message)}</p>`
                      : ""
                  }
                </form>
              </div>
              <div class="password">
                <p>A password tera de cumprir os seguintes requisitos:</p>
                <ul>
                  <li>Pelo menos 6 caracteres validos: a-z A-Z 0-9.</li>
                  <li>Pelo menos 1 caracter maiusculo.</li>
                  <li>Pelo menos 1 numero.</li>
                </ul>
              </div>
            </div>

            <div class="item">
              <h2>Morada de Entrega e de Faturacao</h2>
              <div class="user-data-form">
                <form id="address-form">
                  <input type="text" name="street" placeholder="Morada" pattern=".{5,50}" value="${escapeHtml(address.street)}" required>
                  <input type="text" name="city" placeholder="Cidade" pattern=".{4,16}" value="${escapeHtml(address.city)}" required>
                  <input class="address" type="number" name="phonenumber" placeholder="Numero de Telefone" value="${escapeHtml(address.phonenumber)}" required>
                  <input class="address" type="text" name="postalcode" placeholder="Codigo Postal" pattern="\\d{4}-\\d{3}" value="${escapeHtml(address.postalcode)}" required>
                  <input class="address" type="number" name="nif" placeholder="NIF" value="${escapeHtml(address.nif)}">
                  <button class="save-button" type="submit">Guardar</button>
                  ${
                    flash.section === "address"
                      ? `<p class="${flash.type === "error" ? "error-message" : "success-message"}">${escapeHtml(flash.message)}</p>`
                      : ""
                  }
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.querySelector("[data-account-logout]").addEventListener("click", (event) => {
    event.preventDefault();
    logoutCurrentUser();
    redirectTo("index.html");
  });

  document.getElementById("personal-data-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = updateCurrentUserProfile(user.id, {
      firstname: formData.get("firstname"),
      lastname: formData.get("lastname"),
      username: formData.get("username"),
      email: formData.get("email"),
      birthdate: formData.get("birthdate")
    });
    renderLayout();
    renderAccountPage({
      section: "personal",
      type: result.success ? "success" : "error",
      message: result.message
    });
  });

  document.getElementById("password-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = updateCurrentUserPassword(
      user.id,
      formData.get("oldPassword"),
      formData.get("newPassword"),
      formData.get("confirmPassword")
    );
    renderAccountPage({
      section: "password",
      type: result.success ? "success" : "error",
      message: result.message
    });
  });

  document.getElementById("address-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = updateCurrentUserAddress(user.id, {
      street: formData.get("street"),
      city: formData.get("city"),
      postalcode: formData.get("postalcode"),
      phonenumber: formData.get("phonenumber"),
      nif: formData.get("nif")
    });
    renderAccountPage({
      section: "address",
      type: result.success ? "success" : "error",
      message: result.message
    });
  });
}

function renderOrdersPage() {
  if (!guardAuthenticated()) {
    return;
  }

  const user = getCurrentUser();
  const orders = getOrdersByUserId(user.id);
  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="page-container">
        <div class="page-container-top">
          <div class="item">${userGreetingMarkup(user, 'data-orders-logout')}</div>
          <div class="item"><h1>Historico de Encomendas</h1></div>
        </div>
        <div class="page-container-bottom">
          ${accountSidebarMarkup("orders")}
          <div class="personal-data-container">
            <div class="order-history-container">
              ${
                orders.length === 0
                  ? "<p class=\"success-message\">Ainda nao tens encomendas registadas.</p>"
                  : orders
                      .map(
                        (order) => `
                          <div class="order-history-item">
                            <div class="order-info">
                              <div class="order-number">Encomenda Nº ${order.id}</div>
                              <div class="order-details">
                                Pedido efetuado a ${escapeHtml(order.date)}<br>
                                Total: ${formatPrice(order.cost)}
                              </div>
                            </div>
                            <button class="arrow-button arrow-down" data-order-expand="${order.id}"></button>
                            <div class="order-actions">
                              <button class="button-sliding" data-reorder="${order.id}">
                                <span class="button-sliding-content">Reencomendar</span>
                              </button>
                            </div>
                          </div>
                          <div class="dropdown-container" data-order-dropdown="${order.id}" style="display: none;"></div>
                        `
                      )
                      .join("")
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.querySelector("[data-orders-logout]").addEventListener("click", (event) => {
    event.preventDefault();
    logoutCurrentUser();
    redirectTo("index.html");
  });

  root.addEventListener("click", (event) => {
    const expandButton = event.target.closest("[data-order-expand]");
    if (expandButton) {
      const orderId = Number(expandButton.getAttribute("data-order-expand"));
      const dropdown = document.querySelector(`[data-order-dropdown="${orderId}"]`);
      const orderItems = getOrderItems(orderId);
      const expanded = expandButton.classList.contains("arrow-up");

      if (expanded) {
        expandButton.classList.remove("arrow-up");
        expandButton.classList.add("arrow-down");
        dropdown.style.display = "none";
        dropdown.innerHTML = "";
        return;
      }

      dropdown.innerHTML = orderItems
        .map(
          (item) => `
            <div class="dropdown-item">
              <div class="dropdown-item-left">
                <img src="${item.imageUrl}" alt="${escapeHtml(item.name)}">
                <span>${escapeHtml(item.name)}</span>
              </div>
              <div class="dropdown-item-right">
                <h1>${formatPrice(item.price)}</h1>
                <p>Quantidade: ${item.quantity}</p>
              </div>
            </div>
          `
        )
        .join("");
      dropdown.style.display = "flex";
      expandButton.classList.remove("arrow-down");
      expandButton.classList.add("arrow-up");
      return;
    }

    const reorderButton = event.target.closest("[data-reorder]");
    if (reorderButton) {
      const orderId = Number(reorderButton.getAttribute("data-reorder"));
      const result = reorderOrder(orderId);
      showPopup(
        result.success ? "Produtos adicionados ao carrinho!" : result.message,
        result.success ? "success" : "error"
      );
    }
  });
}

function renderDeliveryPage() {
  if (!guardAuthenticated()) {
    return;
  }

  const user = getCurrentUser();
  if (isCartEmpty(user.id)) {
    replaceTo("store/index.html");
    return;
  }

  const summary = getCartSummary(user.id);
  const address = getUserAddressById(user.id);
  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="page-container">
        <div class="buy-container-top">
          <div class="main">Entrega</div>
          <div class="sub">Pagamento</div>
          <div class="sub">Confirmacao</div>
        </div>
        <div class="buy-container-bot">
          <div class="left">
            <div class="top">
              <h2>Morada de Entrega e de Faturacao</h2>
              <div class="user-data-form">
                <form id="delivery-form">
                  <input class="address" type="number" name="phonenumber" placeholder="Numero de Telefone" value="${escapeHtml(address.phonenumber)}" required>
                  <input class="address" type="number" name="nif" placeholder="NIF" value="${escapeHtml(address.nif)}">
                  <input type="text" name="city" placeholder="Cidade" pattern=".{4,16}" value="${escapeHtml(address.city)}" required>
                  <input class="address" type="text" name="postalcode" placeholder="Codigo Postal" pattern="\\d{4}-\\d{3}" value="${escapeHtml(address.postalcode)}" required>
                  <input type="text" name="street" placeholder="Morada" pattern=".{5,50}" value="${escapeHtml(address.street)}" required>
                </form>
              </div>
              <p class="error-message" style="font-size: 20px;" id="delivery-error"></p>
            </div>
            <div class="bot">
              <button class="button-sliding" id="delivery-back" style="width: 100px;">
                <span class="button-sliding-content">Voltar</span>
              </button>
              <button class="button-sliding" id="delivery-next" style="width: 100px;">
                <span class="button-sliding-content">Seguinte</span>
              </button>
            </div>
          </div>
          <div class="right">${checkoutSummaryMarkup(summary)}</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("delivery-back").addEventListener("click", () => {
    redirectTo("index.html");
  });

  document.getElementById("delivery-next").addEventListener("click", () => {
    const form = document.getElementById("delivery-form");
    const errorLabel = document.getElementById("delivery-error");
    if (!form.reportValidity()) {
      errorLabel.textContent = "Morada invalida.";
      return;
    }

    const formData = new FormData(form);
    updateCurrentUserAddress(user.id, {
      street: formData.get("street"),
      city: formData.get("city"),
      postalcode: formData.get("postalcode"),
      phonenumber: formData.get("phonenumber"),
      nif: formData.get("nif")
    });
    redirectTo("store/payment/index.html");
  });
}

function renderPaymentPage() {
  if (!guardAuthenticated()) {
    return;
  }

  const user = getCurrentUser();
  if (isCartEmpty(user.id)) {
    replaceTo("store/index.html");
    return;
  }

  const summary = getCartSummary(user.id);
  const paymentMethods = getPaymentMethods();
  const selectedPaymentMethod = getSelectedPaymentMethod();
  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="page-container">
        <div class="buy-container-top">
          <div class="sub">Entrega</div>
          <div class="main">Pagamento</div>
          <div class="sub">Confirmacao</div>
        </div>
        <div class="buy-container-bot">
          <div class="left">
            <div class="top">
              <h2>Metodo de Pagamento</h2>
            </div>
            <form class="payment-form" id="payment-form">
              ${paymentMethods
                .map(
                  (method) => `
                    <label>
                      <input type="radio" name="payment-method" value="${method.id}" ${selectedPaymentMethod?.id === method.id ? "checked" : ""} required>
                      <img src="${toRootUrl(`assets/logos/${method.logo}`)}" alt="${escapeHtml(method.name)}">
                      <div>
                        <strong>${escapeHtml(method.name)}</strong>
                        <p>${escapeHtml(method.description)}</p>
                      </div>
                    </label>
                  `
                )
                .join("")}
            </form>
            <div class="bot">
              <button class="button-sliding" id="payment-back" style="width: 100px;">
                <span class="button-sliding-content">Voltar</span>
              </button>
              <button class="button-sliding" id="payment-next" style="width: 100px;">
                <span class="button-sliding-content">Seguinte</span>
              </button>
            </div>
          </div>
          <div class="right">${checkoutSummaryMarkup(summary)}</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("payment-back").addEventListener("click", () => {
    redirectTo("store/delivery/index.html");
  });

  document.getElementById("payment-next").addEventListener("click", () => {
    const selected = document.querySelector('input[name="payment-method"]:checked');
    if (!selected) {
      window.alert("Por favor, selecione um metodo de pagamento.");
      return;
    }

    const result = setSelectedPaymentMethod(selected.value);
    if (!result.success) {
      window.alert("Erro ao selecionar o metodo de pagamento.");
      return;
    }

    redirectTo("store/checkout/index.html");
  });
}

function renderCheckoutPage() {
  if (!guardAuthenticated()) {
    return;
  }

  const user = getCurrentUser();
  if (isCartEmpty(user.id)) {
    replaceTo("store/index.html");
    return;
  }

  const paymentMethod = getSelectedPaymentMethod();
  if (!paymentMethod) {
    replaceTo("store/payment/index.html");
    return;
  }

  const summary = getCartSummary(user.id);
  const address = getUserAddressById(user.id);
  const root = getPageRoot();
  root.innerHTML = `
    <div class="body-content">
      <div class="page-container">
        <div class="buy-container-top">
          <div class="sub">Entrega</div>
          <div class="sub">Pagamento</div>
          <div class="main">Confirmacao</div>
        </div>
        <div class="buy-container-bot">
          <div class="left">
            <div class="top">
              <h2>Finalizar Compra</h2>
              <h3>Morada de Entrega</h3>
              <div class="address-box">
                <div class="address-item"><span class="address-item-title">Rua:</span><span class="address-item-value">${escapeHtml(address.street)}</span></div>
                <div class="address-item"><span class="address-item-title">Cidade:</span><span class="address-item-value">${escapeHtml(address.city)}</span></div>
                <div class="address-item"><span class="address-item-title">Codigo Postal:</span><span class="address-item-value">${escapeHtml(address.postalcode)}</span></div>
                <div class="address-item"><span class="address-item-title">Telefone:</span><span class="address-item-value">${escapeHtml(address.phonenumber)}</span></div>
                <div class="address-item"><span class="address-item-title">NIF:</span><span class="address-item-value">${escapeHtml(address.nif)}</span></div>
              </div>

              <h3>Metodo de Pagamento</h3>
              <div class="payment-box">
                <img src="${toRootUrl(`assets/logos/${paymentMethod.logo}`)}" alt="${escapeHtml(paymentMethod.name)}">
                <strong>${escapeHtml(paymentMethod.name)}</strong>
              </div>
            </div>
            <div class="bot">
              <button class="button-sliding" id="checkout-back" style="width: 100px;">
                <span class="button-sliding-content">Voltar</span>
              </button>
              <button class="button-sliding" id="checkout-finish">
                <span class="button-sliding-content">Finalizar Compra</span>
              </button>
            </div>
          </div>
          <div class="right">${checkoutSummaryMarkup(summary)}</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("checkout-back").addEventListener("click", () => {
    redirectTo("store/payment/index.html");
  });

  document.getElementById("checkout-finish").addEventListener("click", () => {
    const result = finalizePurchase();
    if (!result.success) {
      window.alert("Nao foi possivel finalizar a compra.");
      return;
    }

    redirectTo("orders/index.html");
  });
}

function renderBuyPage() {
  const root = getPageRoot();
  root.innerHTML = `<div class="body-content"></div>`;
}

export function initPublicPage(page) {
  switch (page) {
    case "home":
      renderHomePage();
      return true;
    case "store":
      renderStorePage();
      return true;
    case "item":
      renderItemPage();
      return true;
    case "login":
      renderLoginPage();
      return true;
    case "signup":
      renderSignupPage();
      return true;
    case "account":
      renderAccountPage();
      return true;
    case "orders":
      renderOrdersPage();
      return true;
    case "delivery":
      renderDeliveryPage();
      return true;
    case "payment":
      renderPaymentPage();
      return true;
    case "checkout":
      renderCheckoutPage();
      return true;
    case "buy":
      renderBuyPage();
      return true;
    default:
      return false;
  }
}
