import {
  addFilter,
  createAdminUser,
  createOrUpdateProduct,
  deleteProductById,
  deleteUserById,
  getAdminCatalog,
  getAllFilters,
  getAllStockStates,
  getAllUsers,
  getProductById,
  isAdminUser,
  isAuthenticated,
  removeFilterById,
  updateUserById
} from "./db.js";
import {
  consumeSearchHandoff,
  escapeHtml,
  formatPrice,
  readFileAsDataUrl,
  replaceTo,
  toRootUrl,
  updateQuery
} from "./utils.js";

function getPageRoot() {
  return document.getElementById("page-root");
}

function getAdminPageParam() {
  return new URLSearchParams(window.location.search).get("page") ?? "productList";
}

function adminMenuMarkup() {
  return `
    <div class="menu-container" style="min-width: 350px; min-height: 600px;">
      <h2>Menu de funcoes</h2>
      <a href="${toRootUrl("admin/index.html?page=productList")}" class="item">
        <img src="${toRootUrl("assets/icons/shop-list.png")}" alt="">
        <span>Lista de produtos</span>
      </a>
      <a href="${toRootUrl("admin/index.html?page=productAdd")}" class="item">
        <img src="${toRootUrl("assets/icons/shop-add.png")}" alt="">
        <span>Adicionar um novo produto</span>
      </a>
      <a href="${toRootUrl("admin/index.html?page=userList")}" class="item">
        <img src="${toRootUrl("assets/icons/user-list.png")}" alt="">
        <span>Lista de utilizadores</span>
      </a>
      <a href="${toRootUrl("admin/index.html?page=userAdd")}" class="item">
        <img src="${toRootUrl("assets/icons/user-add.png")}" alt="">
        <span>Adicionar um novo utilizador</span>
      </a>
    </div>
  `;
}

function adminShellMarkup(title, content) {
  return `
    <div class="body-content">
      <div class="page-container">
        <div class="page-container-title">
          <h1>${escapeHtml(title)}</h1>
        </div>
        <div class="page-container-bottom">
          ${adminMenuMarkup()}
          ${content}
        </div>
      </div>
    </div>
  `;
}

function productCardMarkup(product) {
  return `
    <div class="item">
      <a href="${product.imageUrl}">
        <div class="image-container">
          <img src="${product.imageUrl}" alt="${escapeHtml(product.name)}">
        </div>
      </a>
      <div class="name">${escapeHtml(product.name)}</div>
      <div class="description">${escapeHtml(product.description)}</div>
      <div class="${escapeHtml(product.stockClass)}">${escapeHtml(product.stockStatus)}</div>
      <div class="price-icons">
        <div class="price">${formatPrice(product.price)}</div>
        <a href="${toRootUrl(`admin/index.html?page=productEdit&itemId=${product.id}`)}" class="edit-button"></a>
        <a href="#" class="delete-button" data-delete-product="${product.id}"></a>
      </div>
    </div>
  `;
}

function renderProductListPage(searchValue = "", deleteProductId = null) {
  const root = getPageRoot();
  const products = getAdminCatalog(searchValue);
  root.innerHTML = adminShellMarkup(
    "Lista de produtos",
    `
      <div class="store-container" id="admin-store-items">
        ${products.map((product) => productCardMarkup(product)).join("")}
      </div>
      ${
        deleteProductId
          ? `
            <div id="delete" class="delete-item-popup" style="display: block;">
              <h2>Remover item da loja?</h2>
              <div class="delete-item-popup-buttons">
                <a href="#" class="delete-item-yes-button" data-confirm-delete-product="${deleteProductId}">Sim</a>
                <a href="#" class="delete-item-no-button" data-cancel-delete>Não</a>
              </div>
            </div>
            <div id="delete-overlay" class="delete-item-overlay" style="display: block;"></div>
          `
          : ""
      }
    `
  );

  const searchBar = document.getElementById("search-bar");
  const initialSearch = consumeSearchHandoff();
  if (initialSearch && !searchValue) {
    searchValue = initialSearch;
  }
  if (searchBar) {
    searchBar.value = searchValue;
    searchBar.oninput = (event) => {
      renderProductListPage(event.target.value);
    };
  }

  root.onclick = (event) => {
    const deleteButton = event.target.closest("[data-delete-product]");
    if (deleteButton) {
      event.preventDefault();
      renderProductListPage(searchBar?.value ?? "", Number(deleteButton.getAttribute("data-delete-product")));
      return;
    }

    const cancelButton = event.target.closest("[data-cancel-delete]");
    if (cancelButton) {
      event.preventDefault();
      renderProductListPage(searchBar?.value ?? "");
      return;
    }

    const confirmButton = event.target.closest("[data-confirm-delete-product]");
    if (confirmButton) {
      event.preventDefault();
      deleteProductById(Number(confirmButton.getAttribute("data-confirm-delete-product")));
      renderProductListPage(searchBar?.value ?? "");
    }
  };
}

