<?php
namespace SuperIntuitive;
Tools::Autoload();
class Login {
    private function SetRememberCookie($name, $value, $expires){
        setcookie($name, $value, Tools::GetCookieOptions($expires));
    }

    private function ClearRememberCookies(){
        foreach(array('remembermetoken', 'remembermetime') as $name){
            setcookie($name, '', Tools::GetCookieOptions(time() - 3600));
            unset($_COOKIE[$name]);
        }
    }

    private function FindScopedUser($condition, $params){
        $db = new Database();
        $query = $db->DBC()->prepare("SELECT HEX(u.id) AS id, u.name, u.email, u.password, u.preferences
            FROM users u
            INNER JOIN entities e ON e.id = u.entity_id AND e.name = 'users' AND e.status = 'active'
            INNER JOIN domains d ON d.id = e.domain_id AND d.status = 'active'
            INNER JOIN subdomains s ON s.id = e.subdomain_id AND s.domain_id = d.id AND s.status = 'active'
            WHERE d.name = :domain AND s.name = :subdomain AND u.status = 'active' AND ".$condition." LIMIT 1");
        $query->execute(array_merge(array(':domain' => SI_DOMAIN_NAME, ':subdomain' => SI_SUBDOMAIN_NAME), $params));
        $user = $query->fetch();
        return $user === false ? null : $user;
    }

    private function FindActiveUserByEmail($email){
        return $this->FindScopedUser('u.email = :email', array(':email' => $email));
    }

    private function FindRememberedUser($token, $time){
        if(!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)
            || !is_int($time) || $time <= 0 || $time > time() || $time < time() - 30 * 86400){
            return null;
        }
        return $this->FindScopedUser('u.remembertoken = :token AND u.remembertime = :time',
            array(':token' => substr(hash('sha256', $token), 0, 32), ':time' => $time));
    }

