const STORAGE_KEYS = {
    products: "dbs_website_products",
    users: "dbs_website_users",
    cart: "dbs_website_cart",
    session: "dbs_website_session",
};

const FILTERS = [
    { id: "vestuario", label: "Vestuário" },
    { id: "material-escolar", label: "Material Escolar" },
    { id: "utilitarios", label: "Utilitários" },
    { id: "novas-adicoes", label: "Novas Adições" },
];

const STOCKS = [
    { id: "available", label: "Disponível", className: "available" },
    { id: "lastunits", label: "Últimas unidades", className: "lastunits" },
    { id: "unavailable", label: "Indisponível", className: "unavailable" },
    { id: "soonavailable", label: "Brevemente", className: "soonavailable" },
];

const ORDER_OPTIONS = [
    { value: "price_asc", label: "Preço crescente" },
    { value: "price_desc", label: "Preço decrescente" },
    { value: "name_asc", label: "Nome A-Z" },
    { value: "name_desc", label: "Nome Z-A" },
];

const IMAGE_OPTIONS = [
    { value: "../dbs_php/assets/store/mousepad_cinza.png", label: "Mousepad cinza" },
    { value: "../dbs_php/assets/store/capa_cinza.png", label: "Capa cinza" },
    { value: "../dbs_php/assets/images/vestuario.png", label: "Coleção vestuário" },
    { value: "../dbs_php/assets/images/material-escolar.png", label: "Material escolar" },
    { value: "../dbs_php/assets/images/mala-dinheiro.jpg", label: "Utilitário" },
    { value: "../dbs_php/assets/images/mainpage-image1.jpg", label: "Hero image 1" },
];

const DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: "Mousepad Djabusabi Cinza",
        description: "Mousepad com branding Djabusabi, ideal para secretária e setup de estudo.",
        price: 12.9,
        stock: "available",
        filter: "material-escolar",
        image: "../dbs_php/assets/store/mousepad_cinza.png",
    },
    {
        id: 2,
        name: "Capa Djabusabi Cinza",
        description: "Capa versátil para material diário com visual simples e identidade do grupo.",
        price: 24.5,
        stock: "lastunits",
        filter: "utilitarios",
        image: "../dbs_php/assets/store/capa_cinza.png",
    },
    {
        id: 3,
        name: "Pack Vestuário Essentials",
        description: "Entrada de demonstração para roupa e merchandising com estilo Djabusabi.",
        price: 34.0,
        stock: "available",
        filter: "vestuario",
        image: "../dbs_php/assets/images/vestuario.png",
    },
    {
        id: 4,
        name: "Kit Escolar Djabusabi",
        description: "Conjunto de material escolar para a demo estática do catálogo.",
        price: 18.75,
        stock: "available",
        filter: "material-escolar",
        image: "../dbs_php/assets/images/material-escolar.png",
    },
    {
        id: 5,
        name: "Utility Pouch",
        description: "Produto utilitário inspirado na secção original do website em PHP.",
        price: 15.2,
        stock: "unavailable",
        filter: "utilitarios",
        image: "../dbs_php/assets/images/mala-dinheiro.jpg",
    },
    {
        id: 6,
        name: "Drop Brevemente",
        description: "Exemplo de produto marcado como futuro lançamento para demonstrar estados de stock.",
        price: 29.9,
        stock: "soonavailable",
        filter: "novas-adicoes",
        image: "../dbs_php/assets/images/mainpage-image1.jpg",
    },
];

const DEFAULT_USERS = [
    {
        id: 1,
        username: "admin",
        email: "admin@djabusabi.pt",
        password: "Admin123",
        permissions: "admin",
        personalData: {
            firstname: "João",
            lastname: "Admin",
            birthdate: "1999-04-10",
        },
        address: {
            street: "Rua da Administração, 10",
            city: "Porto",
            postalcode: "4200-000",
            phonenumber: "912345678",
            nif: "123456789",
        },
    },
    {
        id: 2,
        username: "cliente",
        email: "cliente@djabusabi.pt",
        password: "Cliente123",
        permissions: "client",
        personalData: {
            firstname: "Maria",
            lastname: "Cliente",
            birthdate: "2001-09-18",
        },
        address: {
            street: "Rua dos Produtos, 22",
            city: "Gaia",
            postalcode: "4400-100",
            phonenumber: "934567890",
            nif: "245678901",
        },
    },
];

const adminState = {
    editingProductId: null,
    editingUserId: null,
};

let storeState = null;
let toastTimer = null;

function readStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.error(`Failed to read ${key}`, error);
        return fallback;
    }
}

function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function seedData() {
    if (!localStorage.getItem(STORAGE_KEYS.products)) {
        writeStorage(STORAGE_KEYS.products, DEFAULT_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.users)) {
        writeStorage(STORAGE_KEYS.users, DEFAULT_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.cart)) {
        writeStorage(STORAGE_KEYS.cart, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.session)) {
        writeStorage(STORAGE_KEYS.session, { userId: null });
    }
}

function getProducts() {
    return readStorage(STORAGE_KEYS.products, DEFAULT_PRODUCTS);
}

function saveProducts(products) {
    writeStorage(STORAGE_KEYS.products, products);
}

function getUsers() {
    return readStorage(STORAGE_KEYS.users, DEFAULT_USERS);
}

function saveUsers(users) {
    writeStorage(STORAGE_KEYS.users, users);
}

function getCart() {
    return readStorage(STORAGE_KEYS.cart, []);
}

function saveCart(cart) {
    writeStorage(STORAGE_KEYS.cart, cart);
}

