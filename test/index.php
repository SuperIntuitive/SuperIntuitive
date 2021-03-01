<?php
		if (function_exists('finfo_file')) {
			$finfo = finfo_open(FILEINFO_MIME_TYPE);
			$type = finfo_file($finfo, "/test.index.php");
            
			finfo_close($finfo);
		}
?>