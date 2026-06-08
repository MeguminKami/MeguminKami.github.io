import {
  cloneJson,
  formatOrderDate,
  isEmail,
  normalizeText,
  toPositiveInteger
} from "./utils.js";

const STORAGE_KEY = "djabuloja_runtime_v1";
const STATE_CHANGE_EVENT = "dbs:state-changed";

const SETTINGS_URL = new URL("../data/settings.json", import.meta.url);
const PRODUCTS_URL = new URL("../data/products.json", import.meta.url);
const FILTERS_URL = new URL("../data/filters.json", import.meta.url);
const STOCK_URL = new URL("../data/stock.json", import.meta.url);
const USERS_URL = new URL("../data/users.json", import.meta.url);
const PERSONAL_DATA_URL = new URL("../data/personalData.json", import.meta.url);
const ADDRESSES_URL = new URL("../data/addresses.json", import.meta.url);
const ORDERS_URL = new URL("../data/orders.json", import.meta.url);
const SHOPPING_CART_URL = new URL("../data/shoppingCart.json", import.meta.url);
const PAYMENT_METHODS_URL = new URL("../data/paymentMethods.json", import.meta.url);

let bootPromise = null;

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

async function loadSeedData() {
  const [
    settings,
    products,
    filters,
    stock,
    users,
    personalData,
    addresses,
    orders,
    shoppingCart,
    paymentMethods
  ] = await Promise.all([
    fetchJson(SETTINGS_URL),
    fetchJson(PRODUCTS_URL),
    fetchJson(FILTERS_URL),
    fetchJson(STOCK_URL),
    fetchJson(USERS_URL),
    fetchJson(PERSONAL_DATA_URL),
    fetchJson(ADDRESSES_URL),
    fetchJson(ORDERS_URL),
    fetchJson(SHOPPING_CART_URL),
    fetchJson(PAYMENT_METHODS_URL)
  ]);

  return {
    settings,
    products,
    filters,
    stock,
    users,
    personalData,
    addresses,
    orders,
    shoppingCart,
    paymentMethods
  };
}

function createInitialState(seed) {
  return {
    _meta: {
      seedVersion: seed.settings.seedVersion,
      bootstrappedAt: new Date().toISOString()
    },
    settings: cloneJson(seed.settings),
    paymentMethods: cloneJson(seed.paymentMethods),
    filters: cloneJson(seed.filters),
    stock: cloneJson(seed.stock),
    users: cloneJson(seed.users),
    personalData: cloneJson(seed.personalData),
    addresses: cloneJson(seed.addresses),
    products: cloneJson(seed.products),
    orders: cloneJson(seed.orders),
    shoppingCart: cloneJson(seed.shoppingCart),
    session: {
      userId: null,
      paymentMethod: null
    }
  };
}

function dispatchStateChanged() {
  window.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT));
}

function readState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function writeState(state, emitEvent = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (emitEvent) {
    dispatchStateChanged();
  }
}

function updateState(mutator) {
  const current = readState();
  const draft = cloneJson(current);
  mutator(draft);
  writeState(draft);
  return draft;
}

function getNextId(collection) {
  return collection.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
}

function getStateOrThrow() {
  const state = readState();
  if (!state) {
    throw new Error("Runtime state has not been initialized.");
  }

  return state;
}

export async function ensureRuntime() {
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    const settings = await fetchJson(SETTINGS_URL);
    const existing = readState();
    if (existing?._meta?.seedVersion === settings.seedVersion) {
      return existing;
    }

    const seed = await loadSeedData();
    const initialState = createInitialState(seed);
    writeState(initialState, false);
    return initialState;
  })();

  return bootPromise;
}

