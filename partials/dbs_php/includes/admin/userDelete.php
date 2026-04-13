<?php

session_start();

if ($_SESSION['permissions'] == 'admin') {

    include_once "../database/opendb.php";
    include_once "../database/users.php";

    if (isset($_GET['userId'])) {
        $userId = $_GET['userId'];
        deleteUserById($userId);
    }
}


header("Location: /~up201906465/dbs/admin/?page=userList");
exit();