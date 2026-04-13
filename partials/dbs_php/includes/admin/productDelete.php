<?php

session_start();

if($_SESSION['permissions'] == 'admin') {

    include_once "../database/opendb.php";
    include_once "../database/storeitems.php";

    if (isset($_GET['itemId'])) {
        $itemId = $_GET['itemId'];
        deleteStoreItemById($itemId);
    }
}

header("Location: /~up201906465/dbs/admin/");
exit();