export function onStateChanged(handler) {
  window.addEventListener(STATE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(STATE_CHANGE_EVENT, handler);
}

export function getRuntimeState() {
  return cloneJson(getStateOrThrow());
}

export function getSettings() {
  return getRuntimeState().settings;
}

export function getSession() {
  return cloneJson(getStateOrThrow().session);
}

export function isAuthenticated() {
  return Boolean(getStateOrThrow().session.userId);
}

export function getCurrentUser() {
  const state = getStateOrThrow();
  if (!state.session.userId) {
    return null;
  }

  return cloneJson(state.users.find((user) => Number(user.id) === Number(state.session.userId)) ?? null);
}

export function isAdminUser() {
  const user = getCurrentUser();
  return user?.permissions === "admin";
}

export function logoutCurrentUser() {
  updateState((state) => {
    state.session.userId = null;
    state.session.paymentMethod = null;
  });
}

export function getUserById(id) {
  const state = getStateOrThrow();
  return cloneJson(state.users.find((user) => Number(user.id) === Number(id)) ?? null);
}

export function getUserPersonalDataById(id) {
  const state = getStateOrThrow();
  return cloneJson(state.personalData.find((item) => Number(item.id) === Number(id)) ?? null);
}

export function getUserAddressById(id) {
  const state = getStateOrThrow();
  return cloneJson(state.addresses.find((item) => Number(item.id) === Number(id)) ?? null);
}

export function loginUser(identifier, password) {
  const state = getStateOrThrow();
  const trimmedIdentifier = String(identifier ?? "").trim();
  const user = state.users.find((item) => item.username === trimmedIdentifier || item.email === trimmedIdentifier);

  if (!user) {
    return {
      success: false,
      message: isEmail(trimmedIdentifier)
        ? "Este email ainda n\u00e3o pertence a um Djabusabi!"
        : "Este nome de utilizador ainda n\u00e3o pertence a um Djabusabi!"
    };
  }

  if (user.password !== password) {
    return {
      success: false,
      message: "Erras-te a password nha mano!"
    };
  }

  updateState((draft) => {
    draft.session.userId = user.id;
    draft.session.paymentMethod = null;
  });

  return {
    success: true,
    user: cloneJson(user)
  };
}

export function createClientUser({ username, email, password, confirmPassword }) {
  const state = getStateOrThrow();
  const trimmedUsername = String(username ?? "").trim();
  const trimmedEmail = String(email ?? "").trim();

  if (state.users.some((user) => user.username === trimmedUsername)) {
    return {
      success: false,
      message: "J\u00e1 existe um Djabusabi com o teu nome de utilizador!"
    };
  }

  if (state.users.some((user) => user.email === trimmedEmail)) {
    return {
      success: false,
      message: "J\u00e1 existe um Djabusabi com o teu email!"
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: "As passwords n\u00e3o coincidem!"
    };
  }

  const nextId = getNextId(state.users);
  updateState((draft) => {
    draft.users.push({
      id: nextId,
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      permissions: "client"
    });
    draft.personalData.push({
      id: nextId,
      firstname: "",
      lastname: "",
      birthdate: ""
    });
    draft.addresses.push({
      id: nextId,
      street: "",
      city: "",
      postalcode: "",
      phonenumber: "",
      nif: ""
    });
    draft.session.userId = nextId;
    draft.session.paymentMethod = null;
  });

  return {
    success: true,
    user: getUserById(nextId)
  };
}

export function updateCurrentUserProfile(userId, payload) {
  const state = getStateOrThrow();
  const username = String(payload.username ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const duplicateUser = state.users.find(
    (user) =>
      Number(user.id) !== Number(userId) && (user.username === username || user.email === email)
  );

  if (duplicateUser?.username === username) {
    return {
      success: false,
      message: "J\u00e1 existe um utilizador com esse nome!"
    };
  }

  if (duplicateUser?.email === email) {
    return {
      success: false,
      message: "J\u00e1 existe um utilizador com esse email!"
    };
  }

  updateState((draft) => {
    const user = draft.users.find((item) => Number(item.id) === Number(userId));
    const personalData = draft.personalData.find((item) => Number(item.id) === Number(userId));

    if (user) {
      user.username = username;
      user.email = email;
    }

    if (personalData) {
      personalData.firstname = String(payload.firstname ?? "").trim();
      personalData.lastname = String(payload.lastname ?? "").trim();
      personalData.birthdate = String(payload.birthdate ?? "").trim();
    }
  });

  return {
    success: true,
    message: "Dados pessoais atualizados com sucesso!"
  };
}

export function updateCurrentUserPassword(userId, oldPassword, newPassword, confirmPassword) {
  const state = getStateOrThrow();
  const user = state.users.find((item) => Number(item.id) === Number(userId));

  if (!user || user.password !== oldPassword) {
    return {
      success: false,
      message: "Erro ao atualizar a password!"
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      message: "As passwords n\u00e3o coincidem!"
    };
  }

  updateState((draft) => {
    const currentUser = draft.users.find((item) => Number(item.id) === Number(userId));
    if (currentUser) {
      currentUser.password = newPassword;
    }
  });

  return {
    success: true,
    message: "Password atualizada com sucesso!"
  };
}

export function updateCurrentUserAddress(userId, payload) {
  updateState((draft) => {
    const address = draft.addresses.find((item) => Number(item.id) === Number(userId));
    if (!address) {
      return;
    }

    address.street = String(payload.street ?? "").trim();
    address.city = String(payload.city ?? "").trim();
    address.postalcode = String(payload.postalcode ?? "").trim();
    address.phonenumber = String(payload.phonenumber ?? "").trim();
    address.nif = String(payload.nif ?? "").trim();
  });

  return {
    success: true,
    message: "Morada atualizada com sucesso!"
  };
}

function getStockClassById(id) {
  switch (String(id)) {
    case "1":
      return "available";
    case "2":
      return "lastunits";
    case "3":
      return "unavailable";
    case "4":
      return "soonavailable";
    default:
      return "unavailable";
  }
}

function findStockStatus(state, stockId) {
  return state.stock.find((item) => Number(item.id) === Number(stockId))?.status ?? "Indispon\u00edvel";
}

function resolveImagePath(product) {
  if (!product) {
    return "";
  }

  if (product.imageType === "dataUrl") {
    return product.image;
  }

  return new URL(`../assets/store/${product.image}`, import.meta.url).href;
}

function hydrateProduct(state, product) {
  return {
    ...cloneJson(product),
    stockStatus: findStockStatus(state, product.stock),
    stockClass: getStockClassById(product.stock),
    imageUrl: resolveImagePath(product)
  };
}

export function getAllFilters() {
  return getRuntimeState().filters;
}

export function getAllStockStates() {
  return getRuntimeState().stock;
}

export function getAllProducts() {
  const state = getStateOrThrow();
  return state.products.map((product) => hydrateProduct(state, product));
}

export function getProductById(productId) {
  const state = getStateOrThrow();
  const product = state.products.find((item) => Number(item.id) === Number(productId));
  if (!product) {
    return null;
  }

  return hydrateProduct(state, product);
}

export function queryCatalog({ filterIds = [], stockIds = [], order = "price_asc", search = "" } = {}) {
  const state = getStateOrThrow();
  const numericFilterIds = filterIds.map((item) => Number(item));
  const numericStockIds = stockIds.map((item) => Number(item));
  const normalizedSearch = normalizeText(search);

  let products = state.products.filter((product) => {
    const matchesFilter =
      numericFilterIds.length === 0 || numericFilterIds.includes(Number(product.filter));
    const matchesStock =
      numericStockIds.length === 0 || numericStockIds.includes(Number(product.stock));
    const matchesSearch =
      normalizedSearch.length <= 1 || normalizeText(product.name).includes(normalizedSearch);

    return matchesFilter && matchesStock && matchesSearch;
  });

  products = products.slice().sort((left, right) => {
    switch (order) {
      case "price_desc":
        return Number(right.price) - Number(left.price);
      case "name_asc":
        return String(left.name).localeCompare(String(right.name));
      case "name_desc":
        return String(right.name).localeCompare(String(left.name));
      case "price_asc":
      default:
        return Number(left.price) - Number(right.price);
    }
  });

  const hydratedItems = products.map((product) => hydrateProduct(state, product));
  const filters = state.filters.map((filter) => ({
    id: filter.id,
    name: filter.name,
    count: products.filter((product) => Number(product.filter) === Number(filter.id)).length
  }));
  const stocks = state.stock.map((stock) => ({
    id: stock.id,
    status: stock.status,
    count: products.filter((product) => Number(product.stock) === Number(stock.id)).length
  }));

  return {
    items: hydratedItems,
    filters,
    stocks
  };
}

export function getAdminCatalog(search = "") {
  const state = getStateOrThrow();
  const normalizedSearch = normalizeText(search);
  const filteredProducts = state.products.filter((product) => {
    if (normalizedSearch.length <= 1) {
      return true;
    }

    return normalizeText(product.name).includes(normalizedSearch);
  });

  return filteredProducts.map((product) => hydrateProduct(state, product));
}

function getCartEntriesForUser(state, userId) {
  return state.shoppingCart.filter((item) => Number(item.userid) === Number(userId));
}

export function getCartSummary(userId = getCurrentUser()?.id) {
  const state = getStateOrThrow();
  if (!userId) {
    return {
      items: [],
      totalQuantity: 0,
      totalCost: 0
    };
  }

  const cartEntries = getCartEntriesForUser(state, userId);
  const items = cartEntries
    .map((entry) => {
      const product = state.products.find((item) => Number(item.id) === Number(entry.storeitemid));
      if (!product) {
        return null;
      }

      const hydrated = hydrateProduct(state, product);
      return {
        id: hydrated.id,
        name: hydrated.name,
        image: hydrated.image,
        imageUrl: hydrated.imageUrl,
        quantity: Number(entry.quantity),
        price: Number(hydrated.price),
        stockClass: hydrated.stockClass,
        stockStatus: hydrated.stockStatus
      };
    })
    .filter(Boolean);

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalCost = Number(
    items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0).toFixed(2)
  );

  return {
    items,
    totalQuantity,
    totalCost
  };
}

export function isCartEmpty(userId = getCurrentUser()?.id) {
  return getCartSummary(userId).items.length === 0;
}

export function addToCart(userId, storeItemId, quantity) {
  const state = getStateOrThrow();
  const user = state.users.find((item) => Number(item.id) === Number(userId));
  const product = state.products.find((item) => Number(item.id) === Number(storeItemId));
  const normalizedQuantity = Math.max(1, toPositiveInteger(quantity, 1));

  if (!user || !product) {
    return {
      success: false,
      message: "Par\u00e2metros inv\u00e1lidos."
    };
  }

  if (Number(product.stock) === 3 || Number(product.stock) === 4) {
    return {
      success: false,
      message: "Este produto n\u00e3o est\u00e1 dispon\u00edvel."
    };
  }

  updateState((draft) => {
    const cartEntry = draft.shoppingCart.find(
      (item) =>
        Number(item.userid) === Number(userId) &&
        Number(item.storeitemid) === Number(storeItemId)
    );

    if (cartEntry) {
      cartEntry.quantity = Number(cartEntry.quantity) + normalizedQuantity;
      return;
    }

    draft.shoppingCart.push({
      userid: Number(userId),
      storeitemid: Number(storeItemId),
      quantity: normalizedQuantity
    });
  });

  const summary = getCartSummary(userId);
  const updatedItem = summary.items.find((item) => Number(item.id) === Number(storeItemId));

  return {
    success: true,
    quantity: updatedItem?.quantity ?? normalizedQuantity
  };
}

export function removeCartItem(userId, storeItemId) {
  updateState((draft) => {
    draft.shoppingCart = draft.shoppingCart.filter(
      (item) =>
        !(
          Number(item.userid) === Number(userId) &&
          Number(item.storeitemid) === Number(storeItemId)
        )
    );
  });

  return {
    success: true
  };
}

export function clearCart(userId) {
  updateState((draft) => {
    draft.shoppingCart = draft.shoppingCart.filter(
      (item) => Number(item.userid) !== Number(userId)
    );
  });

  return {
    success: true
  };
}

export function getPaymentMethods() {
  return getRuntimeState().paymentMethods;
}

export function setSelectedPaymentMethod(paymentMethodId) {
  const state = getStateOrThrow();
  const paymentMethod = state.paymentMethods.find((item) => item.id === paymentMethodId);

  if (!state.session.userId || !paymentMethod) {
    return {
      success: false
    };
  }

  updateState((draft) => {
    draft.session.paymentMethod = paymentMethodId;
  });

  return {
    success: true
  };
}

export function getSelectedPaymentMethod() {
  const state = getStateOrThrow();
  return cloneJson(
    state.paymentMethods.find((item) => item.id === state.session.paymentMethod) ?? null
  );
}

function createOrderSnapshotItem(product, quantity) {
  return {
    storeitemid: Number(product.id),
    quantity: Number(quantity),
    snapshot: {
      name: product.name,
      price: Number(product.price),
      image: product.image,
      imageType: product.imageType
    }
  };
}

export function finalizePurchase() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return {
      success: false
    };
  }

  const paymentMethod = getSelectedPaymentMethod();
  const summary = getCartSummary(currentUser.id);
  if (!paymentMethod || summary.items.length === 0) {
    return {
      success: false
    };
  }

  const state = getStateOrThrow();
  const nextId = getNextId(state.orders);
  const orderItems = getCartEntriesForUser(state, currentUser.id)
    .map((entry) => {
      const product = state.products.find((item) => Number(item.id) === Number(entry.storeitemid));
      return product ? createOrderSnapshotItem(product, entry.quantity) : null;
    })
    .filter(Boolean);

  updateState((draft) => {
    draft.orders.push({
      id: nextId,
      userid: Number(currentUser.id),
      cost: summary.totalCost,
      date: formatOrderDate(),
      items: orderItems
    });
    draft.shoppingCart = draft.shoppingCart.filter(
      (item) => Number(item.userid) !== Number(currentUser.id)
    );
    draft.session.paymentMethod = null;
  });

  return {
    success: true,
    orderId: nextId
  };
}

