<?php
namespace SuperIntuitive;

// Shared by PHP workers and browser sessions. Never trust forwarded IP headers.
class RateLimit {
    public static function Allow($scope, $limit = 10, $window = 300) {
        $directory = $_SERVER['DOCUMENT_ROOT'].'/logs/security-rate-limit';
        if (is_link($directory) || (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory))) {
            return false;
        }
        $key = hash('sha256', $scope.'|'.($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        $path = $directory.'/'.$key.'.json';
        if (is_link($path)) {
            return false;
        }
        $file = @fopen($path, 'c+');
        if ($file === false) {
            return false;
        }
        try {
            if (!flock($file, LOCK_EX)) {
                return false;
            }
            $state = json_decode(stream_get_contents($file, 1024), true);
            $now = time();
            if (!is_array($state) || !isset($state['start'], $state['count'])
                || $state['start'] > $now || $state['start'] + $window <= $now) {
                $state = array('start' => $now, 'count' => 0);
            }
            if ($state['count'] >= $limit) {
                return false;
            }
            $state['count']++;
            rewind($file);
            if (!ftruncate($file, 0) || fwrite($file, json_encode($state)) === false || !fflush($file)) {
                return false;
            }
            return true;
        } finally {
            fclose($file);
        }
    }

    public static function RequireAllowance($scope, $limit = 10, $window = 300) {
        if (self::Allow($scope, $limit, $window)) {
            return true;
        }
        http_response_code(429);
        header('Retry-After: '.$window);
        return false;
    }
}
