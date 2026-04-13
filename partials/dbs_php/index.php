<?PHP
session_start();
const ACCESS_ALLOWED = true;
include_once "database/opendb.php";
include_once "database/users.php";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Djabusabi</title>
    <?php include_once "includes/head.php"; ?>
</head>

<body>
<?php include_once "includes/header.php"; ?>
<div class="body-content">
    <div class="main-page-left-section">
        <h1>Djabusabi</h1>
        <p>Bem-vindo ao Website dos Djabusabi aqui podes encontrar a nossa loja com todos os produtos aleatorios, os nossos eventos (brevemente) e quem somos.</p>

        <a href="exercise3.rar" download class="save-button"> Download Source Code</a>
        <a href="sie-ex3-report.pdf" download class="save-button"> Download Report</a>

        <div class="main-page-left-image-flex-container">
            <div class="main-page-left-image-item">
                <a href="store/?filterId%5B%5D=1"><img src="assets/images/vestuario.png" alt="Image 1"></a>
                <p>Vestuário</p>
            </div>
            <div class="main-page-left-image-item">
                <a href="store/?filterId%5B%5D=11"><img src="assets/images/material-escolar.png" alt="Image 2"></a>
                <p>Material Escolar</p>
            </div>
            <div class="main-page-left-image-item">
                <a href="store/?filterId%5B%5D=3"><img src="assets/images/mala-dinheiro.jpg" alt="Image 3"></a>
                <p>Utilitários</p>
            </div>
            <div class="main-page-left-image-item">
                <a href="store/?stockId%5B%5D=4"><img src="assets/images/brevemente.png" alt="Image 4"></a>
                <p>Novas Adições</p>
            </div>
        </div>
    </div>

    <div class="main-page-right-section">
        <div class="main-page-right-image-container">
            <img src="assets/images/mainpage-image1.jpg" alt="Image 1">
            <img src="assets/images/mainpage-image2.jpg" alt="Image 2">
            <img src="assets/images/mainpage-image3.jpg" alt="Image 3">
            <img src="assets/images/mainpage-image4.jpg" alt="Image 4">
        </div>
    </div>
</div>
<?php include_once "includes/footer.php"; ?>
</body>

</html>




