<?php

if (!defined('ACCESS_ALLOWED')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed.');
}

$itemIdList = getStoreItemIdListByFilter();

$enableDeletePopup = false;
if(isset($_GET['itemId'])){
    $deletePopupYesForward = 'admin/productDelete.php/?itemId=' . $_GET['itemId'];
    $deletePopupNoForward = 'admin/';
    $enableDeletePopup = true;
}
?>

<div class="store-container">
    <?php foreach ($itemIdList as $itemId): ?>
        <?php $item = getStoreItemById($itemId); ?>

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

            <div class="price-icons">
                <div class="price"> <?php echo htmlspecialchars($item['price']); ?>€</div>

                <a href="admin/?page=productEdit&itemId=<?php echo $itemId; ?>"
                   class="edit-button">
                </a>

                <a href="admin/?page=productList&itemId=<?php echo $itemId; ?>#delete"
                   class="delete-button">
                </a>
            </div>
        </div>

        <?php if($enableDeletePopup): ?>
        <div id="delete" class="delete-item-popup">
            <h2>Remover item da loja?</h2>
            <div class="delete-item-popup-buttons">
                <a href="<?php echo $deletePopupYesForward; ?>"
                   class="delete-item-yes-button">Sim
                </a>
                <a href="<?php echo $deletePopupNoForward; ?>" class="delete-item-no-button">Não
                </a>
            </div>
        </div>
        <div id="delete-overlay" class="delete-item-overlay"></div>
        <?php endif; ?>

    <?php endforeach; ?>
</div>