function hydrateOrderItem(state, orderItem) {
  const product = state.products.find((item) => Number(item.id) === Number(orderItem.storeitemid));
  const snapshot = orderItem.snapshot ?? null;
  const imageUrl =
    snapshot?.imageType === "dataUrl"
      ? snapshot.image
      : product
        ? resolveImagePath(product)
        : snapshot
          ? new URL(`../assets/store/${snapshot.image}`, import.meta.url).href
          : new URL("../assets/store/preview.png", import.meta.url).href;

  return {
    storeitemid: Number(orderItem.storeitemid),
    quantity: Number(orderItem.quantity),
    name: product?.name ?? snapshot?.name ?? "Produto removido",
    price: Number(product?.price ?? snapshot?.price ?? 0),
    imageUrl,
    image: product?.image ?? snapshot?.image ?? "preview.png"
  };
}

export function getOrdersByUserId(userId = getCurrentUser()?.id) {
  const state = getStateOrThrow();
  if (!userId) {
    return [];
  }

  return state.orders
    .filter((order) => Number(order.userid) === Number(userId))
    .slice()
    .sort((left, right) => Number(right.id) - Number(left.id))
    .map((order) => ({
      ...cloneJson(order),
      items: order.items.map((item) => hydrateOrderItem(state, item))
    }));
}

