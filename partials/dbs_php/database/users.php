<?php
// CRUD IMPLEMENTATION

// CREATES
// -----------------------------------------------------------------------------------------------

function createUserClient($username, $email, $password) {
    global $conn;
    $password_md5 = md5($password);

    $query = "INSERT INTO users (username, email, password, permissions) 
              VALUES ($1, $2, $3, 'client') 
              RETURNING id";

    $result = pg_query_params($conn, $query, array($username, $email, $password_md5));
    if ($result) {
        $row = pg_fetch_assoc($result);
        createUserAddress($row['id']);
        createUserPersonalData($row['id']);
        logInUser($email);
    }
    header("Location: /~up201906465/dbs/");
}

function createUserByAdmin($username, $email, $password, $permissions) {
    global $conn;
    $password_md5 = md5($password);

    $query = "INSERT INTO users (username, email, password, permissions) 
              VALUES ($1, $2, $3, $4) 
              RETURNING id";

    $result = pg_query_params($conn, $query, array($username, $email, $password_md5, $permissions));
    if ($result) {
        $row = pg_fetch_assoc($result);
        createUserAddress($row['id']);
        createUserPersonalData($row['id']);
        return true;
    }
    else{
        return false;
        }
}


function createUserAddress($id) {
    global $conn;
    $query = "INSERT INTO address (id, street, city, postalcode, phonenumber, nif) 
              VALUES ($1, '', '', '', '', '')";
    pg_query_params($conn, $query, array($id));
}

function createUserPersonalData($id) {
    global $conn;
    $query = "INSERT INTO personaldata (id, firstname, lastname, birthdate) 
              VALUES ($1, '', '', '')";
    pg_query_params($conn, $query, array($id));
}

// READS
// -----------------------------------------------------------------------------------------------

function checkUserExists($identifier) {
    global $conn;
    $query = "SELECT * FROM users WHERE username = $1 OR email = $1";
    $result = pg_query_params($conn, $query, array($identifier));
    return pg_num_rows($result) > 0;
}

function checkDifferentUserExists($id, $identifier)
{
    global $conn;
    $query = "SELECT * FROM users WHERE (username = $1 OR email = $1) AND id != $2";
    $result = pg_query_params($conn, $query, array($identifier, $id));
    return pg_num_rows($result) > 0;
}

function validateUserByEmail($email, $password) {
    global $conn;
    $password_md5 = md5($password);
    $query = "SELECT * FROM users WHERE users.email = $1 AND users.password = $2";
    $result = pg_query_params($conn, $query, array($email, $password_md5));

    if (pg_num_rows($result) > 0) {
        require_once 'login.php';
        startUserSessionByEmail($email, $password);
        return true;
    } else {
        return false;
    }
}

function validateUserByUsername($username, $password) {
    global $conn;
    $password_md5 = md5($password);
    $query = "SELECT * FROM users WHERE users.username = $1 AND users.password = $2";
    $result = pg_query_params($conn, $query, array($username, $password_md5));

    if (pg_num_rows($result) > 0) {
        require_once 'login.php';
        startUserSessionByUsername($username, $password);
        return true;
    } else {
        return false;
    }
}

function validateUserById($id, $password)
{
    global $conn;
    $password_md5 = md5($password);
    $query = "SELECT * FROM users WHERE users.id = $1 AND users.password = $2";
    $result = pg_query_params($conn, $query, array($id, $password_md5));

    if (pg_num_rows($result) > 0) {
        return true;
    } else {
        return false;
    }
}

function logInUser($email) {
    global $conn;
    $query = "SELECT * FROM users WHERE users.email = $1";
    $result = pg_query_params($conn, $query, array($email));
    $row = pg_fetch_assoc($result);

    $_SESSION["authenticated"] = true;
    $_SESSION["id"] = $row['id'];
}

// CREATES
// -----------------------------------------------------------------------------------------------

function getUserList() {
    global $conn;
    $query = "SELECT id, username, email, permissions FROM users";
    $result = pg_query($conn, $query);
    if ($result) {
        return pg_fetch_all($result);
    }
    return [];
}


function getUserColumnById($id, $column) {
    global $conn;
    $query = "SELECT $column FROM users WHERE users.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        $row = pg_fetch_assoc($result);
        return $row[$column];
    }
    return "";
}

function getUserById($id) {
    global $conn;
    $query = "SELECT * FROM users WHERE users.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        return pg_fetch_assoc($result);
    }
    return null;
}

function getUserPersonalDataById($id) {
    global $conn;
    $query = "SELECT * FROM personaldata WHERE personaldata.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        return pg_fetch_assoc($result);
    }
    return null;
}


function getUserAddressById($id) {
    global $conn;
    $query = "SELECT * FROM address WHERE address.id = $1";
    $result = pg_query_params($conn, $query, array($id));
    if ($result) {
        return pg_fetch_assoc($result);
    }
    return null;
}

// UPDATES
// -----------------------------------------------------------------------------------------------


function updateUserById($id, $username, $email, $password, $permissions) {
    global $conn;
    $query = "UPDATE users SET username = $1, email = $2, permissions = $3";

    if (!empty($password)) {
        $password_md5 = md5($password);
        $query .= ", password = $4 WHERE id = $5";
        $params = array($username, $email, $permissions, $password_md5, $id);
    }
    else{
        $params = array($username, $email, $permissions, $id);
        $query .= " WHERE id = $4";
    }

    $result = pg_query_params($conn, $query, $params);
    return $result !== false;
}



function updateUserEmailById($id, $email) {
    global $conn;
    if(checkDifferentUserExists($id,$email)) {
        return false;
    }
    $query = "UPDATE users SET email = $1 WHERE id = $2";
    $result = pg_query_params($conn, $query, array($email, $id));
    return $result !== false;
}

function updateUserUsernameById($id, $username) {
    global $conn;
    if(checkDifferentUserExists($id,$username)) {
        return false;
    }
    $query = "UPDATE users SET username = $1 WHERE id = $2";
    $result = pg_query_params($conn, $query, array($username, $id));
    return $result !== false;
}

function updateUserPersonalDataById($id, $personalData) {
    global $conn;
    $query = "UPDATE personaldata SET firstname = $1, lastname = $2, birthdate = $3 WHERE id = $4";
    $params = array($personalData['firstname'], $personalData['lastname'], $personalData['birthdate'], $id);
    $result = pg_query_params($conn, $query, $params);
    return $result !== false;
}

function updateUserAddressById($id, $addressData) {
    global $conn;
    $query = "UPDATE address SET street = $1, city = $2, postalcode = $3, phonenumber = $4, nif = $5 WHERE id = $6";
    $params = array($addressData['street'], $addressData['city'], $addressData['postalcode'], $addressData['phonenumber'], $addressData['nif'], $id);
    $result = pg_query_params($conn, $query, $params);
    return $result !== false;
}

function updateUserPasswordById($id,$oldPassword,$newPassword)
{
    global $conn;
    if(!validateUserById($id,$oldPassword)) {
        return false;
    }

    $newPassword_md5 = md5($newPassword);
    $query = "UPDATE users SET password = $1 WHERE id = $2";
    $result = pg_query_params($conn, $query, array($newPassword_md5, $id));
    return $result !== false;

}


// DELETES
// -----------------------------------------------------------------------------------------------


function deleteUserById($id) {
    global $conn;
    $query = "DELETE FROM users WHERE id = $1";
    $result = pg_query_params($conn, $query, array($id));
    return $result !== false;
}

?>