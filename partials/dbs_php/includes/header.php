<?php

$permissions = null;
$isAuthenticated = False;
if (!empty($_SESSION["authenticated"])) {
    include_once __DIR__ . '/../database/users.php';
    $isAuthenticated = True;
    $id = $_SESSION["id"];
    $permissions = $_SESSION["permissions"];
    $username = getUserColumnById($id, 'username');
}


?>

<header>
    
    <div class="header-left">
        <a href=""> <img src="assets/logos/logo_branco.png"></a>
        <a href="">Eventos</a>
        <a href="store">Loja</a>
        <a href="">Equipas</a>
        <?php if ($permissions == 'admin'): ?>
            <a href="admin">Administração</a>
        <?php endif; ?>

    </div>
    
    
    
    <div class="header-right">


        <?php if ($permissions == 'admin'): ?>
            <input type="checkbox" id="toggle-header-menu" style="display: none;">
            <label for="toggle-header-menu" class="background"> </label>
            <h3> Modo de administrador</h3>
            <label for="toggle-header-menu" class="header-icon" id="settings-icon"> </label>
            <div class="header-menu">

                <div class="header-menu-top">';
                        <div style="margin: 20px;">
                            <h1 class="header-menu-text-big">Olá <?php echo htmlspecialchars($username); ?>!</h1>
                            <p class="header-menu-text-small">Bem vindo ao menu de admnistrador.</p>
                        </div>

                        <div class="header-menu-buttons">
                            <a href="database/logout.php" class="sign-up">Terminar Sessão</a>
                        </div>'
                </div>

                <div class="header-menu-bot">
                    <a href="admin/?page=productList" class="user-buttons">
                        <img src="assets/icons/shop-list.png">
                        <span>Lista de produtos</span>
                    </a>

                    <a href="admin/?page=productAdd" class="user-buttons">
                        <img src="assets/icons/shop-add.png">
                        <span>Adicionar um novo produto</span>
                    </a>

                    <a href="admin/?page=userList" class="user-buttons">
                        <img src="assets/icons/user-list.png">
                        <span>Lista de utilizadores</span>
                    </a>

                    <a href="admin/?page=userAdd" class="user-buttons">
                        <img src="assets/icons/user-add.png">
                        <span>Adicionar um novo utilizador</span>
                    </a>
                </div>

                <div class="header-menu-bot">
                    <img src="assets/logos/logo_vigo.png" class="logo-img">
                </div>


        <?php else: ?>

            <input type="checkbox" id="toggle-header-menu" style="display: none;">
            <label for="toggle-header-menu" class="background"> </label>

            <label for="toggle-header-menu" class="header-icon" id="user-icon"> </label>
            <a href="" class="header-icon" id="cart-icon"></a>

            <div class="header-menu">
                <div class="header-menu-top">'
                    <?php if ($isAuthenticated): ?>
                        <div style="margin: 20px;">
                            <h1 class="header-menu-text-big">Olá <?php echo htmlspecialchars($username); ?>!</h1>
                            <p class="header-menu-text-small">Bem vindo ao site dos Djabusabi.</p>
                        </div>

                        <div class="header-menu-buttons">
                            <a href="database/logout.php" class="sign-up">Terminar Sessão</a>
                        </div>'
                    <?php else: ?>
                        <div style="margin: 20px;">
                            <h1 class="header-menu-text-big">Como assim ainda nao és um Djabusabi?</h1>
                            <p class="header-menu-text-small">Regista-te agora e torna-te um primo metralha!</p>
                        </div>

                        <div class="header-menu-buttons">
                            <a href="account/signup" class="sign-up">Regista-te</a>
                            <a href="account/login" class="log-in">Iniciar Sessão</a>
                        </div>
                    <?php endif; ?>
                </div>

                <div class="header-menu-bot">
                        <a href="account" class="user-buttons">
                            <img src="assets/icons/personal-data.png">
                            <span>Dados Pessoais</span>
                        </a>

                         <a href="" class="user-buttons">
                            <img src="assets/icons/orders.png">
                            <span>Encomendas e Faturas</span>
                        </a>

                         <a href="" class="user-buttons">
                            <img src="assets/icons/ticket.png">
                            <span>Apoio ao Cliente</span>
                        </a>
                </div>

               <div class="header-menu-bot">
                    <img src="assets/logos/logo_vigo.png" class="logo-img">
               </div>

            </div>

        <?php endif; ?>
    </div>
</header>