export function getOrderItems(orderId) {
  const state = getStateOrThrow();
  const order = state.orders.find((item) => Number(item.id) === Number(orderId));
  if (!order) {
    return [];
  }

  return order.items.map((item) => hydrateOrderItem(state, item));
}

export function reorderOrder(orderId) {
  const currentUser = getCurrentUser();
  const state = getStateOrThrow();
  if (!currentUser) {
    return {
      success: false,
      message: "Erro ao adicionar produtos ao carrinho."
    };
  }

  const order = state.orders.find((item) => Number(item.id) === Number(orderId));
  if (!order) {
    return {
      success: false,
      message: "Erro ao adicionar produtos ao carrinho."
    };
  }

  for (const orderItem of order.items) {
    const product = state.products.find((item) => Number(item.id) === Number(orderItem.storeitemid));
    if (!product || Number(product.stock) === 3 || Number(product.stock) === 4) {
      return {
        success: false,
        message: "Um ou mais produtos n\u00e3o est\u00e3o dispon\u00edveis no momento."
      };
    }
  }

  updateState((draft) => {
    order.items.forEach((orderItem) => {
      const cartItem = draft.shoppingCart.find(
        (item) =>
          Number(item.userid) === Number(currentUser.id) &&
          Number(item.storeitemid) === Number(orderItem.storeitemid)
      );

      if (cartItem) {
        cartItem.quantity = Number(cartItem.quantity) + Number(orderItem.quantity);
        return;
      }

      draft.shoppingCart.push({
        userid: Number(currentUser.id),
        storeitemid: Number(orderItem.storeitemid),
        quantity: Number(orderItem.quantity)
      });
    });
  });

  return {
    success: true
  };
}

