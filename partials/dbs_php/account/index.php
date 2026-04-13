<?PHP
session_start();

if (empty($_SESSION["authenticated"])) {
    header("Location: /~up201906465/dbs/account/login");
}

const ACCESS_ALLOWED = true;
include_once "../database/opendb.php";
include_once "../database/users.php";

$sErrorMsg = "";
$sSuccessMsg = "";
$id = $_SESSION["id"];

if($_SERVER["REQUEST_METHOD"] == "POST"){
    $form_type = $_POST['form_type'];
    switch ($form_type) {
        case 'personalData':
            $address = getUserAddressById($id);

            $personalData = [
                'firstname' => $_POST['firstname'],
                'lastname' => $_POST['lastname'],
                'birthdate' => $_POST['birthdate'],

            ];

            $user = [
                'username' => $_POST['username'],
                'email' => $_POST['email']
            ];

            if (!updateUserPersonalDatabyId($id, $personalData)) {
                $sErrorMsg = "Erro ao atualizar os dados pessoais!";
            }
            else if (!updateUserUsernameById($id, $user['username'])) {
                $sErrorMsg = "Já existe um utilizador com esse nome!";
            }
            else if(!updateUserEmailById($id, $user['email'])){
                $sErrorMsg = "Já existe um utilizador com esse email!";
            }
            else {
                $sSuccessMsg = "Dados pessoais atualizados com sucesso!";
            }
            break;

        case 'password':

            $user = getUserById($id);
            $personalData = getUserPersonalDataById($id);
            $address = getUserAddressById($id);

            if($_POST['newPassword'] != $_POST['confirmPassword']){
                $sErrorMsg = "As passwords não coincidem!";
                break;
            }
            else{
                if(updateUserPasswordById($id,$_POST['oldPassword'],$_POST['newPassword'])){
                    $sSuccessMsg = "Password atualizada com sucesso!";
                }
                else{
                    $sErrorMsg = "Erro ao atualizar a password!";
                }
            }
            break;

        case 'address':
            $user = getUserById($id);
            $personalData = getUserPersonalDataById($id);

            $address = [
                'street' => $_POST['street'],
                'city' => $_POST['city'],
                'postalcode' => $_POST['postalcode'],
                'phonenumber' => $_POST['phonenumber'],
                'nif' => $_POST['nif']
            ];

            if (updateUserAddressById($id, $address)) {
                $sSuccessMsg = "Morada atualizada com sucesso!";
            } else {
                $sErrorMsg = "Erro ao atualizar a morada!";
            }
            break;
    }
}
else{
    $user = getUserById($id);
    $personalData = getUserPersonalDataById($id);
    $address = getUserAddressById($id);
}


?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Dados Pessoais</title>
    <?php include_once "../includes/head.php"; ?>
</head>

<body>

<?php include_once "../includes/header.php"; ?>

