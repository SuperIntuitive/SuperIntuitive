<?php
Tools::Autoload();
class Email {

	public function __construct(){

	}
	
	public function __destruct(){

	}


	public function Send($post){
		//the simplist email only has a to address to send to and it must be an array.
		if(isset($post['to']) && isset($post['message']) ){

			$to = $post['to'];

			$subject = '';
			if(isset($post['subject'])){
				$subject = $post['subject'];
			}

			$message = '';
			if(isset($post['message'])){
				$message = $post['message'];
			}

 
			// Additional headers
			// To send HTML mail, the Content-type header must be set
			$headers[] = 'MIME-Version: 1.0';
			$headers[] = 'Content-type: text/html; charset=iso-8859-1';

			//this can't come from the client. it must be known by the server
			//If the email client is setup, most of the time this will be the logged in users domain email. 
			//It could also be the notification email. 
			//TODO develop logic to handle email  
			$from = ""; 
			if(isset($from)){
				$headers[] = 'From: '.$from;
			}

			if(isset($post['cc'])){
				$headers[] = 'Cc: '.$post['cc'];
			}

			if(isset($post['bcc'])){
				$headers[] = 'Bcc: '.$post['bcc'];
			}

			// Mail it
			mail($to, $subject, $message, implode("\r\n", $headers));
	}

	}


} 