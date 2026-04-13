<?php

if (!defined('ACCESS_ALLOWED')) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed.');
}

// Function to get the arrow for the sort display
function getSortArrow($column, $current_sort, $current_order) {
    if ($column === $current_sort) {
        return $current_order === 'asc' ? '↑' : '↓';
    }
    return '';
}

$enableEditUserPopup = false;
if(isset($_GET['userId'])){
    $editUserId = $_GET['userId'];
    $editUser = getUserById($editUserId);
    if($editUser){
        $enableEditUserPopup = true;
    }
}

$userList = getUserList();

$sortBy = $_GET['sort_by'] ?? 'id';
$order = $_GET['order'] ?? 'asc';

// Gets the current URL for the dynamic assignment of the sort links
$currentUrl = $_SERVER['REQUEST_URI'];
$adminIndex = strpos($currentUrl, 'admin/');
$adminPath = substr($currentUrl, $adminIndex);
$previousPage = $_SERVER['HTTP_REFERER'] ?? 'admin';

$sErrorMsg = "";
$sSuccessMsg = "";

// Sorts the user list by the selected column and order
usort($userList, function ($a, $b) use ($sortBy, $order) {
    if ($order === 'asc') {
        return $a[$sortBy] <=> $b[$sortBy];
    } else {
        return $b[$sortBy] <=> $a[$sortBy];
    }
});

if($_SERVER["REQUEST_METHOD"] == "POST"){
    if(isset($_POST['editUser']) && isset($_GET['userId'])){

        $editUserUsername = $_POST['username'];
        $editUserEmail = $_POST['email'];
        $editUserPermissions = $_POST['permissions'];
        $editUserNewPassword = $_POST['newPassword'];
        $editUserConfirmPassword = $_POST['confirmPassword'];

        if(!empty($editUserNewPassword ) && $editUserNewPassword  !==  $editUserConfirmPassword){
            $sErrorMsg = "Passwords não coincidem!";
        }
        else{
            if(updateUserById($editUserId,$editUserUsername,$editUserEmail,$editUserNewPassword,$editUserPermissions)){
                $sSuccessMsg = "Utilizador atualizado com sucesso!";

                // Gets the updated user list
                $userList = getUserList();

                // Gets the updated user
                $editUser = getUserById($editUserId);
            }
            else{
                $sErrorMsg = "Erro ao atualizar utilizador!";
            }
        }
    }
}


?>
<div class="user-list-container">
    <div class="user-container">
        <div class="user-header">
            <div>
                <a href="admin/?page=userList&sort_by=id&order=<?= $order === 'asc' ? 'desc' : 'asc' ?>">
                    ID
                    <span class="sort-arrow"><?= getSortArrow('id', $sortBy, $order) ?></span>
                </a>
            </div>
            <div>
                <a href="admin/?page=userList&sort_by=username&order=<?= $order === 'asc' ? 'desc' : 'asc' ?>">
                    Nome de Utilizador
                    <span class="sort-arrow"><?= getSortArrow('username', $sortBy, $order) ?></span>
                </a>
            </div>
            <div>
                <a href="admin/?page=userList&sort_by=email&order=<?= $order === 'asc' ? 'desc' : 'asc' ?>">
                    Email
                    <span class="sort-arrow"><?= getSortArrow('email', $sortBy, $order) ?></span>
                </a>
            </div>

            <div>
                <a href="admin/?page=userList&sort_by=permissions&order=<?= $order === 'asc' ? 'desc' : 'asc' ?>">
                    Permissões
                    <span class="sort-arrow"><?= getSortArrow('permissions', $sortBy, $order) ?></span>
                </a>
            </div>

            <div  class="user-buttons-container"></div>

        </div>

        <?php foreach ($userList as $user): ?>
            <div class="user-item">
                <div><?= htmlspecialchars($user['id']) ?></div>

                <div><?= htmlspecialchars($user['username']) ?></div>

                <div><?= htmlspecialchars($user['email']) ?></div>

                <div><?= ($user['permissions'] == 'admin') ? 'Administrador' : 'Cliente'?></div>

                <div class="user-buttons-container">
                    <a href="<?php echo $adminPath.'&userId='.$user['id'].'#edit'?>"
                       class="edit-button"
                       style="margin: 0;">
                    </a>
                    <a href="<?php echo $adminPath.'&userId='.$user['id'].'#delete'?>"
                       class="delete-button"
                       style="margin: 0;">
                    </a>
                </div>

            </div>
        <?php endforeach; ?>
    </div>

    <?php if($enableEditUserPopup): ?>
        <?php include_once "userEdit.php"; ?>
    <?php endif?>

    <div id="delete" class="delete-item-popup">
        <h2>Remover este utilizador?</h2>
        <div class="delete-item-popup-buttons">
            <a href="<?php echo isset($_GET['userId']) ? 'admin/userDelete.php/?userId=' . $_GET['userId'] : '#'; ?>"
               class="delete-item-yes-button">Sim
            </a>
            <a href="<?php echo htmlspecialchars($previousPage); ?>"
               class="delete-item-no-button">Não
            </a>
        </div>
    </div>
    <div id="delete-overlay" class="delete-item-overlay"></div>


</div>