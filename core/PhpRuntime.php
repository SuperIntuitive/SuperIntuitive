<?php
namespace SuperIntuitive;

// Minimum releases fixing CVE-2026-109618 and CVE-2026-109619 (2026-10-21).
// https://www.php.net/archive/2026.php#2026-10-21-5
class PhpRuntime {
    const MINIMUM_RELEASES = array(
        '8.2' => '8.2.35',
        '8.3' => '8.3.36',
        '8.4' => '8.4.27',
        '8.5' => '8.5.12',
    );

    public static function IsPatched($version) {
        if (!is_string($version)
            || !preg_match('/^(8\.[2-5])\.(\d+)(?:[-+][A-Za-z0-9.+~_-]+)?$/D', $version, $parts)
            || preg_match('/(?:dev|alpha|beta|RC\d|snapshot)/i', $version)) {
            return false;
        }

        $release = $parts[1].'.'.$parts[2];
        return version_compare($release, self::MINIMUM_RELEASES[$parts[1]], '>=');
    }

    public static function RequirePatched() {
        if (self::IsPatched(PHP_VERSION)) {
            return;
        }

        $message = 'SuperIntuitive requires patched PHP: 8.2.35+, 8.3.36+, 8.4.27+, or 8.5.12+ within those branches. '
            .'Upgrade PHP and restart the server before continuing. Detected: '.PHP_VERSION;
        if (PHP_SAPI === 'cli') {
            fwrite(STDERR, $message.PHP_EOL);
        } else {
            http_response_code(503);
            header('Content-Type: text/plain; charset=UTF-8');
            header('Cache-Control: no-store');
            echo $message;
        }
        exit(1);
    }
}
