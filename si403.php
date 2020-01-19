<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */

//Anyone who has the pleasure to visit the access violation 403 page (by following server path urls) shall get to sign the guest book, before being redirected to 404; 
$maxFileSize = 1000000; //picture dr evil with his pinky at the corner of his mouth snearing out One Million Bytes while the others in the room appear bored by the unimpressive megabyte.
//Add our friend to the guest book.
file_put_contents('logs/403.log', date("Y-m-d H:i:s")."\r\n".print_r($_SERVER,true)."\r\n--------------------------------------------------", FILE_APPEND);

// if the file becomes more than a megabtye, for every log added remove one. 
if(filesize ( 'logs/403.log' )> $maxFileSize){
	$file = file_get_contents('logs/403.log');
	$choppoint = strpos($file,"--------------------------------------------------")+50;
	$leftover = substr($file,$choppoint);
	file_put_contents('logs/403.log',$leftover);
}
?>

<meta http-equiv="refresh" content="0;url=/404" />
