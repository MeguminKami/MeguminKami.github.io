<?PHP
session_start();

if (empty($_SESSION["authenticated"]) ) {
    header("Location: /~up201906465/dbs/account/login");
    exit();
}
else if ($_SESSION["permissions"] != 'admin') {
    header("Location: /~up201906465/dbs/");
    exit();
}

include_once "../database/opendb.php";
include_once "../database/users.php";
include_once "../database/storeitems.php";

const ACCESS_ALLOWED = true;
$id = $_SESSION["id"];
$permissions = $_SESSION["permissions"];

# Gets the page .php name from the URL
if (isset($_GET['page'])) {

    $page = $_GET['page'] . '.php';

    switch ($page) {
        case 'productList.php':
            $pageTitle = 'Lista de produtos';
            break;
        case 'productAdd.php':
            $pageTitle = 'Adicionar um novo produto';
            break;
        case 'userList.php':
            $pageTitle = 'Lista de utilizadores';
            break;
        case 'userAdd.php':
            $pageTitle = 'Adicionar um novo utilizador';
            break;
        default:
            $pageTitle = '';
            break;
    }

}
else{
    header("Location: /~up201906465/dbs/admin/?page=productList");
    exit();
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Menu de Administrador</title>
    <?php include_once "../includes/head.php"; ?>
</head>

<body>
<?php include_once "../includes/header.php"; ?>

<div class="body-content">

    <div class="page-container">

        <div class="page-container-title">
            <h1><?php echo htmlspecialchars($pageTitle); ?></h1>
        </div>

        <div class="page-container-bottom">
            <div class="menu-container" style="min-width: 350px; min-height: 600px;">
                <h2> Menu de funções</h2>

                <a href="admin?page=productList" class="item">
                    <img src="assets/icons/shop-list.png">
                    <span>Lista de produtos</span>
                </a>

                <a href="admin?page=productAdd" class="item">
                    <img src="assets/icons/shop-add.png">
                    <span>Adicionar um novo produto</span>
                </a>

                <a href="admin?page=userList" class="item">
                    <img src="assets/icons/user-list.png">
                    <span>Lista de utilizadores</span>
                </a>

                <?php if ($permissions == 'admin'): ?>
                    <a href="admin?page=userAdd" class="item">
                        <img src="assets/icons/user-add.png">
                        <span>Adicionar um novo utilizador</span>
                    </a>
                <?php endif; ?>

            </div>

            <!-- This element is located within the "page-container-bottom" -->
            <!-- Its purpose is to maintain the page structure while only changing this section based on the user's choice -->
            <?php include_once "$page"; ?>

        </div>

    </div>
</div>
<?php include_once "../includes/footer.php"; ?>
</body>
</html>