    private function FindUserRoles($userId){
        $db = new Database();
        $query = $db->DBC()->prepare("SELECT sr.name, sr.rules FROM relations r
            INNER JOIN users u ON u.id = r.parent_id AND u.entity_id = r.parententity_id
            INNER JOIN entities ue ON ue.id = u.entity_id
            INNER JOIN securityroles sr ON sr.id = r.child_id AND sr.entity_id = r.childentity_id AND sr.status = 'active'
            INNER JOIN entities se ON se.id = sr.entity_id AND se.domain_id = ue.domain_id AND se.subdomain_id = ue.subdomain_id
            INNER JOIN entities re ON re.id = r.entity_id AND re.domain_id = ue.domain_id AND re.subdomain_id = ue.subdomain_id
            WHERE u.id = UNHEX(:userid) AND r.status = 'active'");
        $query->execute(array(':userid' => substr(Tools::FixGuid($userId), 2)));
        return $query->fetchAll();
    }

    private function ApplyRoles($userId){
        $user =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user'];
        $previous = array($user['roles'] ?? array(), $user['permissions'] ?? array());
        $user['roles'] = array();
        $user['permissions'] = array();
        foreach($this->FindUserRoles($userId) as $role){
            $user['roles'][] = $role['name'];
            $rules = json_decode($role['rules'], true);
            if(!is_array($rules)){
                continue;
            }
            foreach($rules as $entityId => $permissions){
                $entityId = Tools::FixGuid($entityId);
                if($entityId === false || !is_array($permissions)){
                    continue;
                }
                foreach(array('create', 'read', 'write', 'delete', 'append', 'appendTo') as $action){
                    $grant = filter_var($permissions[$action] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $user['permissions'][$entityId][$action] = ($user['permissions'][$entityId][$action] ?? false) || $grant;
                }
            }
        }
        if(empty($user['roles'])){
            $user['roles'] = array('Guest');
        }
        if($previous !== array($user['roles'], $user['permissions'])){
            unset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page'], $_SESSION['SITMP']);
        }
        $deployment =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];
        if(!in_array($deployment, array('live', 'test', 'dev'), true)) $deployment = 'live';
        if(!in_array('Admin', $user['roles'], true)){
            if(!in_array($deployment, array('live', 'test'), true) || !in_array('Tester', $user['roles'], true)){
                $deployment = 'live';
            }
        }
    }

    private function UpdateRememberMe($userId, $token = '', $time = null){
        $db = new Database();
        $query = $db->DBC()->prepare("UPDATE users SET remembertoken = :token, remembertime = :time WHERE id = UNHEX(:userid)");
        $query->execute(array(':token' => $token, ':time' => $time, ':userid' => substr(Tools::FixGuid($userId), 2)));
    }

    private function InvalidateSession(){
        unset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]);
        unset($_SESSION['SITMP']);
        $this->ClearRememberCookies();
        if(session_status() === PHP_SESSION_ACTIVE){
            session_regenerate_id(true);
        }
    }

    public function RefreshSession(){
        if(!Tools::UserIsLoggedIn()){
            return false;
        }
        $session = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user'];
        $id = Tools::FixGuid($session['id'] ?? null);
        try{
            $user = $id === false ? null : $this->FindScopedUser('u.id = UNHEX(:id)', array(':id' => substr($id, 2)));
            if($user === null || !is_string($session['auth_hash'] ?? null)
                || !hash_equals(hash('sha256', $user['password']), $session['auth_hash'])
                || ($session['authenticated_at'] ?? 0) < time() - 12 * 3600
                || ($session['last_activity'] ?? 0) < time() - 1800){
                $this->InvalidateSession();
                return false;
            }
            $this->ApplyRoles($id);
            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['last_activity'] = time();
            return true;
        } catch(\Throwable $ex){
            $this->InvalidateSession();
            http_response_code(503);
            header('Cache-Control: no-store');
            exit('Unable to validate this session. Please try again.');
        }
    }

    public function Attempt($post){
        $return =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'];
        if(!RateLimit::RequireAllowance('login')){
            $return['LOGINFAIL'] = 'TRUE';
            return false;
        }
        $valid = is_string($post['email'] ?? null) && filter_var($post['email'], FILTER_VALIDATE_EMAIL)
            && is_string($post['password'] ?? null) && strlen($post['password']) <= 72 && strpos($post['password'], "\0") === false;
        $user = $valid ? $this->FindActiveUserByEmail($post['email']) : null;
        // Spend equivalent password work for unknown accounts, without blocking workers with sleeps.
        $hash = $user['password'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        $verified = password_verify($valid ? $post['password'] : '', $hash);
        if($user !== null && $verified){
            $this->Verified($user, $post);
            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['REFRESH'] = 'TRUE';
            return true;
        }
        $return['LOGINFAIL'] = 'TRUE';
        return false;
    }

    public function Remembered(){
        if(Tools::UserIsLoggedIn()){
            return false;
        }
        $timestamp = $_COOKIE['remembermetime'] ?? null;
        if(!is_string($timestamp) || !ctype_digit($timestamp)){
            return false;
        }
        $user = $this->FindRememberedUser($_COOKIE['remembermetoken'] ?? null, (int)$timestamp);
        if($user === null){
            $this->ClearRememberCookies();
            return false;
        }
        $this->Verified($user, array('rememberme' => true));
        return true;
    }

    private function Verified($ouruser, $post){
        session_regenerate_id(true);
        unset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page'], $_SESSION['SITMP']);
        if(($post['rememberme'] ?? false) === true){
            $token = bin2hex(random_bytes(32));
            $timestamp = time();
            $this->UpdateRememberMe($ouruser['id'], substr(hash('sha256', $token), 0, 32), $timestamp);
            $this->SetRememberCookie('remembermetoken', $token, $timestamp + 30 * 86400);
            $this->SetRememberCookie('remembermetime', (string)$timestamp, $timestamp + 30 * 86400);
        }else{
            $this->ClearRememberCookies();
            $this->UpdateRememberMe($ouruser['id']);
        }
        $bu =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
        $bu['user'] = array('loggedin' => true, 'id' => Tools::FixGuid($ouruser['id']),
            'name' => $ouruser['name'], 'email' => $ouruser['email'], 'prefs' => array(),
            'preferences' => json_decode($ouruser['preferences'] ?? '{}', true),
            'auth_hash' => hash('sha256', $ouruser['password']), 'authenticated_at' => time(), 'last_activity' => time());
        $this->ApplyRoles($ouruser['id']);
        $bu['deployment'] = Tools::UserHasRole('Admin') ? 'dev' : 'live';
    }

    public function Logout(){
        if(Tools::UserIsLoggedIn()){
            $this->UpdateRememberMe($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id']);
        }
        $this->InvalidateSession();
        $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['REFRESH'] = 'TRUE';
    }

    public function Verify($post){
        if(!RateLimit::RequireAllowance('login') || !Tools::UserIsLoggedIn()
            || !is_string($post['email'] ?? null) || !filter_var($post['email'], FILTER_VALIDATE_EMAIL)
            || !is_string($post['password'] ?? null) || strlen($post['password']) > 72){
            return false;
        }
        $user = $this->FindActiveUserByEmail($post['email']);
        return $user !== null && Tools::FixGuid($user['id']) === Tools::FixGuid($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'])
            && password_verify($post['password'], $user['password']);
    }

    public function ChangePassword($post){
        $return =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'];
        $return['PASSWORDCHANGED'] = false;
        if(!Tools::UserIsLoggedIn() || !Tools::IsValidPassword($post['newpassword'] ?? null) || !$this->Verify($post)){
            $return['ERROR'] = 'Check the current credentials and use a new password of 10 to 72 bytes.';
            return false;
        }
        try{
            $hash = password_hash($post['newpassword'], PASSWORD_DEFAULT);
            $db = new Database();
            $id = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'];
            $query = $db->DBC()->prepare("UPDATE users SET password = :password, remembertoken = '', remembertime = NULL WHERE id = UNHEX(:id)");
            $query->execute(array(':password' => $hash, ':id' => substr($id, 2)));
            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['auth_hash'] = hash('sha256', $hash);
            session_regenerate_id(true);
            $this->ClearRememberCookies();
            $return['PASSWORDCHANGED'] = true;
            return true;
        }catch(\PDOException $ex){
            $return['ERROR'] = 'Unable to change the password.';
            return false;
        }
    }
}
