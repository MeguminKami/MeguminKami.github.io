<?php

if (!defined('ACCESS_ALLOWED')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed.');
}

$stockIds = getStoreItemStockIdList();
$name = $price = $image = '';
$stock = $filter = 1;
$tempImagePath = $description = null;
$sErrorMsg = "";
$sSuccessMsg = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    if(isset($_POST['addItem'])){

        $image = $_FILES['image']['name'];
        $imageFile = $_FILES['image']['tmp_name'];

        if(createStoreItem( $_POST['name'], $_POST['description'], $_POST['price'], $_POST['stock'], $_POST['filter'], $image, $imageFile)){
            $sSuccessMsg = "Produto adicionado com sucesso!";
        }
        else{
            $sErrorMsg = "Erro ao adicionar produto!";
        };
    }
    else{

        $name = $_POST['name'];
        $description = $_POST['description'];
        $price = $_POST['price'];
        $stock = $_POST['stock'];
        $filter = $_POST['filter'];
        $image = $_FILES['image']['name'];

        if (isset($_POST['preview'])) {

            // The image is saved in a temporary file for the preview
            $tempImagePath = "https://gnomo.fe.up.pt/~up201906465/dbs/assets/store/preview_".$id.".png";
            $tempImage = "../assets/store/preview_".$id.".png";
            $_SESSION['temp_image'] = $tempImage;
            move_uploaded_file($_FILES['image']['tmp_name'], $tempImage);

        }
        elseif (isset($_POST['addFilter'])) {
            createStoreItemFilter($_POST['newFilter']);
            $sSuccessMsg = "Filtro adicionado com sucesso!";
        }
        elseif (isset($_POST['removeFilter'])){
            if(checkStoreItemFilterInUse($_POST['filter'])){
                $sErrorMsg = "Erro ao remover filtro! O filtro está a ser utilizado por um ou mais produtos.";
            }
            else {
                deleteFilterById($_POST['filter']);
                $sSuccessMsg = "Filtro removido com sucesso!";
            }
        }
    }

}
else{
    // Whenever the user enters the page, the temporary image is deleted
    if (isset($_SESSION['temp_image']) && file_exists($_SESSION['temp_image'])) {
        unlink($_SESSION['temp_image']);
    }
}

$filterIds = getStoreItemFilterIdList();

?>
<div class="add-item-container">
    <div class="add-item-container-form">

        <div class="add-item-form">

            <div class="add-item-message-container">
                <?php if($sErrorMsg != ""): ?>
                    <p class='error-message'><?php echo htmlspecialchars($sErrorMsg); ?></p>
                <?php elseif($sSuccessMsg != ""): ?>
                    <p class='success-message'><?php echo htmlspecialchars($sSuccessMsg); ?></p>
                <?php endif; ?>
            </div>

                <form method="post" enctype="multipart/form-data">
                    <input type="text"
                           id="name"
                           name="name"
                           placeholder="Nome do Produto"
                           value="<?php echo htmlspecialchars($name);?>"
                           required>

                    <!-- This is necessary because the <textarea> class doesnt support: value="" -->
                    <?php if ($description): ?>
                        <textarea id="description"
                                  name="description"
                                  placeholder="Descrição do Produto"
                                 required><?php echo htmlspecialchars($description);?></textarea>
                    <?php else: ?>
                        <textarea id="description"
                                  name="description"
                                  placeholder="Descrição do Produto"
                                  required></textarea>
                    <?php endif; ?>



                    <input type="number"
                           id="price"
                           step="0.01"
                           pattern="^\d+(\.\d{1,2})?$"
                           name="price"
                           placeholder="Preço do Produto"
                           value="<?php echo htmlspecialchars($price);?>"
                           required>

                    <select id="stock" name="stock" required>
                        <?php foreach ($stockIds as $id): ?>
                            <option value="<?php echo $id; ?>" <?php echo ($stock == $id) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars(getStoreItemStockStatusById($id)); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>

                    <div class="add-remove-filter-container">
                        <select id="filter" name="filter" required>
                            <?php foreach ($filterIds as $id): ?>
                                <option value="<?php echo $id; ?>" <?php echo ($filter == $id) ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars(getStoreItemFilterNameById($id)); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>

                        <!-- This button removes a filter so it doesn't require the form data -->
                        <!-- Done like this to have everything in one form -->
                        <button class="remove-button"
                                type="submit"
                                name="removeFilter"
                                aria-label="Add Filter"
                                formnovalidate>
                        </button>
                    </div>

                    <div class="add-remove-filter-container">
                        <input type="text"
                               id="newFilter"
                               name="newFilter"
                               placeholder="Adicionar Novo Filtro"
                               pattern="[A-Za-z]{2,15}">

                        <!-- This button adds a new filter so it doesn't require the form data -->
                        <!-- Done like this to have everything in one form -->
                        <button class="add-button"
                                type="submit"
                                name="addFilter"
                                aria-label="Add Filter"
                                formnovalidate>
                        </button>
                    </div>

                    <input type="file"
                           id="image"
                           name="image"
                           value="<?php echo isset($image) ? $image : ''; ?>"
                           required>

                    <div class="add-filter-container">
                        <button class="save-button"
                                type="submit"
                                name="addItem">Adicionar Produto
                        </button>

                        <button class="save-button"
                                type="submit"
                                name="preview">Pré-visualizar
                        </button>
                    </div>

                </form>
        </div>

        <div class="add-item-container-preview">
            <h1> Pré-visualização

            <a href="">
                <div class="image-container">
                    <img src="<?php echo $tempImagePath ? : 'https://gnomo.fe.up.pt/~up201906465/dbs/assets/store/preview.png'; ?>">
                </div>
            </a>

            <div class="name"><?php echo htmlspecialchars($name) ? : 'Nome'; ?></div>

            <div class="description"><?php echo htmlspecialchars($description) ? : 'Descrição'; ?></div>

            <div class="<?php echo getStoreItemStockClassById($stock);?> ">
                <?php echo htmlspecialchars(getStoreItemStockStatusById($stock)); ?>
            </div>

            <div class="price"><?php echo htmlspecialchars($price).' €'? : '0.00 €'; ?></div>
        </div>
    </div>
</div>