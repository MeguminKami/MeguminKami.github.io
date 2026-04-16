const storeItems = [
  {
    id: 1,
    name: 'Capa Cinza',
    description: 'Capa minimalista com acabamento limpo e visual escuro para manter a identidade Djabusabi.',
    price: 19.90,
    image: 'assets/store/capa_cinza.png',
    category: 'Vestuário',
    stock: 'available',
    stockLabel: 'Disponível',
    tag: 'Destaque'
  },
  {
    id: 2,
    name: 'Mousepad Cinza',
    description: 'Mousepad em tom cinza com presença discreta e textura suave para setup e escritório.',
    price: 12.50,
    image: 'assets/store/mousepad_cinza.png',
    category: 'Utilitários',
    stock: 'lastunits',
    stockLabel: 'Últimas unidades',
    tag: 'Popular'
  }
];

function euro(v){return `${v.toFixed(2)}€`;}

function initStore(){
  const grid = document.querySelector('[data-store-grid]');
  if(!grid) return;

  const orderSelect = document.querySelector('[data-order]');
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const countEl = document.querySelector('[data-results-count]');
  const summaryEl = document.querySelector('[data-results-summary]');
  const toggleFilters = document.querySelector('[data-toggle-filters]');
  const filtersPanel = document.querySelector('[data-filters-panel]');
  const resetBtn = document.querySelector('[data-reset-filters]');

  let currentFilter = 'all';
  let currentOrder = orderSelect?.value || 'price_asc';

  function sorted(items){
    const copy = [...items];
    switch(currentOrder){
      case 'price_desc': copy.sort((a,b)=>b.price-a.price); break;
      case 'name_asc': copy.sort((a,b)=>a.name.localeCompare(b.name,'pt')); break;
      case 'name_desc': copy.sort((a,b)=>b.name.localeCompare(a.name,'pt')); break;
      default: copy.sort((a,b)=>a.price-b.price); break;
    }
    return copy;
  }

  function filtered(){
    const byCategory = currentFilter === 'all'
      ? storeItems
      : storeItems.filter(item => item.category === currentFilter);
    return sorted(byCategory);
  }

  function render(){
    const items = filtered();
    grid.innerHTML = '';
    if(countEl) countEl.textContent = String(items.length);
    if(summaryEl) summaryEl.textContent = currentFilter === 'all' ? 'Todos os produtos' : currentFilter;

    if(!items.length){
      grid.innerHTML = `<div class="empty-state"><h3>Sem resultados</h3><p>Não existem produtos para este filtro neste mockup visual.</p></div>`;
      return;
    }

    items.forEach(item => {
      const article = document.createElement('article');
      article.className = 'item';
      article.innerHTML = `
        <span class="tag">${item.tag}</span>
        <a href="#" aria-label="${item.name}">
          <div class="image-container">
            <img src="${item.image}" alt="${item.name}">
          </div>
        </a>
        <div class="name">${item.name}</div>
        <div class="description">${item.description}</div>
        <div class="meta">
          <div>
            <div class="${item.stock}">${item.stockLabel}</div>
            <div class="price">${euro(item.price)}</div>
          </div>
        </div>`;
      grid.appendChild(article);
    });
  }

  filterButtons.forEach(btn => btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.toggle('active', b === btn));
    render();
  }));

  orderSelect?.addEventListener('change', e => {
    currentOrder = e.target.value;
    render();
  });

  toggleFilters?.addEventListener('click', e => {
    e.preventDefault();
    if(!filtersPanel) return;
    const hidden = filtersPanel.hasAttribute('hidden');
    if(hidden) filtersPanel.removeAttribute('hidden');
    else filtersPanel.setAttribute('hidden', '');
    toggleFilters.textContent = hidden ? 'Esconder Filtros' : 'Mostrar Filtros';
  });

  resetBtn?.addEventListener('click', () => {
    currentFilter = 'all';
    if(orderSelect) orderSelect.value = 'price_asc';
    currentOrder = 'price_asc';
    filterButtons.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    render();
  });

  render();
}

function initAccountTabs(){
  const tabs = [...document.querySelectorAll('[data-account-tab]')];
  const panels = [...document.querySelectorAll('[data-account-panel]')];
  if(!tabs.length) return;

  function activate(name){
    tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.accountTab === name));
    panels.forEach(panel => panel.classList.toggle('active', panel.dataset.accountPanel === name));
  }

  tabs.forEach(tab => tab.addEventListener('click', () => activate(tab.dataset.accountTab)));
  activate(tabs[0].dataset.accountTab);
}

document.addEventListener('DOMContentLoaded', () => {
  initStore();
  initAccountTabs();
});