export function createOrUpdateProduct(payload) {
  const state = getStateOrThrow();
  const parsedPrice = Number(payload.price);

  if (!payload.name || !payload.description || Number.isNaN(parsedPrice)) {
    return {
      success: false,
      message: "Erro ao guardar produto!"
    };
  }

  const filterId = Number(payload.filter);
  const stockId = Number(payload.stock);
  const hasImage = Boolean(payload.image);

  if (!payload.id && !hasImage) {
    return {
      success: false,
      message: "Erro ao guardar produto!"
    };
  }

  if (payload.id) {
    updateState((draft) => {
      const product = draft.products.find((item) => Number(item.id) === Number(payload.id));
      if (!product) {
        return;
      }

      product.name = String(payload.name).trim();
      product.description = String(payload.description).trim();
      product.price = Number(parsedPrice.toFixed(2));
      product.stock = stockId;
      product.filter = filterId;

      if (hasImage) {
        product.image = payload.image;
        product.imageType = payload.imageType ?? "asset";
      }
    });

    return {
      success: true,
      message: "Produto atualizado com sucesso!"
    };
  }

  const nextId = getNextId(state.products);
  updateState((draft) => {
    draft.products.push({
      id: nextId,
      name: String(payload.name).trim(),
      description: String(payload.description).trim(),
      price: Number(parsedPrice.toFixed(2)),
      stock: stockId,
      filter: filterId,
      image: payload.image,
      imageType: payload.imageType ?? "asset"
    });
  });

  return {
    success: true,
    message: "Produto adicionado com sucesso!",
    id: nextId
  };
}

