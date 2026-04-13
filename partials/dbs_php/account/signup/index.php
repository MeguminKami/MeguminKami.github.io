<?PHP
session_start();
const ACCESS_ALLOWED = true;
if (!empty($_SESSION["authenticated"])){
    header("Location: /~up201906465/dbs/");
}

include_once "../../database/opendb.php";
include_once "../../database/users.php";

$sErrorMsg = "";
$username = $email = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $username = $_POST['username'];
    $email = $_POST['email'];
    $password = $_POST['password'];
    $confirmPassword = $_POST['confirmPassword'];

    if (checkUserExists($username)){
        $sErrorMsg = "Já existe um Djabusabi com o teu nome de utilizador!";

    } else if (checkUserExists($email)) {
        $sErrorMsg = "Já existe um Djabusabi com o teu email!";

    } else if($password != $confirmPassword) {
        $sErrorMsg = "As passwords não coincidem!";

    } else {
        createUserClient($username, $email, $password);
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Registar</title>
    <?php include_once "../../includes/head.php"; ?>
</head>


<body>

<div class="body-content">
    <div class="login-signup-page-container">
        <div class="home-icon-container">
            <a href="">
                <img src="assets/logos/logo_branco.png">
            </a>
        </div>
        <div class="login-signup-side-container">
            <div class="login-signup-container">
                <h1>Torna-te um Djabusabi aqui!</h1>
                <h2>É gratis.</h2>

                <div class="login-signup-form">
                    <form method="POST" action="">
                        <input type="text"
                               name="username"
                               placeholder="Nome de Utilizador"
                               pattern=".{4,16}"
                               title="O nome de utizador deverá ter entre 4-16 caracteres."
                               value="<?php echo htmlspecialchars($username);?>"
                               required>

                        <input type="email"
                               name="email"
                               placeholder="E-Mail"
                               value="<?php echo htmlspecialchars($email);?>"
                               required>

                        <input type="password"
                               name="password"
                               placeholder="Password"
                               pattern="(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}"
                               required>

                        <input type="password"
                               name="confirmPassword"
                               placeholder="Confirmar Password"
                               pattern="(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}"
                               required>

                        <div class="password-requirements">
                            <?php if(!empty($sErrorMsg)):?>
                                <p class="error-message"><?php echo htmlspecialchars($sErrorMsg);?></p>
                            <?php endif; ?>
                            <p>A password terá de cumprir os seguintes requisitos:</p>
                            <ul>
                                <li>Pelo menos 6 caracteres válidos: a-z A-Z 0-9.</li>
                                <li>Pelo menos 1 caracter maiúsculo.</li>
                                <li>Pelo menos 1 número.</li>
                            </ul>
                        </div>

                        <label class="terms-container">
                            <input type="checkbox"
                                   required>

                            <span class="checkmark"></span>
                            Li e aceito os Termos e Condições, e o uso dos meus dados pessoais como explicado pela Política de Privacidade.
                        </label>

                        <button class="login-signup-button"
                                type="submit">Criar Conta
                        </button>
                    </form>
                </div>

            </div>
            <div class="login-signup-container">
                <h1>Já é um membro dos Djabusabi?</h1>
                <h2>Clica a baixo para inicares sessão.</h2>
                <a href="account/login" class="login-signup-button">Iniciar Sessão</a>
            </div>
        </div>
    </div>
</div>

<?php include_once "../../includes/footer.php"; ?>

</body>

</html>
