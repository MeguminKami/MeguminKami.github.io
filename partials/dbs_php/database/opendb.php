<?php
$conn = pg_connect("host=db.fe.up.pt dbname=sie242510 user=sie242510 password=IOuNQwZmOD");
$query = "set schema 'djabusabi'";
pg_exec($conn, $query);
