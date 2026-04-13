<?php
session_start();
const ACCESS_ALLOWED = true;
include_once "../database/opendb.php";
require "../database/storeitems.php";

$filterIdList = getStoreItemFilterIdList();
$selectedFilters = isset($_GET['filterId']) ? $_GET['filterId'] : [];

$stockIdList = getStoreItemStockIdList();
$selectedStock = isset($_GET['stockId']) ? $_GET['stockId'] : [];

$hiddenFilters = isset($_GET['filters']);
$order = isset($_GET['order']) ? $_GET['order'] : 'price_asc';

// Build query string for selected filters, stock, and order
$queryString = http_build_query([
    'filterId' => $selectedFilters,
    'stockId' => $selectedStock,
    'order' => $order
]);

// Determines which container to show
if($hiddenFilters){
    $filtersMenuClass = "order-hidefilters-container-hidden";
    $hiddenFiltersRef = "store/?" . $queryString;
    $hiddenFiltersText = "Mostrar Filtros";
} else {
    $filtersMenuClass = "order-hidefilters-container-showing";
    $hiddenFiltersRef = "store/?filters&" . $queryString;
    $hiddenFiltersText = "Esconder Filtros";
}

// Get items by filters
$itemIdList = getStoreItemsIdListByFilterAndStock($selectedFilters, $selectedStock);

// Fetch item details
$items = array_map('getStoreItemById', $itemIdList);

// Sort items locally based on the selected order
usort($items, function($a, $b) use ($order) {
    switch ($order) {
        case 'price_asc':
            return $a['price'] <=> $b['price'];
        case 'price_desc':
            return $b['price'] <=> $a['price'];
        case 'name_asc':
            return strcmp($a['name'], $b['name']);
        case 'name_desc':
            return strcmp($b['name'], $a['name']);
        default:
            return 0;
    }
});
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Dados Pessoais</title>
    <?php include_once "../includes/head.php"; ?>
</head>

<body>
<?php include_once "../includes/header.php"; ?>

<div class="body-content">
    <div class="page-container">
        <div class="page-container-spaceout"> </div>
        <div class="page-container-bottom">
            <?php if(!$hiddenFilters):?>
                <div class="menu-container">
                    <h2>Lista de Filtros</h2>
                    <div class="filter-form">
                        <form method="GET">
                            <h3>Categoria</h3>
                            <?php for ($i = 0; $i < count($filterIdList); $i++): ?>
                                <?php $filter = getStoreItemFilterById($filterIdList[$i]); ?>
                                <?php $numberFilterItems = getStoreItemCountByFilter($filter['id'], $selectedStock); ?>
                                <?php if($numberFilterItems == 0) continue; ?>
                                <label>
                                    <input type="checkbox"
                                           name="filterId[]"
                                           value="<?php echo $filter['id']; ?>"
                                        <?php echo in_array($filter['id'], $selectedFilters) ? 'checked' : ''; ?>
                                           onchange="this.form.submit();">
                                    <?php echo $filter['name']; ?>
                                    <p>(<?php echo $numberFilterItems ?>)</p>
                                </label>
                            <?php endfor; ?>

                            <h3>Disponibilidade</h3>
                            <?php for ($i = 0; $i < count($stockIdList); $i++): ?>
                                <?php $stock = getStoreItemStockById($stockIdList[$i]); ?>
                                <?php $numberStockItems = getStoreItemCountByStock($stock['id'], $selectedFilters); ?>
                                <?php if($numberStockItems == 0) continue; ?>
                                <label>
                                    <input type="checkbox"
                                           name="stockId[]"
                                           value="<?php echo $stock['id']; ?>"
                                        <?php echo in_array($stock['id'], $selectedStock) ? 'checked' : ''; ?>
                                           onchange="this.form.submit();">
                                    <?php echo $stock['status']; ?>
                                    <p>(<?php echo $numberStockItems ?>)</p>
                                </label>
                            <?php endfor; ?>
                        </form>
                    </div>
                </div>
            <?php endif; ?>

            <div class="store-order-container">
                <div class="<?php echo $filtersMenuClass?>">
                    <div class="hide-show-filters-container">
                        <a href="<?php echo $hiddenFiltersRef?>"> <?php echo $hiddenFiltersText?> </a>
                    </div>

                    <div class="order-container">
                        <p>Ordenar por:  </p>
                        <form method="GET">
                            <select name="order" onchange="this.form.submit();">
                                <option value="price_asc" <?php echo $order == 'price_asc' ? 'selected' : ''; ?>>Preço Crescente</option>
                                <option value="price_desc" <?php echo $order == 'price_desc' ? 'selected' : ''; ?>>Preço Decrescente</option>
                                <option value="name_asc" <?php echo $order == 'name_asc' ? 'selected' : ''; ?>>Ordem Alfabetica Crescente</option>
                                <option value="name_desc" <?php echo $order == 'name_desc' ? 'selected' : ''; ?>>Ordem Alfabetica Decrescente</option>
                            </select>
                            <?php foreach ($selectedFilters as $filter): ?>
                                <input type="hidden" name="filterId[]" value="<?php echo $filter; ?>">
                            <?php endforeach; ?>
                            <?php foreach ($selectedStock as $stock): ?>
                                <input type="hidden" name="stockId[]" value="<?php echo $stock; ?>">
                            <?php endforeach; ?>
                            <?php if ($hiddenFilters): ?>
                                <input type="hidden" name="filters" value="1">
                            <?php endif; ?>
                        </form>
                    </div>
                </div>

                <div class="store-container">
                    <?php foreach ($items as $item): ?>
                        <div class="item">
                            <a href="">
                                <div class="image-container">
                                    <img src="https://gnomo.fe.up.pt/~up201906465/dbs/assets/store/<?php echo $item['image']; ?>">
                                </div>
                            </a>

                            <div class="name"><?php echo htmlspecialchars($item['name']); ?></div>

                            <div class="description"><?php echo htmlspecialchars($item['description']); ?></div>

                            <div class="<?php echo getStoreItemStockClassById($item['stock']);?>">
                                <?php echo htmlspecialchars(getStoreItemStockStatusById($item['stock'])); ?>
                            </div>

                            <div class="price"><?php echo htmlspecialchars($item['price']); ?>€</div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<?php include_once "../includes/footer.php"; ?>
</body>
</html>