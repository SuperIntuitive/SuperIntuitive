<?php
// Run in a patched PHP CLI: php tests/security.php
require_once dirname(__DIR__).'/core/Tools.php';

use SuperIntuitive\PhpRuntime;
use SuperIntuitive\Tools;
use SuperIntuitive\Setup;
use SuperIntuitive\Entity;

$checks = 0;
function check($condition, $message) {
    global $checks;
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
}

foreach (array('8.2.35', '8.2.36', '8.3.36', '8.3.99', '8.4.27', '8.5.12', '8.5.13', '8.2.35-1+deb12u1') as $version) {
    check(PhpRuntime::IsPatched($version), 'Patched release rejected: '.$version);
}
foreach (array('7.4.99', '8.0.99', '8.1.99', '8.2.34', '8.3.35', '8.4.26', '8.5.11', '8.4.0', '8.6.0', '9.0.0', '8.5.12RC1', '8.5.12-dev', '8.5.13-beta1', '8.2.35garbage', '8.2.35.1', '', null, array()) as $version) {
    check(!PhpRuntime::IsPatched($version), 'Unverified PHP release accepted: '.json_encode($version));
}

$root = sys_get_temp_dir().'/si-security-'.bin2hex(random_bytes(8));
mkdir($root.'/core', 0755, true);
$_SERVER['DOCUMENT_ROOT'] = $root;
define('SI_DOMAIN_NAME', 'localhost');
define('SI_SUBDOMAIN_NAME', '');
Tools::ConfigureSessionCookieParams();
session_start();
$clientCases = array('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'=>'windows', 'Mozilla/5.0 (X11; Linux x86_64)'=>'linux', 'Mozilla/5.0 (Linux; Android 15)'=>'android', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'=>'macos', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'=>'ios', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Mobile/15E148'=>'ios', 'Mozilla/5.0 (X11; CrOS x86_64)'=>'chromeos', ''=>'unknown');
foreach ($clientCases as $agent=>$expected) { check(SuperIntuitive\Sessions::DetectOS(array('user-agent'=>$agent)) === $expected, 'Visitor OS classification: '.$agent); }
check(SuperIntuitive\Sessions::DetectOS(array('sec-ch-ua-platform'=>'"Android"', 'user-agent'=>'Linux')) === 'android', 'Client platform hint takes priority');
$_SERVER['HTTP_USER_AGENT'] = 'Windows NT 10.0';
check(SuperIntuitive\Sessions::GetOS() === 'windows', 'Visitor OS is saved in the session');
$_SERVER['HTTP_USER_AGENT'] = 'Linux';
check(SuperIntuitive\Sessions::GetOS() === 'windows', 'Session OS remains consistent between requests');
unset($_SESSION['SI']['client'], $_SERVER['HTTP_USER_AGENT']);
check(!Tools::ValidateCsrfToken(''), 'Empty CSRF token accepted');
$csrf = Tools::EnsureCsrfToken();
check(Tools::ValidateCsrfToken($csrf), 'Valid CSRF token rejected');
check(!Tools::ValidateCsrfToken(str_repeat('0', 64)), 'Incorrect CSRF token accepted');
check(!Tools::ValidateCsrfToken(array()), 'Array CSRF token accepted');
$_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
check(!Tools::IsSecureRequest(), 'Untrusted forwarded header changes cookie security');
$_SERVER['REMOTE_ADDR'] = '192.0.2.1';
$_SERVER['HTTP_X_FORWARDED_FOR'] = '198.51.100.1';
check(Tools::GetIpAddress() === '192.0.2.1', 'Forwarded IP header is trusted without a configured proxy');
foreach(array('abcdefghij', 'abcdefghijk', 'abcdefghijkl', str_repeat('x', 72)) as $password){
    check(Tools::IsValidPassword($password), 'Valid password rejected');
}
foreach(array('short', str_repeat('x', 9), str_repeat('x', 73), "long-password\0bad", array(), null) as $password){
    check(!Tools::IsValidPassword($password), 'Unsafe password accepted');
}
$_SERVER['HTTP_ACCEPT_LANGUAGE'] = 'en\"><script>alert(1)</script>';
check(Tools::GetBrowserLanguage() === 'en', 'Untrusted language became an HTML attribute');
$_SERVER['HTTP_ACCEPT_LANGUAGE'] = 'fr-CA, en;q=0.5';
check(Tools::GetBrowserLanguage() === 'fr-ca', 'Valid language rejected');
putenv('SI_SETUP_TOKEN');
check(!Tools::ValidateSetupToken(str_repeat('a', 64)), 'Unconfigured installer can be claimed');
putenv('SI_SETUP_TOKEN=short');
check(!Tools::ValidateSetupToken('short'), 'Weak installation key accepted');
$setupToken = bin2hex(random_bytes(32));
putenv('SI_SETUP_TOKEN='.$setupToken);
check(Tools::ValidateSetupToken($setupToken), 'Valid installation key rejected');
check(!Tools::ValidateSetupToken(array()), 'Array installation key accepted');
check(!Tools::ValidateSetupToken(str_repeat('0', 64)), 'Incorrect installation key accepted');
putenv('SI_SETUP_TOKEN');
file_put_contents($root.'/core/setup.token', $setupToken."\n");
check(Tools::ValidateSetupToken($setupToken), 'Server installation key file rejected');
unlink($root.'/core/setup.token');

putenv('SI_SETUP_TOKEN='.$setupToken);
check(!SuperIntuitive\SetupAuthorization::IsAuthorized(), 'Fresh session already authorized setup');
check(!SuperIntuitive\SetupAuthorization::Authorize('wrong'), 'Incorrect key authorized setup');
$oldSession = session_id();
$oldCsrf = Tools::GetCsrfToken();
check(SuperIntuitive\SetupAuthorization::Authorize($setupToken), 'Correct key did not authorize setup');
check(session_id() !== $oldSession, 'Setup authorization did not rotate session ID');
check(Tools::GetCsrfToken() !== $oldCsrf, 'Setup authorization did not rotate CSRF token');
check(SuperIntuitive\SetupAuthorization::IsAuthorized(), 'Setup authorization was not preserved');
check(strpos(json_encode($_SESSION), $setupToken) === false, 'Session retained the installation secret');
$_SESSION['SI']['security']['setup']['last_activity'] = time() - 1800;
check(!SuperIntuitive\SetupAuthorization::IsAuthorized(), 'Idle setup authorization did not expire');
check(SuperIntuitive\SetupAuthorization::Authorize($setupToken), 'Setup reauthorization failed');
$_SESSION['SI']['security']['setup']['authorized_at'] = time() - 43200;
check(!SuperIntuitive\SetupAuthorization::IsAuthorized(), 'Absolute setup authorization did not expire');
check(SuperIntuitive\SetupAuthorization::Authorize($setupToken), 'Setup authorization could not be renewed');
putenv('SI_SETUP_TOKEN='.str_repeat('z', 64));
check(!SuperIntuitive\SetupAuthorization::IsAuthorized(), 'Changing the server key did not revoke setup ownership');
putenv('SI_SETUP_TOKEN='.$setupToken);
SuperIntuitive\SetupAuthorization::Authorize($setupToken);
SuperIntuitive\SetupAuthorization::Revoke();
check(!SuperIntuitive\SetupAuthorization::IsAuthorized(), 'Setup authorization survived explicit revocation');

check(SuperIntuitive\RateLimit::Allow('test', 2, 300), 'First authentication attempt rejected');
check(SuperIntuitive\RateLimit::Allow('test', 2, 300), 'Second authentication attempt rejected');
$_SERVER['HTTP_X_FORWARDED_FOR'] = '198.51.100.2';
check(!SuperIntuitive\RateLimit::Allow('test', 2, 300), 'Forwarded header bypassed shared rate limit');
session_regenerate_id(true);
check(!SuperIntuitive\RateLimit::Allow('test', 2, 300), 'New browser session bypassed shared rate limit');
$rateFile = $root.'/logs/security-rate-limit/'.hash('sha256', 'test|192.0.2.1').'.json';
file_put_contents($rateFile, json_encode(array('start' => time() - 301, 'count' => 2)));
check(SuperIntuitive\RateLimit::Allow('test', 2, 300), 'Expired rate limit did not reopen');

$setup = new Setup();
$reflection = new ReflectionClass($setup);
function invokeSetup($method, ...$args) {
    global $setup, $reflection;
    return $reflection->getMethod($method)->invoke($setup, ...$args);
}
$post = array(
    'dbtype' => 'mysql', 'dbserver' => 'db', 'dbport' => '3306', 'dbuserradio' => 'existuser',
    'existdb' => 'si_test', 'existuser' => 'si_test', 'existpass' => 'test-password',
    'domain' => 'localhost', 'adminuser' => 'admin', 'adminpw' => 'Ten-chars!',
    'adminemail' => 'admin@example.test', 'noteemail' => 'info@example.test',
    'language' => 'en', 'currency' => 'usd', 'timezone' => 'America/New_York',
);
check(invokeSetup('ValidateInstallInput', $post), 'Valid setup rejected');
foreach(array('en-us', 'en-US', 'fr-ca') as $regional){
    $normalized = invokeSetup('NormalizeInstallInput', array_replace($post, array('language' => $regional)));
    check($normalized['language'] === explode('-', strtolower($regional))[0], 'Recognized regional language was not normalized');
    check(invokeSetup('ValidateInstallInput', array_replace($post, array('language' => $regional))), 'Supported browser language rejected');
}
check(!invokeSetup('ValidateInstallInput', array_replace($post, array('language' => 'en-unsupported'))), 'Unknown language variant accepted');
$errors = invokeSetup('InstallInputErrors', array_replace($post, array('noteemail' => 'info@localhost')));
check(isset($errors['si_setup_hostemail']), 'Notifications email error did not identify the field');
foreach(array(1130 => 'DB_HOST_NOT_ALLOWED', 1045 => 'DB_LOGIN_DENIED', 1044 => 'DB_ACCESS_DENIED', 1049 => 'DB_NOT_FOUND', 2002 => 'DB_UNREACHABLE') as $number => $name){
    $error = new PDOException('Connection failed');
    $error->errorInfo = array('HY000', $number, "Host '10.0.0.27' is not allowed to connect");
    $result = invokeSetup('DatabaseConnectionError', $error, $post);
    check($result['code'] === $name, 'Database error was not classified: '.$number);
    check(strpos(json_encode($result), $post['existpass']) === false, 'Database error exposed a password');
}

check(invokeSetup('DatabaseDsn', $post, 'si_test') === 'mysql:host=db;port=3306;charset=utf8mb4;dbname=si_test', 'Invalid PDO DSN');
foreach (array('../core', '../../', '.', '..', '/tmp/a', 'a/b', 'a\\b', "a\0b", "a\nb", '<script>', 'a..b', '-a', 'a-') as $domain) {
    check(!$setup->TestDomain($domain), 'Unsafe domain accepted: '.json_encode($domain));
}
mkdir($root.'/domains/existing.test');
file_put_contents($root.'/domains/existing.test/keep.txt', 'keep');
check(!$setup->TestDomain('existing.test'), 'Existing domain accepted');
symlink($root.'/missing', $root.'/domains/link.test');
check(!$setup->TestDomain('link.test'), 'Dangling symlink accepted');
check($setup->TestDomain('new.test'), 'New domain rejected');
$template = $root.'/core/setup/domaintemplate';
mkdir($template.'/media/images', 0755, true);
file_put_contents($template.'/media/images/logo.png', 'starter-logo');
file_put_contents($template.'/media/images/favicon.png', 'starter-favicon');
mkdir($root.'/domains/starter.test/media/images', 0755, true);
$starterLogo = $root.'/domains/starter.test/media/images/logo.png';
copy($template.'/media/images/logo.png', $starterLogo);
touch($starterLogo, 946684800);
check($setup->TestDomain('starter.test'), 'Unchanged partial starter folder rejected');
invokeSetup('CreateDomainFolder', 'starter.test');
clearstatcache(true, $starterLogo);
check(file_get_contents($starterLogo) === 'starter-logo' && filemtime($starterLogo) === 946684800, 'Existing starter file was rewritten');
check(file_get_contents($root.'/domains/starter.test/media/images/favicon.png') === 'starter-favicon', 'Missing starter file was not filled');
invokeSetup('CreateDomainFolder', 'starter.test');
check($setup->TestDomain('starter.test'), 'Complete unchanged starter folder rejected on retry');
file_put_contents($starterLogo, 'custom-logo');
check(!$setup->TestDomain('starter.test'), 'Modified starter file was accepted');
$refused = false;
try { invokeSetup('CreateDomainFolder', 'starter.test'); } catch (RuntimeException $ex) { $refused = true; }
check($refused && file_get_contents($starterLogo) === 'custom-logo', 'Modified starter file was overwritten');
mkdir($root.'/domains/empty.test');
check($setup->TestDomain('empty.test'), 'Empty domain folder rejected');
mkdir($root.'/domains/linked-file.test/media/images', 0755, true);
symlink($template.'/media/images/logo.png', $root.'/domains/linked-file.test/media/images/logo.png');
check(!$setup->TestDomain('linked-file.test'), 'A symlink inside an existing starter folder was accepted');
mkdir($root.'/domains/extra.test/custom', 0755, true);
check(!$setup->TestDomain('extra.test'), 'An unknown existing directory was accepted');


foreach (array(
    'dbtype' => 'sqlite', 'dbserver' => 'db;dbname=other', 'dbport' => '3306;dbname=other',
    'existdb' => 'x`; DROP DATABASE x; --', 'adminpw' => 'short', 'adminemail' => 'invalid',
    'language' => 'en` TEXT; --', 'timezone' => 'invalid', 'domain' => '../core',
) as $key => $value) {
    $invalid = array_replace($post, array($key => $value));
    check(!invokeSetup('ValidateInstallInput', $invalid), 'Unsafe setup value accepted: '.$key);
}
ob_start();
$setup->SetupSuperIntuitive(array_replace($post, array('domain' => '../core')));
$rejected = json_decode(ob_get_clean(), true);
check($rejected['outcome'] === false, 'Unsafe install did not fail');
check(($rejected['code'] ?? null) === 'SETUP_VALIDATION_FAILED' && ($rejected['field'] ?? null) === 'si_setup_host', 'Invalid input did not identify the rejected field');
check(!file_exists($root.'/core/DbCreds.php'), 'Rejected install wrote credentials');
check(file_get_contents($root.'/domains/existing.test/keep.txt') === 'keep', 'Existing domain modified');

$injection = '"; file_put_contents('.var_export($root.'/executed', true).', "executed"); // \' \\ $variable';
$source = invokeSetup('BuildCredentials', $post, $injection, $injection, 'si_test');
file_put_contents($root.'/credentials.php', $source);
require $root.'/credentials.php';
$defaults = (new ReflectionClass('SuperIntuitive\\DbCreds'))->getDefaultProperties();
check($defaults['password'] === $injection && $defaults['username'] === $injection, 'Credentials changed during PHP encoding');
check(!file_exists($root.'/executed'), 'Credential input executed PHP');

invokeSetup('WriteInstallLock');
check(is_file($root.'/core/install.lock'), 'Installation lock was not persisted');
unlink($root.'/core/install.lock');
mkdir($root.'/core/install.lock');
$lockFailure = false;
try { @invokeSetup('WriteInstallLock'); } catch (RuntimeException $ex) { $lockFailure = true; }
check($lockFailure, 'Failed installation lock write was silently accepted');
rmdir($root.'/core/install.lock');

$sqlPost = array_replace($post, array('adminuser' => "admin');\nDROP TABLE users; -- __SI_DOMAIN_NAME__"));
$sql = "INSERT INTO users VALUES ('__SI_USER_NAME__', '__SI_USER_PASSWORD__', '_SI_NOWTIME_');\n";
$method = $reflection->getMethod('ReplaceTokens');
$method->invokeArgs($setup, array(&$sql, $sqlPost));
check(strpos($sql, 'DROP TABLE') === false && strpos($sql, '__SI_') === false, 'Installer SQL contains submitted SQL syntax');
check(strpos($sql, bin2hex($sqlPost['adminuser'])) !== false, 'Installer SQL did not preserve submitted text');
check(strpos($sql, "'CURRENT_TIMESTAMP()'") === false, 'Timestamp expression was quoted');

foreach (array('0x'.str_repeat('f', 32), str_repeat('A', 32)) as $id) {
    check(Tools::FixGuid($id) !== false, 'Valid GUID rejected');
}
foreach (array(str_repeat('z', 32), '0x'.str_repeat('1', 28).' OR ', array(), null, '') as $id) {
    check(Tools::FixGuid($id) === false, 'Invalid GUID accepted');
}

// Regression for the string "false" being treated as a grant.
$collection = new SuperIntuitive\AttributeCollection(new SuperIntuitive\Attribute('name', 'value'));
check($collection->Count === 1 && $collection->Get()[0]->Value === 'value', 'Namespaced entity attributes were discarded');
$_SESSION['SI']['domains']['localhost']['subdomains'][''] = array(
    'deployment' => 'live',
    'entities' => array('users' => array('instanceguid' => '0x'.str_repeat('1', 32), 'attributes' => array())),
    'user' => array('permissions' => array('0x'.str_repeat('1', 32) => array('read' => 'false', 'create' => 'false', 'write' => 'false', 'delete' => 'false'))),
);
check((new Entity('users'))->Retrieve() === null, 'String false allowed entity reads');
check((new Entity('users'))->Create() === null, 'String false allowed entity creation');
foreach(array(
    array('sname' => 'x`); DROP TABLE users; --'),
    array('sname' => 'safe', 'attributes' => array(array('name' => 'a', 'type' => 'TEXT); DROP TABLE users; --'))),
    array('sname' => 'safe', 'attributes' => array(array('name' => 'a', 'type' => 'VARCHAR', 'size' => '12); --'))),
) as $schema){
    check((new Entity())->NewEntity($schema) === false, 'Unsafe schema definition accepted');
}

// Reject malformed and expired remember-me cookies before connecting to a DB.
$login = new SuperIntuitive\Login();
$remembered = (new ReflectionClass($login))->getMethod('FindRememberedUser');
check($remembered->invoke($login, str_repeat('a', 64), time() - 31 * 86400) === null, 'Expired remember token accepted');
check($remembered->invoke($login, str_repeat('a', 64), time() + 100) === null, 'Future remember timestamp accepted');
check($remembered->invoke($login, 'invalid', time()) === null, 'Malformed remember token accepted');

// Options must survive a single JSON encode with objects and arrays kept distinct.
$jsonOptions = '{"empty":{},"list":[],"false":false,"null":null,"text":"O\'Reilly \\\\ path","number":0}';
check(Tools::EncodeOptions($jsonOptions) === $jsonOptions, 'Valid JSON options were re-encoded');
check(json_decode(Tools::EncodeOptions(json_decode($jsonOptions)))->empty instanceof stdClass, 'Empty object became an array');
foreach(array(null, false, array(), array(1), 'null', '[]', '{broken', json_encode($jsonOptions), (object)array('bad' => "\xB1")) as $invalidOptions){
    check(Tools::EncodeOptions($invalidOptions) === false, 'Invalid or double-encoded options accepted');
}
check(Tools::CleanDeployableField('rollback-options') === 'options', 'Rollback field prefix was not recognized');

mkdir($root.'/domains/localhost/media/images', 0755, true);
file_put_contents($root.'/domains/localhost/media/images/dev_sample.png', 'image');
$media = new SuperIntuitive\Media();
check($media->Promote(array('Url' => '/media/images/dev_sample.png', 'Deployment' => 'dev')), 'Valid media promotion failed');
check(file_get_contents($root.'/domains/localhost/media/images/test_sample.png') === 'image', 'Media promotion lost data');
check($media->Promote(array('Url' => '/media/images/test_sample.png', 'Deployment' => 'test')), 'Media promotion to Live failed');
check(file_get_contents($root.'/domains/localhost/media/images/sample.png') === 'image', 'Live media lost data');
check($media->Promote(array('Url' => '/media/images/sample.png', 'Deployment' => 'live')), 'Media rollback snapshot failed');
check(file_get_contents($root.'/domains/localhost/media/images/rollback_sample.png') === 'image', 'Media rollback snapshot lost data');
check(glob($root.'/domains/localhost/media/images/.si-promote-*') === array(), 'Temporary media promotion files were left behind');
$deployment = new SuperIntuitive\Deployment();
$_SESSION['SI']['domains']['localhost']['subdomains']['']['deployment'] = 'dev';
$urls = '<img src="/media/images/photo.png"><img src="/media/icons/dev_icon.png"><img src="https://cdn.example/media/images/photo.png">';
$rewritten = $deployment->DeployMediaPaths($urls);
check(strpos($rewritten, '/media/images/dev_photo.png') !== false, 'Dev media path was not selected');
check(strpos($rewritten, 'dev_dev_') === false, 'Existing deployment prefix was duplicated');
check(strpos($rewritten, 'https://cdn.example/media/images/photo.png') !== false, 'External media URL was rewritten');
check($deployment->DeployMediaPaths($rewritten) === $rewritten, 'Media rewriting is not idempotent');
$_SESSION['SI']['domains']['localhost']['subdomains']['']['deployment'] = 'live';
check($deployment->DeployMediaPaths($urls) === $urls, 'Live media path was rewritten');

foreach(array('/media/images/../../core/DbCreds.php', '/media/images/%2e%2e%2fcore.php', 'https://other.test/media/images/dev_sample.png', '/core/DbCreds.php') as $url){
    check($media->Promote(array('Url' => $url, 'Deployment' => 'dev')) === false, 'Unsafe media URL accepted');
}
check($media->Recycle(array('url' => '/media/images/dev_sample.png', 'mediaId' => '0 OR 1=1')) === false, 'Invalid media ID accepted');

session_destroy();
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
foreach ($iterator as $item) {
    $item->isDir() && !$item->isLink() ? rmdir($item->getPathname()) : unlink($item->getPathname());
}
rmdir($root);
echo "Security regression checks passed: $checks\n";
