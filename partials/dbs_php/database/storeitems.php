<?php

// CRUD IMPLEMENTATION

// CREATES
// -----------------------------------------------------------------------------------------------

function createStoreItemFilter($name){
    if (strlen($name) < 2) {
        return false;
    }
    global $conn;
    $query = "INSERT INTO filters (name) VALUES ($1)";
    pg_query_params($conn, $query, array($name));
    return true;
}

function createStoreItem($name, $description, $price, $stock, $filter, $image, $imageFile) {
    global $conn;
    $query = "INSERT INTO storeitems (name, description, price, stock, filter, image) VALUES ($1, $2, $3, $4, $5, $6)";
    $result = pg_query_params($conn, $query, array($name, $description, $price, $stock, $filter, $image));

    if ($result) {
        return uploadStoreItemImageFile($imageFile,$image);
    } else {
        return false;
    }
}

// READS
// -----------------------------------------------------------------------------------------------

function getStoreItemIdListByFilter($filterId = null) {
    global $conn;
    if ($filterId === null) {
        $query = "SELECT id FROM storeitems";
        $result = pg_query($conn, $query);
    } else {
        $query = "SELECT id FROM storeitems WHERE storeitems.filter = ANY($1)";
        $result = pg_query_params($conn, $query, array('{' . implode(',', $filterId) . '}'));
    }

    $idList = [];
    while ($row = pg_fetch_assoc($result)) {
        $idList[] = $row['id'];
    }

    return $idList;
}

function getStoreItemById($id){
    global $conn;
    $query = "SELECT * FROM storeitems WHERE storeitems.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        return pg_fetch_assoc($result);
    }
    return null;

}

function getStoreItemFilterIdList(){
    global $conn;
    $query = "SELECT * FROM filters";
    $result = pg_query($conn, $query);

    $filterList = [];
    while ($row = pg_fetch_assoc($result)) {
        $filterList[] = $row['id'];
    }

    return $filterList;
}

function getStoreItemFilterById($id){
    global $conn;
    $query = "SELECT * FROM filters WHERE filters.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        return pg_fetch_assoc($result);
    }
    else{
        return null;
    }
}

function getStoreItemFilterNameById($id){
    global $conn;
    $query = "SELECT * FROM filters WHERE filters.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        $row = pg_fetch_assoc($result);
        return $row['name'];
    }
    else{
        return null;
    }
}



function getStoreItemNumberInFilter($filterId){
    global $conn;
    $query = "SELECT * FROM storeitems WHERE storeitems.filter = $1";
    $result = pg_query_params($conn, $query, array($filterId));
    if ($result) {
        return pg_num_rows($result);
    }
    return 0;
}

function getStoreItemStockStatusById($id){
    global $conn;
    $query = "SELECT * FROM stock WHERE stock.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        $row = pg_fetch_assoc($result);
        return $row['status'];
    }
    return false;
}

function getStoreItemStockClassById($id){
    switch ($id) {
        case '1':
            $class = 'available';
            break;
        case '2':
            $class = 'lastunits';
            break;
        case '3':
            $class = 'unavailable';
            break;
        case '4':
            $class = 'soonavailable';
            break;
        default:
            $class = 'unavailable';
    }

    return $class;
}

function getStoreItemStockIdList() {
    global $conn;
    $query = "SELECT * FROM stock";
    $result = pg_query($conn, $query);
    $stockIds = [];

    if ($result) {
        while ($row = pg_fetch_assoc($result)) {
            $stockIds[] = $row['id'];
        }
    }

    return $stockIds;
}

function checkStoreItemFilterInUse($filterId){
    global $conn;
    $query = "SELECT * FROM storeitems WHERE storeitems.filter = $1";
    $result = pg_query_params($conn, $query, array($filterId));
    if ($result) {
        return pg_num_rows($result) > 0;
    }
    else{
        return false;
    }
}

