<?php

if (!defined('ACCESS_ALLOWED')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed.');
}
$sSuccessMsg = "";
$sErrorMsg = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $username = $_POST['username'];
    $email = $_POST['email'];
    $password = $_POST['password'];
    $confirmPassword = $_POST['confirmPassword'];
    $permissions = $_POST['permissions'];

    if (checkUserExists($username)){
        $sErrorMsg = "Já existe um Djabusabi com o teu nome de utilizador!";

    } else if (checkUserExists($email)) {
        $sErrorMsg = "Já existe um Djabusabi com o teu email!";

    } else if($password != $confirmPassword) {
        $sErrorMsg = "As passwords não coincidem!";

    } else {
        if(createUserByAdmin($username, $email, $password, $permissions)){
            $sSuccessMsg = "Utilizador adicionado com sucesso!";
        } else {
            $sErrorMsg = "Erro ao adicionar utilizador!";
        }
    }
}

?>

<div class="add-user-container">
    <div class="edit-user-form">
        <form method="post">

            <input type="text"
                   id="username"
                   name="username"
                   placeholder="Nome de Utilizador"
                   required>

            <input type="email"
                   id="email"
                   name="email"
                   placeholder="Email"
                   required>

            <select id="permissions" name="permissions" required>
                <option value="client">Cliente</option>
                <option value="admin">Administrador</option>
            </select>

            <input type="password"
                   id="password"
                   name="password"
                   placeholder="Password"
                   required>

            <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confimar Password"
                required>

            <button class="save-button"
                    type="submit"
                    name="editUser">Adicionar Utilizador
            </button>

            <?php if($sErrorMsg != ""): ?>
                <p class='error-message'><?php echo htmlspecialchars($sErrorMsg); ?></p>
            <?php elseif($sSuccessMsg != ""): ?>
                <p class='success-message'><?php echo htmlspecialchars($sSuccessMsg); ?></p>
            <?php endif; ?>

        </form>
    </div>
</div>