function getSession() {
    return readStorage(STORAGE_KEYS.session, { userId: null });
}

function setSession(userId) {
    writeStorage(STORAGE_KEYS.session, { userId });
}

function getCurrentUser() {
    const session = getSession();
    if (!session?.userId) return null;
    return getUsers().find((user) => user.id === session.userId) || null;
}

function logoutUser() {
    setSession(null);
    renderShell();
    renderCurrentPage();
    showToast("Sessão terminada.", "success");
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
    }).format(Number(value) || 0);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function stockMeta(stockId) {
    return STOCKS.find((item) => item.id === stockId) || STOCKS[0];
}

function filterLabel(filterId) {
    return FILTERS.find((item) => item.id === filterId)?.label || "Sem categoria";
}

function cartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function renderShell() {
    renderHeader();
    renderFooter();
}

function renderHeader() {
    const host = document.getElementById("siteHeader");
    if (!host) return;

    const user = getCurrentUser();
    const page = document.body.dataset.page;

    host.className = "siteHeader";
    host.innerHTML = `
        <div class="siteHeaderInner">
            <a href="index.html" class="brand">
                <img src="../dbs_php/assets/logos/logo_branco.png" alt="Djabusabi logo" class="brandLogo">
                <span class="brandCopy">
                    <span class="brandName">Djabusabi</span>
                    <span class="brandSub">Static store demo</span>
                </span>
            </a>

            <nav class="siteNav" aria-label="Navegação principal">
                <a href="index.html" class="${page === "home" ? "isActive" : ""}">Home</a>
                <a href="store.html" class="${page === "store" ? "isActive" : ""}">Loja</a>
                <a href="account.html" class="${page === "account" ? "isActive" : ""}">Conta</a>
                <a href="admin.html" class="${page === "admin" ? "isActive" : ""}">Admin</a>
            </nav>

            <div class="headerMeta">
                <span class="cartChip">Carrinho: <strong>${cartCount()}</strong></span>
                ${
                    user
                        ? `
                            <span class="userChip">${escapeHtml(user.username)} · ${user.permissions}</span>
                            <button type="button" class="btn btnGhost btnSmall" data-action="logout">Logout</button>
                        `
                        : `
                            <a href="account.html" class="btn btnGhost btnSmall">Login</a>
                        `
                }
            </div>
        </div>
    `;

    host.querySelector('[data-action="logout"]')?.addEventListener("click", logoutUser);
}

