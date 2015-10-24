<?php
if (isset($_POST['img'])) {
    
    //Get the base-64 string from data
    $filteredData = substr($_POST['img'], strpos($_POST['img'], ",")+1);

    //Decode the string
    $unencodedData = base64_decode($filteredData);
    $fileName = uniqid('img') . '.png';

    //Save the image
    if (file_put_contents('uploads/' . $fileName, $unencodedData)) {
        header("HTTP/1.1 201 Created");
    } else {
        header("HTTP/1.1 500 Internal Server Error");
    }
} else {
    header("HTTP/1.1 400 Bad Request");
}