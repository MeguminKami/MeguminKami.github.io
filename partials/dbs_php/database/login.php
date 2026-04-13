<?php
function startUserSessionByEmail($email, $password) {
    global $conn;
    $password_md5 = md5($password);
    $query = "SELECT * FROM users WHERE users.email = $1 AND users.password = $2";
    $result = pg_query_params($conn, $query, array($email, $password_md5));
    $row = pg_fetch_assoc($result);

    $_SESSION["authenticated"] = true;
    $_SESSION["id"] = $row['id'];
    $_SESSION["permissions"] = $row['permissions'];
}

function startUserSessionByUsername($username, $password) {
    global $conn;
    $password_md5 = md5($password);
    $query = "SELECT * FROM users WHERE users.username = $1 AND users.password = $2";
    $result = pg_query_params($conn, $query, array($username, $password_md5));
    $row = pg_fetch_assoc($result);

    $_SESSION["authenticated"] = true;
    $_SESSION["id"] = $row['id'];
    $_SESSION["permissions"] = $row['permissions'];
}
