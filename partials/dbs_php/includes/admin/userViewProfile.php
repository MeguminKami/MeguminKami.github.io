<?php

if (!defined('ACCESS_ALLOWED')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed.');
}

if(isset($_GET['userId'])){
    $viewUserId = $_GET['userId'];
    $viewUser = getUserById($viewUserId);
    if(!$viewUser){
        header("Location: /~up201906465/dbs/admin/");
        exit();
    }
}
else{
    header("Location: /~up201906465/dbs/admin/");
    exit();
}
?>