export function deleteProductById(productId) {
  updateState((draft) => {
    draft.products = draft.products.filter((item) => Number(item.id) !== Number(productId));
    draft.shoppingCart = draft.shoppingCart.filter(
      (item) => Number(item.storeitemid) !== Number(productId)
    );
  });

  return {
    success: true
  };
}

export function addFilter(name) {
  const trimmedName = String(name ?? "").trim();
  if (trimmedName.length < 2) {
    return {
      success: false,
      message: "Erro ao adicionar filtro!"
    };
  }

  const state = getStateOrThrow();
  const nextId = getNextId(state.filters);

  updateState((draft) => {
    draft.filters.push({
      id: nextId,
      name: trimmedName
    });
  });

  return {
    success: true,
    message: "Filtro adicionado com sucesso!"
  };
}

export function removeFilterById(filterId) {
  const state = getStateOrThrow();
  const filterInUse = state.products.some((product) => Number(product.filter) === Number(filterId));
  if (filterInUse) {
    return {
      success: false,
      message: "Erro ao remover filtro! O filtro est\u00e1 a ser utilizado por um ou mais produtos."
    };
  }

  updateState((draft) => {
    draft.filters = draft.filters.filter((filter) => Number(filter.id) !== Number(filterId));
  });

  return {
    success: true,
    message: "Filtro removido com sucesso!"
  };
}

export function getAllUsers() {
  return getRuntimeState().users;
}

export function createAdminUser(payload) {
  const state = getStateOrThrow();
  const username = String(payload.username ?? "").trim();
  const email = String(payload.email ?? "").trim();

  if (state.users.some((user) => user.username === username)) {
    return {
      success: false,
      message: "J\u00e1 existe um Djabusabi com o teu nome de utilizador!"
    };
  }

  if (state.users.some((user) => user.email === email)) {
    return {
      success: false,
      message: "J\u00e1 existe um Djabusabi com o teu email!"
    };
  }

  if (payload.password !== payload.confirmPassword) {
    return {
      success: false,
      message: "As passwords n\u00e3o coincidem!"
    };
  }

  const nextId = getNextId(state.users);
  updateState((draft) => {
    draft.users.push({
      id: nextId,
      username,
      email,
      password: payload.password,
      permissions: payload.permissions
    });
    draft.personalData.push({
      id: nextId,
      firstname: "",
      lastname: "",
      birthdate: ""
    });
    draft.addresses.push({
      id: nextId,
      street: "",
      city: "",
      postalcode: "",
      phonenumber: "",
      nif: ""
    });
  });

  return {
    success: true,
    message: "Utilizador adicionado com sucesso!"
  };
}

export function updateUserById(userId, payload) {
  const state = getStateOrThrow();
  const username = String(payload.username ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const duplicateUser = state.users.find(
    (user) =>
      Number(user.id) !== Number(userId) && (user.username === username || user.email === email)
  );

  if (duplicateUser) {
    return {
      success: false,
      message: "Erro ao atualizar utilizador!"
    };
  }

  if (payload.newPassword && payload.newPassword !== payload.confirmPassword) {
    return {
      success: false,
      message: "Passwords n\u00e3o coincidem!"
    };
  }

  updateState((draft) => {
    const user = draft.users.find((item) => Number(item.id) === Number(userId));
    if (!user) {
      return;
    }

    user.username = username;
    user.email = email;
    user.permissions = payload.permissions;

    if (payload.newPassword) {
      user.password = payload.newPassword;
    }
  });

  return {
    success: true,
    message: "Utilizador atualizado com sucesso!"
  };
}

export function deleteUserById(userId) {
  const currentUser = getCurrentUser();
  updateState((draft) => {
    draft.users = draft.users.filter((user) => Number(user.id) !== Number(userId));
    draft.personalData = draft.personalData.filter((item) => Number(item.id) !== Number(userId));
    draft.addresses = draft.addresses.filter((item) => Number(item.id) !== Number(userId));
    draft.shoppingCart = draft.shoppingCart.filter((item) => Number(item.userid) !== Number(userId));
    draft.orders = draft.orders.filter((order) => Number(order.userid) !== Number(userId));

    if (currentUser && Number(currentUser.id) === Number(userId)) {
      draft.session.userId = null;
      draft.session.paymentMethod = null;
    }
  });

  return {
    success: true
  };
}
