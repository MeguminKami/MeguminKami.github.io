<?PHP
session_start();

if (!empty($_SESSION["authenticated"])) {
    header("Location: /~up201906465/dbs/");
}

const ACCESS_ALLOWED = true;
include_once "../../database/opendb.php";
include_once "../../database/users.php";

function isEmail($input) {
    return filter_var($input, FILTER_VALIDATE_EMAIL) !== false;
}

$sErrorMsg = "";
$logintext = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $logintext = $_POST['logintext'];

    if (isEmail($logintext)) {

        if (!checkUserExists($logintext)) {
            $sErrorMsg = "Este email ainda não pertence a um Djabusabi!";

        } else {
            if (validateUserByEmail($logintext, $_POST['password'])) {
                header("Location: /~up201906465/dbs/");

            } else {
                $sErrorMsg = "Erras-te a password nha mano!";
            }
        }

    } else {

        if (!checkUserExists($logintext)) {
            $sErrorMsg = "Este nome de utilizador ainda não pertence a um Djabusabi!";

        } else {
            if (validateUserByUsername($logintext, $_POST['password'])) {
                header("Location: /~up201906465/dbs/");

            } else {
                $sErrorMsg = "Erras-te a password nha mano!";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Entrar</title>
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
                <h1>Entra com a tua conta Djabusabi!</h1>

                <div class="login-signup-form">
                    <form method="POST" action="">
                        <input type="text"
                               name="logintext"
                               placeholder="E-Mail ou Nome de Utilizador"
                               required>

                        <input type="password"
                               name="password"
                               placeholder="Password"
                               required>

                        <?php if(!empty($sErrorMsg)):?>
                            <p class="error-message"><?php echo htmlspecialchars($sErrorMsg);?></p>
                        <?php endif; ?>

                        <button class="login-signup-button"
                                type="submit">Iniciar Sessão
                        </button>
                    </form>
                </div>

            </div>
            <div class="login-signup-container">
                <h1>Ainda não és um membro dos Djabusabi?</h1>
                <h2>O que é andas a fazer regista-te e anda dar piscas conosco!</h2>
                <a href="account/signup" class="login-signup-button">Criar Conta</a>
            </div>
        </div>
    </div>
</div>

<?php include_once "../../includes/footer.php"; ?>

</body>

</html>