function getStoreItemsIdListByFilterAndStock($selectedFilters, $selectedStock) {
    global $conn;

    $query = "SELECT id FROM storeitems";
    $conditions = [];

    if (!empty($selectedFilters)) {
        $filters = implode(',', array_map('intval', $selectedFilters));
        $conditions[] = "storeitems.filter IN ($filters)";
    }

    if (!empty($selectedStock)) {
        $stock = implode(',', array_map('intval', $selectedStock));
        $conditions[] = "storeitems.stock IN ($stock)";
    }

    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }

    $result = pg_query($conn, $query);
    $idList = [];

    while ($row = pg_fetch_assoc($result)) {
        $idList[] = $row['id'];
    }

    return $idList;
}

function getStoreItemStockById($stockId){
    global $conn;
    $query = "SELECT * FROM stock WHERE stock.id = $1";
    $result = pg_query_params($conn, $query, array($stockId));
    if ($result) {
        return pg_fetch_assoc($result);
    }
    else{
        return null;
    }
}

function getStoreItemNumberInStock($stockId){
    global $conn;
    $query = "SELECT * FROM storeitems WHERE storeitems.stock = $1";
    $result = pg_query_params($conn, $query, array($stockId));
    if ($result) {
        return pg_num_rows($result);
    }
    return 0;
}

function getStoreItemCountByFilter   ($filterId, $selectedStock): int

{
    global $conn;
    $query = "SELECT * FROM storeitems WHERE storeitems.filter = $1";
    $params = array($filterId);

    if (!empty($selectedStock)) {
        $stock = implode(',', array_map('intval', $selectedStock));
        $query .= " AND storeitems.stock IN ($stock)";
    }

    $result = pg_query_params($conn, $query, $params);
    if ($result) {
        return pg_num_rows($result);
    }
    return 0;
}

function getStoreItemCountByStock($stockId, $selectedFilters) {
    global $conn;
    $query = "SELECT * FROM storeitems WHERE storeitems.stock = $1";
    $params = array($stockId);

    if (!empty($selectedFilters)) {
        $filters = implode(',', array_map('intval', $selectedFilters));
        $query .= " AND storeitems.filter IN ($filters)";
    }

    $result = pg_query_params($conn, $query, $params);
    if ($result) {
        return pg_num_rows($result);
    }
    return 0;
}

// -----------------------------------------------------------------------------------------------

function updateStoreItem($id, $name, $description, $price, $stock, $filter, $image, $imageFile = null) {
    global $conn;

    // Retrieve the current image path
    if($imageFile){
        $query = "SELECT * FROM storeitems WHERE id = $1";
        $result = pg_query_params($conn, $query, array($id));
        if ($result) {
            $row = pg_fetch_assoc($result);
            $currentImage = $row['image'];
        }
        else{
            return false;
        }
    }

    // Update the store item
    $query = "UPDATE storeitems SET name = $1, description = $2, price = $3, stock = $4, filter = $5, image = $6 WHERE id = $7";
    $result =  pg_query_params($conn, $query, array($name, $description, $price, $stock, $filter, $image, $id));

    if ($result) {
        if($imageFile){
            return uploadStoreItemImageFile($imageFile,$image,$currentImage);
        }
        else{
            return true;
        }
    } else {
        return false;
    }
}

function uploadStoreItemImageFile($imageFile, $image, $currentImage = null) {
    $targetDir = "../assets/store/";
    $targetFile = "../assets/store/" . $image;

    // Delete the current item image if it exists
    if ($currentImage && file_exists($targetDir . $currentImage)) {
        unlink($targetDir . $currentImage);
    }

    // Upload the new image
    if (move_uploaded_file($imageFile, $targetFile)) {
        return true;
    } else {
        return false;
    }
}

// DELETES
// -----------------------------------------------------------------------------------------------


function deleteStoreItemById($id){
    global $conn;

    // Retrieve the image path
    $query = "SELECT * FROM storeitems WHERE id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        $row = pg_fetch_assoc($result);
        $imagePath = __DIR__ . '/../assets/store/' . $row['image'];

        // Delete the image file
        if (file_exists($imagePath)) {
            unlink($imagePath);
        }
    }

    // Delete the store item
    $query = "DELETE FROM storeitems WHERE id = $1";
    pg_query_params($conn, $query, array($id));
}

function deleteFilterById($filterId){
    global $conn;
    $query = "DELETE FROM filters WHERE id = $1";
    pg_query_params($conn, $query, array($filterId));
}

