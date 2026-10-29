<?php
namespace SuperIntuitive;

// Setup ownership is a server-side session privilege, separate from administrator login.
class SetupAuthorization {
    const IDLE_TIMEOUT = 1800;
    const ABSOLUTE_TIMEOUT = 43200;

    public static function Revoke() {
        unset($_SESSION['SI']['security']['setup']);
    }

    public static function IsAuthorized($now = null) {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return false;
        }
        $now = $now ?? time();
        $state = $_SESSION['SI']['security']['setup'] ?? null;
        $fingerprint = Tools::GetSetupTokenFingerprint();
        if (!is_array($state) || !is_int($state['authorized_at'] ?? null)
            || !is_int($state['last_activity'] ?? null) || !is_string($state['fingerprint'] ?? null)
            || $fingerprint === null || !hash_equals($fingerprint, $state['fingerprint'])
            || $state['authorized_at'] > $now || $state['last_activity'] > $now
            || $now - $state['authorized_at'] >= self::ABSOLUTE_TIMEOUT
            || $now - $state['last_activity'] >= self::IDLE_TIMEOUT) {
            self::Revoke();
            return false;
        }
        $_SESSION['SI']['security']['setup']['last_activity'] = $now;
        return true;
    }

    public static function Authorize($token) {
        if (session_status() !== PHP_SESSION_ACTIVE || !Tools::ValidateSetupToken($token)) {
            return false;
        }
        // Rotate both identifiers at the privilege boundary; never retain the key itself.
        if (!session_regenerate_id(true)) {
            return false;
        }
        $_SESSION['SI']['security']['csrf'] = bin2hex(random_bytes(32));
        $_SESSION['SI']['security']['setup'] = array(
            'authorized_at' => time(),
            'last_activity' => time(),
            'fingerprint' => Tools::GetSetupTokenFingerprint(),
        );
        return true;
    }
}
