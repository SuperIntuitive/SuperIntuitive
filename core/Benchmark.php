<?php

class Benchmark{

	static function PasswordHashCost($cost = 8, $timeTarget = 0.05){
		do {
			$cost++;
			$start = microtime(true);
			password_hash("test", PASSWORD_BCRYPT, ["cost" => $cost]);
			$end = microtime(true);
		} while (($end - $start) < $timeTarget);
		return $cost;
	}


}