function productPreviewMarkup(preview) {
  return `
    <div class="add-item-container-preview">
      <h1>Pre-visualizacao</h1>
      <a href="#">
        <div class="image-container">
          <img src="${preview.imageUrl}" alt="Preview">
        </div>
      </a>
      <div class="name">${escapeHtml(preview.name || "Nome")}</div>
      <div class="description">${escapeHtml(preview.description || "Descricao")}</div>
      <div class="${escapeHtml(preview.stockClass)}">${escapeHtml(preview.stockStatus)}</div>
      <div class="price">${preview.priceText}</div>
    </div>
  `;
}

function findStockMeta(stockId) {
  return getAllStockStates().find((stock) => Number(stock.id) === Number(stockId));
}

function stockClassFromId(stockId) {
  switch (String(stockId)) {
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

function renderProductFormPage(mode, options = {}) {
  const product = mode === "edit" ? getProductById(options.productId) : null;
  if (mode === "edit" && !product) {
    replaceTo("admin/index.html?page=productList");
    return;
  }

  const filters = getAllFilters();
  const stockStates = getAllStockStates();
  const formValues = options.formValues ?? {
    id: product?.id,
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    stock: Number(product?.stock ?? 1),
    filter: Number(product?.filter ?? 1)
  };
  const preview = options.preview ?? {
    name: formValues.name ?? "",
    description: formValues.description ?? "",
    priceText: formValues.price ? formatPrice(formValues.price) : "0.00€",
    stockClass: stockClassFromId(formValues.stock),
    stockStatus: findStockMeta(formValues.stock)?.status ?? "Disponível",
    imageUrl: product?.imageUrl ?? toRootUrl("assets/store/preview.png")
  };

  const root = getPageRoot();
  root.innerHTML = adminShellMarkup(
    mode === "edit" ? "Editar produto" : "Adicionar um novo produto",
    `
      <div class="add-item-container">
        <div class="add-item-container-form">
          <div class="add-item-form">
            <div class="add-item-message-container">
              ${
                options.flash
                  ? `<p class="${options.flash.type === "error" ? "error-message" : "success-message"}">${escapeHtml(options.flash.message)}</p>`
                  : ""
              }
            </div>
            <form id="product-form">
              <input type="text" id="name" name="name" placeholder="Nome do Produto" value="${escapeHtml(formValues.name ?? "")}" required>
              <textarea id="description" name="description" placeholder="Descricao do Produto" required>${escapeHtml(formValues.description ?? "")}</textarea>
              <input type="number" id="price" step="0.01" name="price" placeholder="Preco do Produto" value="${escapeHtml(formValues.price ?? "")}" required>
              <select id="stock" name="stock" required>
                ${stockStates
                  .map(
                    (stock) => `
                      <option value="${stock.id}" ${Number(formValues.stock ?? 1) === Number(stock.id) ? "selected" : ""}>
                        ${escapeHtml(stock.status)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
              <div class="add-remove-filter-container">
                <select id="filter" name="filter" required>
                  ${filters
                    .map(
                      (filter) => `
                        <option value="${filter.id}" ${Number(formValues.filter ?? 1) === Number(filter.id) ? "selected" : ""}>
                          ${escapeHtml(filter.name)}
                        </option>
                      `
                    )
                    .join("")}
                </select>
                <button class="remove-button" type="button" id="remove-filter-button" aria-label="Remove Filter"></button>
              </div>
              <div class="add-remove-filter-container">
                <input type="text" id="newFilter" name="newFilter" placeholder="Adicionar Novo Filtro" pattern="[A-Za-zÀ-ÿ\\s]{2,20}">
                <button class="add-button" type="button" id="add-filter-button" aria-label="Add Filter"></button>
              </div>
              <input type="file" id="image" name="image" ${mode === "add" ? "required" : ""}>
              <div class="add-filter-container">
                <button class="save-button" type="submit">${mode === "edit" ? "Atualizar Produto" : "Adicionar Produto"}</button>
                <button class="save-button" type="button" id="preview-product-button">Pre-visualizar</button>
              </div>
            </form>
          </div>
          ${productPreviewMarkup(preview)}
        </div>
      </div>
    `
  );

  let currentPreviewImage = preview.imageUrl;
  let currentPreviewImageData = options.imageData ?? null;

  async function buildFormState() {
    const form = document.getElementById("product-form");
    const formData = new FormData(form);
    const file = document.getElementById("image").files[0];
    let image = product?.image ?? "";
    let imageType = product?.imageType ?? "asset";
    let imageUrl = currentPreviewImage;

    if (file) {
      image = await readFileAsDataUrl(file);
      imageType = "dataUrl";
      imageUrl = image;
      currentPreviewImage = imageUrl;
      currentPreviewImageData = image;
    } else if (currentPreviewImageData) {
      image = currentPreviewImageData;
      imageType = "dataUrl";
      imageUrl = currentPreviewImageData;
    } else if (product?.imageUrl) {
      imageUrl = product.imageUrl;
    }

    const stockId = Number(formData.get("stock"));
    const stockMeta = findStockMeta(stockId);

    return {
      id: product?.id,
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      stock: stockId,
      filter: Number(formData.get("filter")),
      image,
      imageType,
      preview: {
        name: formData.get("name"),
        description: formData.get("description"),
        priceText: formData.get("price") ? `${Number(formData.get("price")).toFixed(2)}€` : "0.00€",
        stockClass: stockClassFromId(stockId),
        stockStatus: stockMeta?.status ?? "Disponível",
        imageUrl
      }
    };
  }

  document.getElementById("preview-product-button").addEventListener("click", async () => {
    const formState = await buildFormState();
    renderProductFormPage(mode, {
      productId: product?.id,
      preview: formState.preview,
      imageData: formState.imageType === "dataUrl" ? formState.image : currentPreviewImageData,
      formValues: formState
    });
  });

  document.getElementById("add-filter-button").addEventListener("click", () => {
    const form = document.getElementById("product-form");
    const formData = new FormData(form);
    const newFilterName = document.getElementById("newFilter").value;
    const result = addFilter(newFilterName);
    renderProductFormPage(mode, {
      productId: product?.id,
      preview,
      imageData: currentPreviewImageData,
      formValues: {
        id: product?.id,
        name: formData.get("name"),
        description: formData.get("description"),
        price: formData.get("price"),
        stock: Number(formData.get("stock")),
        filter: Number(formData.get("filter"))
      },
      flash: {
        type: result.success ? "success" : "error",
        message: result.message
      }
    });
  });

  document.getElementById("remove-filter-button").addEventListener("click", () => {
    const form = document.getElementById("product-form");
    const formData = new FormData(form);
    const filterId = Number(document.getElementById("filter").value);
    const result = removeFilterById(filterId);
    renderProductFormPage(mode, {
      productId: product?.id,
      preview,
      imageData: currentPreviewImageData,
      formValues: {
        id: product?.id,
        name: formData.get("name"),
        description: formData.get("description"),
        price: formData.get("price"),
        stock: Number(formData.get("stock")),
        filter: Number(formData.get("filter"))
      },
      flash: {
        type: result.success ? "success" : "error",
        message: result.message
      }
    });
  });

  document.getElementById("product-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formState = await buildFormState();
    const result = createOrUpdateProduct(formState);

    renderProductFormPage(mode, {
      productId: result.id ?? product?.id,
      preview: formState.preview,
      imageData: formState.imageType === "dataUrl" ? formState.image : currentPreviewImageData,
      formValues: formState,
      flash: {
        type: result.success ? "success" : "error",
        message: result.message
      }
    });
  });
}

function sortUsers(users, sortBy, order) {
  return users.slice().sort((left, right) => {
    const leftValue = left[sortBy];
    const rightValue = right[sortBy];
    const comparison =
      typeof leftValue === "number"
        ? Number(leftValue) - Number(rightValue)
        : String(leftValue).localeCompare(String(rightValue));
    return order === "asc" ? comparison : -comparison;
  });
}

function renderUserListPage(options = {}) {
  const params = new URLSearchParams(window.location.search);
  const sortBy = params.get("sort_by") ?? "id";
  const order = params.get("order") ?? "asc";
  const users = sortUsers(getAllUsers(), sortBy, order);
  const root = getPageRoot();
  root.innerHTML = adminShellMarkup(
    "Lista de utilizadores",
    `
      <div class="user-list-container">
        <div class="user-container">
          <div class="user-header">
            <div><a href="${toRootUrl(`admin/index.html?page=userList&sort_by=id&order=${order === "asc" ? "desc" : "asc"}`)}">ID</a></div>
            <div><a href="${toRootUrl(`admin/index.html?page=userList&sort_by=username&order=${order === "asc" ? "desc" : "asc"}`)}">Nome de Utilizador</a></div>
            <div><a href="${toRootUrl(`admin/index.html?page=userList&sort_by=email&order=${order === "asc" ? "desc" : "asc"}`)}">Email</a></div>
            <div><a href="${toRootUrl(`admin/index.html?page=userList&sort_by=permissions&order=${order === "asc" ? "desc" : "asc"}`)}">Permissoes</a></div>
            <div class="user-buttons-container"></div>
          </div>
          ${users
            .map(
              (user) => `
                <div class="user-item">
                  <div>${user.id}</div>
                  <div>${escapeHtml(user.username)}</div>
                  <div>${escapeHtml(user.email)}</div>
                  <div>${user.permissions === "admin" ? "Administrador" : "Cliente"}</div>
                  <div class="user-buttons-container">
                    <a href="#" class="edit-button" style="margin: 0;" data-edit-user="${user.id}"></a>
                    <a href="#" class="delete-button" style="margin: 0;" data-delete-user="${user.id}"></a>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
        ${
          options.flash
            ? `<p class="${options.flash.type === "error" ? "error-message" : "success-message"}" style="margin-top: 20px;">${escapeHtml(options.flash.message)}</p>`
            : ""
        }
        ${
          options.editingUser
            ? `
              <div id="edit" class="edit-item-popup" style="display: block;">
                <h1>Editar dados de utilizador</h1>
                <div class="edit-user-form">
                  <form id="edit-user-form">
                    <input type="text" name="username" placeholder="Nome de Utilizador" value="${escapeHtml(options.editingUser.username)}" required>
                    <input type="email" name="email" placeholder="Email" value="${escapeHtml(options.editingUser.email)}" required>
                    <input type="password" name="newPassword" placeholder="Password" pattern="(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{6,}">
                    <input type="password" name="confirmPassword" placeholder="Confirmar Password" pattern="(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{6,}">
                    <select name="permissions" required>
                      <option value="admin" ${options.editingUser.permissions === "admin" ? "selected" : ""}>Administrador</option>
                      <option value="client" ${options.editingUser.permissions === "client" ? "selected" : ""}>Cliente</option>
                    </select>
                    <div class="edit-item-popup-buttons">
                      <button class="save-button" type="submit">Atualizar Utilizador</button>
                      <a href="#" class="save-button" data-close-edit>Sair</a>
                    </div>
                  </form>
                </div>
              </div>
              <div id="edit-overlay" class="edit-item-overlay" style="display: block;"></div>
            `
            : ""
        }
        ${
          options.deletingUserId
            ? `
              <div id="delete" class="delete-item-popup" style="display: block;">
                <h2>Remover este utilizador?</h2>
                <div class="delete-item-popup-buttons">
                  <a href="#" class="delete-item-yes-button" data-confirm-delete-user="${options.deletingUserId}">Sim</a>
                  <a href="#" class="delete-item-no-button" data-cancel-delete-user>Não</a>
                </div>
              </div>
              <div id="delete-overlay" class="delete-item-overlay" style="display: block;"></div>
            `
            : ""
        }
      </div>
    `
  );

  root.onclick = (event) => {
    const editButton = event.target.closest("[data-edit-user]");
    if (editButton) {
      event.preventDefault();
      const userId = Number(editButton.getAttribute("data-edit-user"));
      const user = getAllUsers().find((item) => Number(item.id) === Number(userId));
      renderUserListPage({ editingUser: user });
      return;
    }

    const deleteButton = event.target.closest("[data-delete-user]");
    if (deleteButton) {
      event.preventDefault();
      renderUserListPage({ deletingUserId: Number(deleteButton.getAttribute("data-delete-user")) });
      return;
    }

    if (event.target.closest("[data-close-edit]") || event.target.closest("[data-cancel-delete-user]")) {
      event.preventDefault();
      renderUserListPage();
      return;
    }

    const confirmDelete = event.target.closest("[data-confirm-delete-user]");
    if (confirmDelete) {
      event.preventDefault();
      const deletedUserId = Number(confirmDelete.getAttribute("data-confirm-delete-user"));
      deleteUserById(deletedUserId);
      if (!isAuthenticated()) {
        replaceTo("");
        return;
      }
      renderUserListPage({
        flash: {
          type: "success",
          message: "Utilizador removido com sucesso!"
        }
      });
    }
  };

  const editForm = document.getElementById("edit-user-form");
  if (editForm && options.editingUser) {
    editForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(editForm);
      const result = updateUserById(options.editingUser.id, {
        username: formData.get("username"),
        email: formData.get("email"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
        permissions: formData.get("permissions")
      });
      renderUserListPage({
        flash: {
          type: result.success ? "success" : "error",
          message: result.message
        }
      });
    });
  }
}

function renderUserAddPage(flash = null) {
  const root = getPageRoot();
  root.innerHTML = adminShellMarkup(
    "Adicionar um novo utilizador",
    `
      <div class="add-user-container">
        <div class="edit-user-form">
          <form id="add-user-form">
            <input type="text" name="username" placeholder="Nome de Utilizador" required>
            <input type="email" name="email" placeholder="Email" required>
            <select name="permissions" required>
              <option value="client">Cliente</option>
              <option value="admin">Administrador</option>
            </select>
            <input type="password" name="password" placeholder="Password" required>
            <input type="password" name="confirmPassword" placeholder="Confirmar Password" required>
            <button class="save-button" type="submit">Adicionar Utilizador</button>
            ${
              flash
                ? `<p class="${flash.type === "error" ? "error-message" : "success-message"}">${escapeHtml(flash.message)}</p>`
                : ""
            }
          </form>
        </div>
      </div>
    `
  );

  document.getElementById("add-user-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = createAdminUser({
      username: formData.get("username"),
      email: formData.get("email"),
      permissions: formData.get("permissions"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    });

    renderUserAddPage({
      type: result.success ? "success" : "error",
      message: result.message
    });
  });
}

export function initAdminPage() {
  if (!isAuthenticated()) {
    replaceTo("account/login/index.html");
    return true;
  }

  if (!isAdminUser()) {
    replaceTo("");
    return true;
  }

  const page = getAdminPageParam();
  updateQuery({ page });

  switch (page) {
    case "productList":
      renderProductListPage();
      return true;
    case "productAdd":
      renderProductFormPage("add");
      return true;
    case "productEdit":
      renderProductFormPage("edit", { productId: Number(new URLSearchParams(window.location.search).get("itemId")) });
      return true;
    case "userList":
      renderUserListPage();
      return true;
    case "userAdd":
      renderUserAddPage();
      return true;
    default:
      replaceTo("admin/index.html?page=productList");
      return true;
  }
}
