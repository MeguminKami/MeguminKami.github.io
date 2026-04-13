<?php

if (!defined('ACCESS_ALLOWED')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed.');
}

if (!isset($_GET['itemId'])) {
    header("Location: /~up201906465/dbs/admin/");
    exit();
}

$itemId = $_GET['itemId'];
$item = getStoreItemById($itemId);

$name = $item['name'];
$description = $item['description'];
$price = $item['price'];
$stock = $item['stock'];
$filter = $item['filter'];
$image = $item['image'];
$imagePath = "https://gnomo.fe.up.pt/~up201906465/dbs/assets/store/".$image;

$sErrorMsg = "";
$sSuccessMsg = "";
$stockIds = [1, 2, 3, 4];

if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    if(isset($_POST['updateItem'])){

        if (isset($_FILES['newImage']) && $_FILES['newImage']['name'] != '') {
            $image = $_FILES['newImage']['name'];
            $imageFile = $_FILES['newImage']['tmp_name'];
        } else {
            $imageFile = null;
        }

        if(updateStoreItem( $itemId ,$_POST['name'], $_POST['description'], $_POST['price'], $_POST['stock'], $_POST['filter'], $image, $imageFile)){
            $sSuccessMsg = "Produto atualizado com sucesso!";
        }
        else{
            $sErrorMsg = "Erro ao atualizar produto!";
        };

        // Updates the variables to show on the preview
        $item = getStoreItemById($itemId);
        $name = $item['name'];
        $description = $item['description'];
        $price = $item['price'];
        $stock = $item['stock'];
        $filter = $item['filter'];
        $image = $item['image'];
        $imagePath = "https://gnomo.fe.up.pt/~up201906465/dbs/assets/store/".$image;
    }
    else{
        // Saves the variables on the form if the user adds a filter or previews the image
        $name = $_POST['name'];
        $description = $_POST['description'];
        $price = $_POST['price'];
        $stock = $_POST['stock'];
        $filter = $_POST['filter'];

        // If the preview was submitted with an image, it saves the image in a temporary file
        if (isset($_POST['preview']) && isset($_FILES['image']['name']) && $_FILES['image']['name'] != '') {

            $imagePath = "https://gnomo.fe.up.pt/~up201906465/dbs/assets/store/preview_".$id.".png";
            $image = "../assets/store/preview_".$id.".png";
            $_SESSION['temp_image'] = $image;
            move_uploaded_file($_FILES['image']['tmp_name'], $image);
        }
        elseif (isset($_POST['addFilter'])) {
            createStoreItemFilter($_POST['newFilter']);
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

                <?php if ($description): ?>
                    <textarea id="description"
                              name="description"
                              placeholder="Descrição do Produto"
                             required><?php echo htmlspecialchars($description); ?>
                    </textarea>

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
                       title="A casa decimal tem de ser separada por um ponto."
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
                       id="newImage"
                       name="newImage"
                       value="<?php echo isset($image) ? $image : ''; ?>"
                       >

                <div class="add-filter-container">
                    <button class="save-button"
                            type="submit"
                            name="updateItem">Atualizar Produto
                    </button>

                    <button class="save-button"
                            type="submit"
                            name="preview">Pré-visualizar
                    </button>
                </div>

            </form>
        </div>

        <div class="add-item-container-preview">
            <h1> Pré-visualização</h1>
            <a href="">
                <div class="image-container">
                    <img src="<?php echo $imagePath ? : 'https://gnomo.fe.up.pt/~up201906465/dbs/assets/store/preview.png'; ?>">
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