<?php

if (!defined('ACCESS_ALLOWED')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed.');
}
?>

<!-- This file is a POPUP used inside userList.php so some variable will appear undefined but they are -->

<div id="edit" class="edit-item-popup">
    <h1>Editar dados de utilizador</h1>

    <div class="edit-user-message-container">
        <?php if($sErrorMsg != ""): ?>
            <p class='error-message'><?php echo htmlspecialchars($sErrorMsg); ?></p>
        <?php elseif($sSuccessMsg != ""): ?>
            <p class='success-message'><?php echo htmlspecialchars($sSuccessMsg); ?></p>
        <?php endif; ?>
    </div>

    <div class="edit-user-form">
        <form action="<?php echo htmlspecialchars($adminPath)."#edit"; ?>" method="post">
            <input type="text"
                   id="username"
                   name="username"
                   placeholder="Nome de Utilizador"
                   value="<?php echo htmlspecialchars($editUser['username']);?>"
                   required>

            <input type="email"
                   id="email"
                   name="email"
                   placeholder="Email"
                   value="<?php echo htmlspecialchars($editUser['email']);?>"
                   required>

            <input type="password"
                   id="newPassword"
                   name="newPassword"
                   placeholder="Password"
                   pattern="(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}">

            <input type="password"
                   id="confirmPassword"
                   name="confirmPassword"
                   placeholder="Confimar Password"
                   pattern="(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}">

            <select id="permissions" name="permissions" required>
                <option value="admin" <?php echo ($editUser['permissions'] == 'admin') ? 'selected' : ''; ?>>Administrador</option>
                <option value="client" <?php echo ($editUser['permissions'] == 'client') ? 'selected' : ''; ?>>Cliente</option>
            </select>

            <div class="edit-item-popup-buttons">
                <button class="save-button"
                        type="submit"
                        name="editUser">Atualizar Utilizador
                </button>

                <a href="<?php echo htmlspecialchars($previousPage); ?>"
                   class="save-button">Sair
                </a>

            </div>

        </form>

    </div>

</div>
<div id="edit-overlay" class="edit-item-overlay"></div>