function renderFooter() {
    const host = document.getElementById("siteFooter");
    if (!host) return;

    host.className = "siteFooter";
    host.innerHTML = `
        <div class="siteFooterInner">
            <div class="footerBrand">
                <strong>Djabusabi</strong><br>
                Demo estática baseada no projeto PHP original.
            </div>
            <div class="footerSocials">
                <a href="https://www.instagram.com/12djabusabis/" target="_blank" rel="noopener">
                    <img src="../dbs_php/assets/icons/instagram.png" alt="Instagram">
                </a>
                <a href="https://www.youtube.com/@joaoferreira328" target="_blank" rel="noopener">
                    <img src="../dbs_php/assets/icons/youtube.png" alt="YouTube">
                </a>
                <a href="https://open.spotify.com/show/2waRgYTe2XDCNVomccBckl?si=838bb7c260c34c05" target="_blank" rel="noopener">
                    <img src="../dbs_php/assets/icons/spotify.png" alt="Spotify">
                </a>
                <a href="https://discord.com/" target="_blank" rel="noopener">
                    <img src="../dbs_php/assets/icons/discord.png" alt="Discord">
                </a>
            </div>
            <div class="footerLinks">
                <a href="index.html">Início</a>
                <a href="store.html">Loja</a>
                <a href="account.html">Conta</a>
            </div>
        </div>
    `;
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast isVisible ${type === "error" ? "isError" : "isSuccess"}`;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}

function renderCurrentPage() {
    const page = document.body.dataset.page;
    if (page === "home") renderHomePage();
    if (page === "store") renderStorePage();
    if (page === "account") renderAccountPage();
    if (page === "admin") renderAdminPage();
}

function productCardMarkup(product) {
    const stock = stockMeta(product.stock);
    const disabled = product.stock === "unavailable" || product.stock === "soonavailable";
    return `
        <article class="productCard">
            <div class="productImageWrap">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
                <span class="stockBadge ${escapeHtml(stock.className)}">${escapeHtml(stock.label)}</span>
            </div>
            <div class="productBody">
                <div class="productCategory">${escapeHtml(filterLabel(product.filter))}</div>
                <h3>${escapeHtml(product.name)}</h3>
                <p class="productMetaText">${escapeHtml(product.description)}</p>
                <div class="productPriceRow">
                    <strong class="productPrice">${formatCurrency(product.price)}</strong>
                    <button
                        type="button"
                        class="btn ${disabled ? "btnGhost" : "btnPrimary"} btnSmall"
                        data-add-to-cart="${product.id}"
                        ${disabled ? "disabled" : ""}
                    >
                        ${disabled ? "Não disponível" : "Adicionar"}
                    </button>
                </div>
            </div>
        </article>
    `;
}

function bindAddToCartButtons(root = document) {
    root.querySelectorAll("[data-add-to-cart]").forEach((button) => {
        button.addEventListener("click", () => {
            addToCart(Number(button.dataset.addToCart));
        });
    });
}

function addToCart(productId) {
    const product = getProducts().find((item) => item.id === productId);
    if (!product) return;
    if (product.stock === "unavailable" || product.stock === "soonavailable") {
        showToast("Este produto não está disponível para compra.", "error");
        return;
    }

    const cart = getCart();
    const existing = cart.find((item) => item.productId === productId);
    if (existing) existing.quantity += 1;
    else cart.push({ productId, quantity: 1 });
    saveCart(cart);
    renderShell();
    if (document.body.dataset.page === "store") renderStorePage();
    showToast("Produto adicionado ao carrinho.");
}

function updateHomeStats() {
    const productsStat = document.querySelector('[data-home-stat="products"]');
    const usersStat = document.querySelector('[data-home-stat="users"]');
    if (productsStat) productsStat.textContent = String(getProducts().length);
    if (usersStat) usersStat.textContent = String(getUsers().length);
}

function renderHomePage() {
    updateHomeStats();
    const featuredHost = document.getElementById("featuredProducts");
    if (!featuredHost) return;

    featuredHost.innerHTML = getProducts().slice(0, 4).map((product) => productCardMarkup(product)).join("");
    bindAddToCartButtons(featuredHost);
}

function parseStoreStateFromUrl() {
    const url = new URL(window.location.href);
    return {
        filters: url.searchParams.getAll("filter"),
        stocks: url.searchParams.getAll("stock"),
        order: url.searchParams.get("order") || "price_asc",
        showFilters: window.innerWidth > 720,
    };
}

function syncStoreUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("filter");
    url.searchParams.delete("stock");
    storeState.filters.forEach((filter) => url.searchParams.append("filter", filter));
    storeState.stocks.forEach((stock) => url.searchParams.append("stock", stock));
    if (storeState.order && storeState.order !== "price_asc") url.searchParams.set("order", storeState.order);
    else url.searchParams.delete("order");
    history.replaceState({}, "", url);
}

function getFilteredProducts(state = storeState) {
    const products = [...getProducts()];
    const filtered = products.filter((product) => {
        const matchesFilter = !state.filters.length || state.filters.includes(product.filter);
        const matchesStock = !state.stocks.length || state.stocks.includes(product.stock);
        return matchesFilter && matchesStock;
    });

    filtered.sort((left, right) => {
        switch (state.order) {
            case "price_desc":
                return right.price - left.price;
            case "name_asc":
                return left.name.localeCompare(right.name, "pt");
            case "name_desc":
                return right.name.localeCompare(left.name, "pt");
            case "price_asc":
            default:
                return left.price - right.price;
        }
    });

    return filtered;
}

function renderStorePage() {
    if (!storeState) storeState = parseStoreStateFromUrl();

    const filtersHost = document.getElementById("storeFilters");
    const productsHost = document.getElementById("storeProducts");
    const cartHost = document.getElementById("storeCart");
    const resultCount = document.getElementById("storeResultCount");
    const orderSelect = document.getElementById("orderSelect");
    const toggleFiltersBtn = document.getElementById("toggleFiltersBtn");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    if (!filtersHost || !productsHost || !cartHost || !resultCount || !orderSelect) return;

    const filteredProducts = getFilteredProducts();
    resultCount.textContent = `${filteredProducts.length} resultado${filteredProducts.length === 1 ? "" : "s"}`;
    orderSelect.innerHTML = ORDER_OPTIONS.map((option) => `
        <option value="${option.value}" ${storeState.order === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>
    `).join("");

    filtersHost.classList.toggle("isOpen", storeState.showFilters);
    filtersHost.innerHTML = `
        <h2>Lista de filtros</h2>
        <p class="hintText">Escolhe categorias e disponibilidade tal como na versão PHP.</p>

        <div class="filterGroup">
            <strong>Categoria</strong>
            ${FILTERS.map((filter) => {
                const count = getProducts().filter((product) => {
                    const matchesStock = !storeState.stocks.length || storeState.stocks.includes(product.stock);
                    return product.filter === filter.id && matchesStock;
                }).length;
                return `
                    <div class="filterItem">
                        <label>
                            <input type="checkbox" value="${filter.id}" data-filter-type="filter" ${storeState.filters.includes(filter.id) ? "checked" : ""}>
                            <span>${escapeHtml(filter.label)}</span>
                        </label>
                        <span class="filterCount">(${count})</span>
                    </div>
                `;
            }).join("")}
        </div>

        <div class="filterGroup">
            <strong>Disponibilidade</strong>
            ${STOCKS.map((stock) => {
                const count = getProducts().filter((product) => {
                    const matchesFilter = !storeState.filters.length || storeState.filters.includes(product.filter);
                    return product.stock === stock.id && matchesFilter;
                }).length;
                return `
                    <div class="filterItem">
                        <label>
                            <input type="checkbox" value="${stock.id}" data-filter-type="stock" ${storeState.stocks.includes(stock.id) ? "checked" : ""}>
                            <span>${escapeHtml(stock.label)}</span>
                        </label>
                        <span class="filterCount">(${count})</span>
                    </div>
                `;
            }).join("")}
        </div>
    `;

    if (!filteredProducts.length) {
        productsHost.innerHTML = `<div class="emptyState"><h2>Nenhum produto encontrado</h2><p>Tenta limpar alguns filtros para voltar a ver o catálogo.</p></div>`;
    } else {
        productsHost.innerHTML = filteredProducts.map((product) => productCardMarkup(product)).join("");
        bindAddToCartButtons(productsHost);
    }

    renderCartPanel(cartHost);

    filtersHost.querySelectorAll('input[data-filter-type="filter"]').forEach((input) => {
        input.addEventListener("change", () => {
            if (input.checked) storeState.filters.push(input.value);
            else storeState.filters = storeState.filters.filter((item) => item !== input.value);
            syncStoreUrl();
            renderStorePage();
        });
    });

    filtersHost.querySelectorAll('input[data-filter-type="stock"]').forEach((input) => {
        input.addEventListener("change", () => {
            if (input.checked) storeState.stocks.push(input.value);
            else storeState.stocks = storeState.stocks.filter((item) => item !== input.value);
            syncStoreUrl();
            renderStorePage();
        });
    });

    orderSelect.addEventListener("change", () => {
        storeState.order = orderSelect.value;
        syncStoreUrl();
        renderStorePage();
    });

    toggleFiltersBtn.addEventListener("click", () => {
        storeState.showFilters = !storeState.showFilters;
        renderStorePage();
    });
    toggleFiltersBtn.textContent = storeState.showFilters ? "Esconder filtros" : "Mostrar filtros";

    clearFiltersBtn.addEventListener("click", () => {
        storeState = { filters: [], stocks: [], order: "price_asc", showFilters: storeState.showFilters };
        syncStoreUrl();
        renderStorePage();
    });
}

function renderCartPanel(cartHost) {
    const cart = getCart();
    const products = getProducts();
    const items = cart
        .map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            return product ? { ...item, product } : null;
        })
        .filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.product.price, 0);

    cartHost.innerHTML = `
        <h2 id="cart">Carrinho</h2>
        <p class="hintText">Estado persistente no browser para simular a experiência de compra.</p>
        ${
            items.length
                ? `
                    <div class="cartList">
                        ${items.map((item) => `
                            <article class="cartItem">
                                <div class="cartItemTop">
                                    <strong>${escapeHtml(item.product.name)}</strong>
                                    <span>${formatCurrency(item.product.price)}</span>
                                </div>
                                <p>${escapeHtml(item.product.description)}</p>
                                <div class="cartItemTop">
                                    <div class="qtyControls">
                                        <button type="button" class="iconButton" data-cart-change="${item.product.id}" data-cart-delta="-1">-</button>
                                        <span>${item.quantity}</span>
                                        <button type="button" class="iconButton" data-cart-change="${item.product.id}" data-cart-delta="1">+</button>
                                    </div>
                                    <strong>${formatCurrency(item.quantity * item.product.price)}</strong>
                                </div>
                            </article>
                        `).join("")}
                    </div>
                    <div class="cartSummary">
                        <div class="cartItemTop">
                            <span>Subtotal</span>
                            <strong>${formatCurrency(subtotal)}</strong>
                        </div>
                        <div class="buttonRow">
                            <button type="button" class="btn btnPrimary btnSmall" data-cart-checkout="true">Simular checkout</button>
                            <button type="button" class="btn btnGhost btnSmall" data-cart-clear="true">Limpar</button>
                        </div>
                    </div>
                `
                : `
                    <div class="emptyState">
                        <h3>Carrinho vazio</h3>
                        <p>Adiciona alguns produtos para testar a persistência local.</p>
                    </div>
                `
        }
    `;

    cartHost.querySelectorAll("[data-cart-change]").forEach((button) => {
        button.addEventListener("click", () => {
            changeCartQuantity(Number(button.dataset.cartChange), Number(button.dataset.cartDelta));
        });
    });

    cartHost.querySelector("[data-cart-clear]")?.addEventListener("click", () => {
        saveCart([]);
        renderShell();
        renderStorePage();
        showToast("Carrinho limpo.");
    });

    cartHost.querySelector("[data-cart-checkout]")?.addEventListener("click", () => {
        if (!getCurrentUser()) {
            showToast("Faz login para concluir a compra demo.", "error");
            window.location.href = "account.html";
            return;
        }
        saveCart([]);
        renderShell();
        renderStorePage();
        showToast("Checkout simulado com sucesso.");
    });
}

function changeCartQuantity(productId, delta) {
    const cart = getCart();
    const item = cart.find((entry) => entry.productId === productId);
    if (!item) return;
    item.quantity += delta;
    saveCart(cart.filter((entry) => entry.quantity > 0));
    renderShell();
    renderStorePage();
}

function renderAccountPage() {
    const root = document.getElementById("accountRoot");
    if (!root) return;

    const user = getCurrentUser();

    if (!user) {
        root.innerHTML = `
            <div class="authSplit">
                <section class="authCard">
                    <span class="eyebrow">Iniciar sessão</span>
                    <h2>Entrar com conta demo</h2>
                    <p class="hintText">Podes usar email ou nome de utilizador.</p>
                    <form id="loginForm" class="formGrid formGrid--single">
                        <div class="field">
                            <label for="loginIdentifier">Email ou utilizador</label>
                            <input id="loginIdentifier" name="identifier" placeholder="admin@djabusabi.pt" required>
                        </div>
                        <div class="field">
                            <label for="loginPassword">Password</label>
                            <input id="loginPassword" type="password" name="password" placeholder="Admin123" required>
                        </div>
                        <div class="accountActionRow">
                            <button type="submit" class="btn btnPrimary">Entrar</button>
                            <button type="button" class="btn btnGhost" data-demo-fill="admin">Usar admin</button>
                            <button type="button" class="btn btnGhost" data-demo-fill="client">Usar cliente</button>
                        </div>
                    </form>
                </section>

                <section class="authCard">
                    <span class="eyebrow">Registo</span>
                    <h2>Criar nova conta local</h2>
                    <p class="hintText">A conta fica guardada no teu browser e também aparece no painel admin demo.</p>
                    <form id="signupForm" class="formGrid">
                        <div class="field">
                            <label for="signupFirstName">Nome</label>
                            <input id="signupFirstName" name="firstname" required>
                        </div>
                        <div class="field">
                            <label for="signupLastName">Apelido</label>
                            <input id="signupLastName" name="lastname" required>
                        </div>
                        <div class="field">
                            <label for="signupUsername">Utilizador</label>
                            <input id="signupUsername" name="username" required>
                        </div>
                        <div class="field">
                            <label for="signupEmail">Email</label>
                            <input id="signupEmail" type="email" name="email" required>
                        </div>
                        <div class="field">
                            <label for="signupBirthdate">Data de nascimento</label>
                            <input id="signupBirthdate" type="date" name="birthdate" required>
                        </div>
                        <div class="field">
                            <label for="signupPassword">Password</label>
                            <input id="signupPassword" type="password" name="password" required>
                        </div>
                        <div class="field">
                            <label for="signupConfirmPassword">Confirmar password</label>
                            <input id="signupConfirmPassword" type="password" name="confirmPassword" required>
                        </div>
                        <div class="field">
                            <label for="signupCity">Cidade</label>
                            <input id="signupCity" name="city" placeholder="Porto">
                        </div>
                        <div class="accountActionRow">
                            <button type="submit" class="btn btnPrimary">Criar conta</button>
                        </div>
                    </form>
                </section>
            </div>
        `;

        root.querySelectorAll("[data-demo-fill]").forEach((button) => {
            button.addEventListener("click", () => {
                const adminDemo = button.dataset.demoFill === "admin";
                root.querySelector("#loginIdentifier").value = adminDemo ? "admin@djabusabi.pt" : "cliente@djabusabi.pt";
                root.querySelector("#loginPassword").value = adminDemo ? "Admin123" : "Cliente123";
            });
        });

        root.querySelector("#loginForm")?.addEventListener("submit", handleLoginSubmit);
        root.querySelector("#signupForm")?.addEventListener("submit", handleSignupSubmit);
        return;
    }

    root.innerHTML = `
        <div class="accountGrid">
            <section class="panel">
                <span class="eyebrow">Resumo</span>
                <h2>Olá ${escapeHtml(user.username)}</h2>
                <p class="hintText">Esta área substitui os formulários da conta PHP por persistência local no browser.</p>

                <div class="summaryGrid">
                    <div class="summaryCard">
                        <strong>${escapeHtml(user.permissions)}</strong>
                        <span>Permissões</span>
                    </div>
                    <div class="summaryCard">
                        <strong>${cartCount()}</strong>
                        <span>Itens no carrinho</span>
                    </div>
                    <div class="summaryCard">
                        <strong>${escapeHtml(user.address.city || "Sem cidade")}</strong>
                        <span>Cidade</span>
                    </div>
                </div>

                <form id="profileForm" class="formGrid" style="margin-top: 1rem;">
                    <div class="field">
                        <label for="profileFirstName">Nome</label>
                        <input id="profileFirstName" name="firstname" value="${escapeHtml(user.personalData.firstname)}" required>
                    </div>
                    <div class="field">
                        <label for="profileLastName">Apelido</label>
                        <input id="profileLastName" name="lastname" value="${escapeHtml(user.personalData.lastname)}" required>
                    </div>
                    <div class="field">
                        <label for="profileUsername">Utilizador</label>
                        <input id="profileUsername" name="username" value="${escapeHtml(user.username)}" required>
                    </div>
                    <div class="field">
                        <label for="profileEmail">Email</label>
                        <input id="profileEmail" type="email" name="email" value="${escapeHtml(user.email)}" required>
                    </div>
                    <div class="field">
                        <label for="profileBirthdate">Data de nascimento</label>
                        <input id="profileBirthdate" type="date" name="birthdate" value="${escapeHtml(user.personalData.birthdate)}" required>
                    </div>
                    <div class="accountActionRow">
                        <button type="submit" class="btn btnPrimary">Guardar dados pessoais</button>
                    </div>
                </form>
            </section>

            <section class="panel">
                <span class="eyebrow">Morada e segurança</span>
                <h2>Configurações da conta</h2>

                <form id="addressForm" class="formGrid">
                    <div class="field">
                        <label for="addressStreet">Rua</label>
                        <input id="addressStreet" name="street" value="${escapeHtml(user.address.street)}">
                    </div>
                    <div class="field">
                        <label for="addressCity">Cidade</label>
                        <input id="addressCity" name="city" value="${escapeHtml(user.address.city)}">
                    </div>
                    <div class="field">
                        <label for="addressPostalCode">Código postal</label>
                        <input id="addressPostalCode" name="postalcode" value="${escapeHtml(user.address.postalcode)}">
                    </div>
                    <div class="field">
                        <label for="addressPhone">Telefone</label>
                        <input id="addressPhone" name="phonenumber" value="${escapeHtml(user.address.phonenumber)}">
                    </div>
                    <div class="field">
                        <label for="addressNif">NIF</label>
                        <input id="addressNif" name="nif" value="${escapeHtml(user.address.nif)}">
                    </div>
                    <div class="accountActionRow">
                        <button type="submit" class="btn btnGhost">Guardar morada</button>
                    </div>
                </form>

                <form id="passwordForm" class="formGrid formGrid--single" style="margin-top: 1rem;">
                    <div class="field">
                        <label for="currentPassword">Password atual</label>
                        <input id="currentPassword" type="password" name="currentPassword" required>
                    </div>
                    <div class="field">
                        <label for="newPassword">Nova password</label>
                        <input id="newPassword" type="password" name="newPassword" required>
                    </div>
                    <div class="field">
                        <label for="confirmPassword">Confirmar nova password</label>
                        <input id="confirmPassword" type="password" name="confirmPassword" required>
                    </div>
                    <div class="accountActionRow">
                        <button type="submit" class="btn btnGhost">Alterar password</button>
                        ${user.permissions === "admin" ? '<a href="admin.html" class="btn btnPrimary">Abrir admin</a>' : ""}
                    </div>
                </form>
            </section>
        </div>
    `;

    root.querySelector("#profileForm")?.addEventListener("submit", handleProfileSubmit);
    root.querySelector("#addressForm")?.addEventListener("submit", handleAddressSubmit);
    root.querySelector("#passwordForm")?.addEventListener("submit", handlePasswordSubmit);
}

function handleLoginSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const user = getUsers().find((entry) => {
        return entry.email.toLowerCase() === identifier || entry.username.toLowerCase() === identifier;
    });

    if (!user || user.password !== password) {
        showToast("Credenciais inválidas.", "error");
        return;
    }

    setSession(user.id);
    renderShell();
    renderAccountPage();
    showToast(`Sessão iniciada como ${user.username}.`);
}

function handleSignupSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (password !== confirmPassword) {
        showToast("As passwords não coincidem.", "error");
        return;
    }

    const users = getUsers();
    const username = String(formData.get("username") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const alreadyExists = users.some((user) => {
        return user.username.toLowerCase() === username.toLowerCase() || user.email.toLowerCase() === email;
    });
    if (alreadyExists) {
        showToast("Já existe um utilizador com esse email ou nome.", "error");
        return;
    }

    const newUser = {
        id: Math.max(...users.map((user) => user.id), 0) + 1,
        username,
        email,
        password,
        permissions: "client",
        personalData: {
            firstname: String(formData.get("firstname") || ""),
            lastname: String(formData.get("lastname") || ""),
            birthdate: String(formData.get("birthdate") || ""),
        },
        address: {
            street: "",
            city: String(formData.get("city") || ""),
            postalcode: "",
            phonenumber: "",
            nif: "",
        },
    };

    users.push(newUser);
    saveUsers(users);
    setSession(newUser.id);
    renderShell();
    renderAccountPage();
    showToast("Conta criada com sucesso.");
}

function handleProfileSubmit(event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const users = getUsers();
    const formData = new FormData(event.currentTarget);
    const nextUsername = String(formData.get("username") || "").trim();
    const nextEmail = String(formData.get("email") || "").trim().toLowerCase();

    const duplicated = users.some((user) => {
        if (user.id === currentUser.id) return false;
        return user.username.toLowerCase() === nextUsername.toLowerCase() || user.email.toLowerCase() === nextEmail;
    });

    if (duplicated) {
        showToast("Já existe outro utilizador com esse nome ou email.", "error");
        return;
    }

    saveUsers(users.map((user) => {
        if (user.id !== currentUser.id) return user;
        return {
            ...user,
            username: nextUsername,
            email: nextEmail,
            personalData: {
                firstname: String(formData.get("firstname") || ""),
                lastname: String(formData.get("lastname") || ""),
                birthdate: String(formData.get("birthdate") || ""),
            },
        };
    }));

    renderShell();
    renderAccountPage();
    showToast("Dados pessoais atualizados.");
}

function handleAddressSubmit(event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const formData = new FormData(event.currentTarget);
    saveUsers(getUsers().map((user) => {
        if (user.id !== currentUser.id) return user;
        return {
            ...user,
            address: {
                street: String(formData.get("street") || ""),
                city: String(formData.get("city") || ""),
                postalcode: String(formData.get("postalcode") || ""),
                phonenumber: String(formData.get("phonenumber") || ""),
                nif: String(formData.get("nif") || ""),
            },
        };
    }));

    renderAccountPage();
    showToast("Morada atualizada.");
}

function handlePasswordSubmit(event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (currentPassword !== currentUser.password) {
        showToast("Password atual incorreta.", "error");
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast("As passwords não coincidem.", "error");
        return;
    }

    saveUsers(getUsers().map((user) => {
        if (user.id !== currentUser.id) return user;
        return { ...user, password: newPassword };
    }));

    event.currentTarget.reset();
    renderAccountPage();
    showToast("Password atualizada.");
}

function renderAdminPage() {
    const root = document.getElementById("adminRoot");
    if (!root) return;

    const user = getCurrentUser();
    if (!user || user.permissions !== "admin") {
        root.innerHTML = `
            <div class="emptyState">
                <span class="eyebrow">Acesso restrito</span>
                <h2>Precisas de entrar com uma conta admin demo.</h2>
                <p>Usa <code>admin@djabusabi.pt</code> com <code>Admin123</code> ou abre a página de conta para iniciar sessão.</p>
                <div class="buttonRow" style="justify-content: center;">
                    <a href="account.html" class="btn btnPrimary">Ir para login</a>
                    <button type="button" class="btn btnGhost" id="quickAdminLoginBtn">Entrar como admin</button>
                </div>
            </div>
        `;

        document.getElementById("quickAdminLoginBtn")?.addEventListener("click", () => {
            setSession(1);
            renderShell();
            renderAdminPage();
            showToast("Sessão admin iniciada.");
        });
        return;
    }

    const products = getProducts();
    const users = getUsers();
    const editingProduct = products.find((product) => product.id === adminState.editingProductId) || null;
    const editingUser = users.find((entry) => entry.id === adminState.editingUserId) || null;

    root.innerHTML = `
        <div class="dashboardMetrics">
            <div class="metricTile">
                <strong class="metricValue">${products.length}</strong>
                <span>Produtos</span>
                <p class="hintText">Itens disponíveis no catálogo local.</p>
            </div>
            <div class="metricTile">
                <strong class="metricValue">${users.length}</strong>
                <span>Utilizadores</span>
                <p class="hintText">Contas guardadas no browser.</p>
            </div>
            <div class="metricTile">
                <strong class="metricValue">${users.filter((entry) => entry.permissions === "admin").length}</strong>
                <span>Admins</span>
                <p class="hintText">Permissões elevadas configuradas.</p>
            </div>
            <div class="metricTile">
                <strong class="metricValue">${cartCount()}</strong>
                <span>Itens em carrinho</span>
                <p class="hintText">Estado atual do carrinho demo.</p>
            </div>
        </div>

        <div class="adminGrid" style="margin-top: 1rem;">
            <section class="adminSection">
                <span class="eyebrow">Produtos</span>
                <h2>${editingProduct ? "Editar produto" : "Adicionar produto"}</h2>
                <form id="productForm" class="formGrid">
                    <input type="hidden" name="id" value="${editingProduct ? editingProduct.id : ""}">
                    <div class="field">
                        <label for="productName">Nome</label>
                        <input id="productName" name="name" value="${escapeHtml(editingProduct?.name || "")}" required>
                    </div>
                    <div class="field">
                        <label for="productPrice">Preço</label>
                        <input id="productPrice" name="price" type="number" step="0.01" value="${escapeHtml(editingProduct?.price ?? "")}" required>
                    </div>
                    <div class="field" style="grid-column: 1 / -1;">
                        <label for="productDescription">Descrição</label>
                        <textarea id="productDescription" name="description" required>${escapeHtml(editingProduct?.description || "")}</textarea>
                    </div>
                    <div class="field">
                        <label for="productFilter">Categoria</label>
                        <select id="productFilter" name="filter" required>
                            ${FILTERS.map((filter) => `
                                <option value="${filter.id}" ${editingProduct?.filter === filter.id ? "selected" : ""}>${escapeHtml(filter.label)}</option>
                            `).join("")}
                        </select>
                    </div>
                    <div class="field">
                        <label for="productStock">Disponibilidade</label>
                        <select id="productStock" name="stock" required>
                            ${STOCKS.map((stock) => `
                                <option value="${stock.id}" ${editingProduct?.stock === stock.id ? "selected" : ""}>${escapeHtml(stock.label)}</option>
                            `).join("")}
                        </select>
                    </div>
                    <div class="field" style="grid-column: 1 / -1;">
                        <label for="productImage">Imagem</label>
                        <select id="productImage" name="image">
                            ${IMAGE_OPTIONS.map((image) => `
                                <option value="${image.value}" ${editingProduct?.image === image.value ? "selected" : ""}>${escapeHtml(image.label)}</option>
                            `).join("")}
                        </select>
                    </div>
                    <div class="accountActionRow" style="grid-column: 1 / -1;">
                        <button type="submit" class="btn btnPrimary">${editingProduct ? "Guardar produto" : "Adicionar produto"}</button>
                        ${editingProduct ? '<button type="button" class="btn btnGhost" id="cancelProductEditBtn">Cancelar edição</button>' : ""}
                    </div>
                </form>

                <div class="tableList">
                    ${products.map((product) => `
                        <article class="tableCard">
                            <div class="listItemHeader">
                                <strong>${escapeHtml(product.name)}</strong>
                                <span>${formatCurrency(product.price)}</span>
                            </div>
                            <p>${escapeHtml(product.description)}</p>
                            <div class="tableMeta">${escapeHtml(filterLabel(product.filter))} · ${escapeHtml(stockMeta(product.stock).label)}</div>
                            <div class="buttonRow">
                                <button type="button" class="btn btnGhost btnSmall" data-edit-product="${product.id}">Editar</button>
                                <button type="button" class="btn btnDanger btnSmall" data-delete-product="${product.id}">Remover</button>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>

            <section class="adminSection">
                <span class="eyebrow">Utilizadores</span>
                <h2>${editingUser ? "Editar utilizador" : "Adicionar utilizador"}</h2>
                <form id="userForm" class="formGrid">
                    <input type="hidden" name="id" value="${editingUser ? editingUser.id : ""}">
                    <div class="field">
                        <label for="adminUsername">Utilizador</label>
                        <input id="adminUsername" name="username" value="${escapeHtml(editingUser?.username || "")}" required>
                    </div>
                    <div class="field">
                        <label for="adminEmail">Email</label>
                        <input id="adminEmail" type="email" name="email" value="${escapeHtml(editingUser?.email || "")}" required>
                    </div>
                    <div class="field">
                        <label for="adminPassword">Password ${editingUser ? "(opcional)" : ""}</label>
                        <input id="adminPassword" type="password" name="password" ${editingUser ? "" : "required"}>
                    </div>
                    <div class="field">
                        <label for="adminPermissions">Permissões</label>
                        <select id="adminPermissions" name="permissions">
                            <option value="client" ${editingUser?.permissions === "client" ? "selected" : ""}>Cliente</option>
                            <option value="admin" ${editingUser?.permissions === "admin" ? "selected" : ""}>Administrador</option>
                        </select>
                    </div>
                    <div class="accountActionRow" style="grid-column: 1 / -1;">
                        <button type="submit" class="btn btnPrimary">${editingUser ? "Guardar utilizador" : "Adicionar utilizador"}</button>
                        ${editingUser ? '<button type="button" class="btn btnGhost" id="cancelUserEditBtn">Cancelar edição</button>' : ""}
                    </div>
                </form>

                <div class="tableList">
                    ${users.map((entry) => `
                        <article class="tableCard">
                            <div class="listItemHeader">
                                <strong>${escapeHtml(entry.username)}</strong>
                                <span>${escapeHtml(entry.permissions)}</span>
                            </div>
                            <p>${escapeHtml(entry.email)}</p>
                            <div class="tableMeta">${escapeHtml(entry.personalData.firstname || "")} ${escapeHtml(entry.personalData.lastname || "")}</div>
                            <div class="buttonRow">
                                <button type="button" class="btn btnGhost btnSmall" data-edit-user="${entry.id}">Editar</button>
                                <button type="button" class="btn btnDanger btnSmall" data-delete-user="${entry.id}">Remover</button>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>
        </div>
    `;

    root.querySelector("#productForm")?.addEventListener("submit", handleProductSubmit);
    root.querySelector("#userForm")?.addEventListener("submit", handleUserSubmit);
    root.querySelector("#cancelProductEditBtn")?.addEventListener("click", () => {
        adminState.editingProductId = null;
        renderAdminPage();
    });
    root.querySelector("#cancelUserEditBtn")?.addEventListener("click", () => {
        adminState.editingUserId = null;
        renderAdminPage();
    });

    root.querySelectorAll("[data-edit-product]").forEach((button) => {
        button.addEventListener("click", () => {
            adminState.editingProductId = Number(button.dataset.editProduct);
            renderAdminPage();
        });
    });
    root.querySelectorAll("[data-delete-product]").forEach((button) => {
        button.addEventListener("click", () => {
            deleteProduct(Number(button.dataset.deleteProduct));
        });
    });
    root.querySelectorAll("[data-edit-user]").forEach((button) => {
        button.addEventListener("click", () => {
            adminState.editingUserId = Number(button.dataset.editUser);
            renderAdminPage();
        });
    });
    root.querySelectorAll("[data-delete-user]").forEach((button) => {
        button.addEventListener("click", () => {
            deleteUser(Number(button.dataset.deleteUser));
        });
    });
}

function handleProductSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const products = getProducts();
    const productId = Number(formData.get("id") || 0);
    const nextProduct = {
        id: productId || Math.max(...products.map((product) => product.id), 0) + 1,
        name: String(formData.get("name") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        price: Number(formData.get("price") || 0),
        stock: String(formData.get("stock") || "available"),
        filter: String(formData.get("filter") || FILTERS[0].id),
        image: String(formData.get("image") || IMAGE_OPTIONS[0].value),
    };

    saveProducts(productId
        ? products.map((product) => (product.id === productId ? nextProduct : product))
        : [...products, nextProduct]);

    adminState.editingProductId = null;
    renderShell();
    renderAdminPage();
    showToast(productId ? "Produto atualizado." : "Produto adicionado.");
}

function deleteProduct(productId) {
    saveProducts(getProducts().filter((product) => product.id !== productId));
    saveCart(getCart().filter((item) => item.productId !== productId));
    adminState.editingProductId = null;
    renderShell();
    renderAdminPage();
    showToast("Produto removido.");
}

function handleUserSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const users = getUsers();
    const userId = Number(formData.get("id") || 0);
    const username = String(formData.get("username") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();

    const duplicated = users.some((user) => {
        if (user.id === userId) return false;
        return user.username.toLowerCase() === username.toLowerCase() || user.email.toLowerCase() === email;
    });
    if (duplicated) {
        showToast("Já existe um utilizador com esse email ou nome.", "error");
        return;
    }

    if (userId) {
        saveUsers(users.map((user) => {
            if (user.id !== userId) return user;
            const submittedPassword = String(formData.get("password") || "");
            return {
                ...user,
                username,
                email,
                permissions: String(formData.get("permissions") || "client"),
                password: submittedPassword || user.password,
            };
        }));
        showToast("Utilizador atualizado.");
    } else {
        const newUser = {
            id: Math.max(...users.map((user) => user.id), 0) + 1,
            username,
            email,
            password: String(formData.get("password") || ""),
            permissions: String(formData.get("permissions") || "client"),
            personalData: { firstname: "", lastname: "", birthdate: "" },
            address: { street: "", city: "", postalcode: "", phonenumber: "", nif: "" },
        };
        saveUsers([...users, newUser]);
        showToast("Utilizador adicionado.");
    }

    adminState.editingUserId = null;
    renderShell();
    renderAdminPage();
}

function deleteUser(userId) {
    const currentUser = getCurrentUser();
    if (currentUser?.id === userId) {
        showToast("Não podes remover a sessão admin atual.", "error");
        return;
    }

    const users = getUsers();
    const targetUser = users.find((user) => user.id === userId);
    if (!targetUser) return;

    if (targetUser.permissions === "admin" && users.filter((user) => user.permissions === "admin").length <= 1) {
        showToast("Tem de existir pelo menos um admin.", "error");
        return;
    }

    saveUsers(users.filter((user) => user.id !== userId));
    adminState.editingUserId = null;
    renderShell();
    renderAdminPage();
    showToast("Utilizador removido.");
}

document.addEventListener("DOMContentLoaded", () => {
    seedData();
    renderShell();
    renderCurrentPage();
});