<div class="body-content">
    <div class="page-container">
        <div class="page-container-top">
            <div class="item">
                <div class="user-info">
                    <h1> Olá <?php echo htmlspecialchars($user['username']);?> </h1>
                    <div class="end-session-button">
                        <a href="database/logout.php">Terminar Sessão</a>
                    </div>
                </div>
            </div>

            <div class="item">
                <h1> Dados Pessoais</h1>
            </div>
        </div>

        <div class="page-container-bottom">
            <div class="menu-container">
                <h2> Painel de Conta</h2>

                <a href="account" class="item">
                    <img src="assets/icons/personal-data.png">
                    <span>Dados Pessoais</span>
                </a>

                <a href="" class="item">
                    <img src="assets/icons/orders.png">
                    <span>Encomendas e Faturas</span>
                </a>

                <a href="" class="item">
                    <img src="assets/icons/ticket.png">
                    <span>Apoio ao Cliente</span>
                </a>

            </div>

            <div class="personal-data-container">

                <div class="item">
                    <h2> Dados da Minha Conta </h2>
                    <div class="user-data-form">
                        <form method="POST" action="">
                            <input type="hidden"
                                   name="form_type"
                                   value="personalData">

                            <input type="text"
                                   name="firstname"
                                   placeholder="Nome"
                                   pattern=".{4,16}"
                                   title="O nome deverá ter entre 4-16 caracteres."
                                   value="<?php echo htmlspecialchars($personalData['firstname']);?>"
                                   required>

                            <input type="text"
                                   name="lastname"
                                   placeholder="Apelido"
                                   pattern=".{4,16}"
                                   title="O apelido deverá ter entre 4-16 caracteres."
                                   value="<?php echo htmlspecialchars($personalData['lastname']);?>"
                                   required>

                            <input type="text"
                                   name="username"
                                   placeholder="Nome de Utilizador"
                                   pattern=".{4,16}"
                                   title="O nome de utizador deverá ter entre 4-16 caracteres."
                                   value="<?php echo htmlspecialchars($user['username']);?>"
                                   required>

                            <input type="email"
                                   name="email"
                                   placeholder="E-Mail"
                                   value="<?php echo htmlspecialchars($user['email']);?>"
                                   required>

                            <input type="date"
                                   name="birthdate"
                                   placeholder="Data de Nascimento"
                                   value="<?php echo htmlspecialchars($personalData['birthdate']);?>"
                                   required>

                            <input style="visibility: hidden">

                            <button class="save-button"
                                    type="submit">Guardar
                            </button>

                            <?php if(isset($form_type) && $form_type == 'personalData'): ?>
                                <?php if($sErrorMsg != ""): ?>
                                    <p class='error-message'><?php echo htmlspecialchars($sErrorMsg); ?></p>
                                <?php elseif($sSuccessMsg != ""): ?>
                                    <p class='success-message'><?php echo htmlspecialchars($sSuccessMsg); ?></p>
                                <?php endif; ?>
                            <?php endif; ?>
                        </form>
                    </div>
                </div>
                <div class="item">

                    <h2> Alterar Password </h2>

                    <div class="user-data-form">
                        <form method="POST" action="">
                            <input type="hidden"
                                   name="form_type"
                                   value="password">

                            <input type="password"
                                   name="oldPassword"
                                   placeholder="Password Atual"
                                   pattern="(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{4,18}"
                                   required>

                            <input style="visibility: hidden">

                            <input type="password"
                                   name="newPassword"
                                   placeholder="Nova Password"
                                   pattern="(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{4,18}"
                                   required>

                            <input type="password"
                                   name="confirmPassword"
                                   placeholder="Confirmar Password"
                                   pattern="(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{4,18}"
                                   required>

                            <button class="save-button"
                                    type="submit">Alterar
                            </button>

                            <?php if(isset($form_type) && $form_type == 'password'): ?>
                                <?php if($sErrorMsg != ""): ?>
                                    <p class='error-message'><?php echo htmlspecialchars($sErrorMsg); ?></p>
                                <?php elseif($sSuccessMsg != ""): ?>
                                    <p class='success-message'><?php echo htmlspecialchars($sSuccessMsg); ?></p>
                                <?php endif; ?>
                            <?php endif; ?>
                        </form>
                    </div>

                    <div class="password">
                        <p>A password terá de cumprir os seguintes requisitos:</p>
                        <ul>
                            <li>Pelo menos 6 caracteres válidos: a-z A-Z 0-9.</li>
                            <li>Pelo menos 1 caracter maiúsculo.</li>
                            <li>Pelo menos 1 número.</li>
                        </ul>
                    </div>

                </div>
                <div class="item .password">

                    <h2> Morada de Entrega e de Faturação </h2>
                    <div class="user-data-form">
                        <form method="POST" action="">
                            <input type="hidden"
                                   name="form_type"
                                   value="address">

                            <input  type="text"
                                    name="street"
                                    placeholder="Morada"
                                    pattern="(.{5,50}"
                                    title="A morada deverá ter entre 5-50 caracteres."
                                    value="<?php echo htmlspecialchars($address['street']);?>"
                                    required>

                            <input  type="text"
                                    name="city"
                                    placeholder="Cidade"
                                    title="A cidade deverá ter entre 4-16 caracteres."
                                    pattern=".{4,16}" value="<?php echo htmlspecialchars($address['city']);?>"
                                    required>

                            <input class="address"
                                   type="number"
                                   name="phonenumber"
                                   pattern="\d{9}"
                                   placeholder="Numero de Telefone"
                                   title="O número de telefone deverá ter 9 dígitos."
                                   value="<?php echo htmlspecialchars($address['phonenumber']);?>"
                                   required>

                            <input class="address"
                                   type="text"
                                   name="postalcode"
                                   placeholder="Código Postal"
                                   pattern="\d{4}-\d{3}"
                                   title="O código postal deverá ter o formato 0000-000."
                                   value="<?php echo htmlspecialchars($address['postalcode']);?>"
                                   required>

                            <input class="address"
                                   type="number"
                                   name="nif"
                                   placeholder="NIF"
                                   pattern="^\d{9}$"
                                   title="O NIF deverá ter 9 dígitos."
                                   value="<?php echo htmlspecialchars($address['nif']);?>">


                            <button class="save-button"
                                    type="submit">Guardar
                            </button>

                            <?php if(isset($form_type) && $form_type == 'address'): ?>
                                <?php if($sErrorMsg != ""): ?>
                                    <p class='error'><?php echo htmlspecialchars($sErrorMsg); ?></p>
                                <?php elseif($sSuccessMsg != ""): ?>
                                    <p class='success'><?php echo htmlspecialchars($sSuccessMsg); ?></p>
                                <?php endif; ?>
                            <?php endif; ?>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<?php include_once "../includes/footer.php"; ?>
</body>

</html>
