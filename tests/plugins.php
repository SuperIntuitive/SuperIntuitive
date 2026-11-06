<?php
namespace SuperIntuitive;
require_once __DIR__.'/../core/Tools.php';
$config=json_decode(file_get_contents($argv[1]),true);$db=new \PDO($config['phpDsn'],$config['dbUser'],$config['dbPassword'],[\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION, \PDO::MYSQL_ATTR_SSL_CA=>"/etc/ssl/certs/ca-certificates.crt", \PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT=>false]);
$root=dirname(__DIR__);$scopes=$db->query("SELECT name,LOWER(HEX(id)) FROM entities")->fetchAll(\PDO::FETCH_KEY_PAIR);
$m=new PluginManager($db,$root,$scopes,['Admin']);$guest=new PluginManager($db,$root,$scopes,[]);$checks=0;
function check($v,$msg) { global $checks;if (!$v) throw new \RuntimeException($msg);$checks++;echo "PASS $msg\n"; }
function rejects($fn,$msg) { try { $fn(); } catch (\Throwable $e) { check(true,$msg.': '.$e->getMessage());return; } check(false,$msg); }
if (($argv[2] ?? '')==='after-sipl') {
    check(count($m->action('contact','inbox',[])['messages'])===2,'PHP reads native SIPL submission');
    check(count($m->query('SELECT * FROM si_plugin_migrations WHERE plugin=\'contact\''))===1,'One shared migration record across backends');
    check($m->query("SELECT `dev-html` AS html FROM blocks WHERE name='contact-form'")[0]['html']==='CMS edited form','Native upgrade preserves CMS edits');
    $m->lifecycle('contact','UninstallPlugin');check(!$m->enabled('contact'),'Uninstall disables plugin');
    check(count((new PluginStorage($db,$m->tenant,'contact'))->list('messages'))===2,'Uninstall preserves data');
    $m->install('contact',$root.'/plugins/downloaded/contact.zip');check(count($m->action('contact','inbox',[])['messages'])===2,'Reinstall recovers inbox');
    echo "PHP checks passed: $checks\n";exit;
}
check($m->enabled('legacy'),'Legacy installed plugin remains enabled');
check(PluginManifest::read($root.'/plugins/installed/legacy','legacy')['version']==='0.0.0','info.conf-only package remains valid');
$m->install('contact',$root.'/plugins/downloaded/contact.zip');
check(!empty($m->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")[0]['Value']),'PHP test connector uses TLS');
check($m->enabled('contact'),'Contact installation enables compatible package');
check(count($m->navigation())===1 && $m->navigation()[0]['path']==='/admin/contact','Manifest registers Admin navigation');
check(!$guest->pageAccess('admin/contact') && $m->pageAccess('admin/contact'),'Inbox page enforces Admin permission');
check($guest->pageAccess('contact-form'),'Public form page registered');
$data=['name'=>"O'Reilly 日本語",'email'=>'sender@example.test','subject'=>'<script>alert(1)</script>','message'=>"Unicode 🚀 '); DROP TABLE users; --"];
check($guest->action('contact','submit',$data)['submitted'],'Guest contact submission executes PHP handler');
$messages=$m->action('contact','inbox',[])['messages'];check(count($messages)===1 && $messages[0]['value']['message']===$data['message'],'Storage preserves Unicode and injection text');
rejects(fn()=>$guest->action('contact','inbox',[]),'Guest cannot read inbox');
rejects(fn()=>$guest->action('contact','delete',['id'=>$messages[0]['id']]),'Guest cannot delete inbox');
check(isset($guest->action('contact','submit',array_merge($data,['email'=>'invalid']))['ERROR']),'Validation rejects invalid email');
$other=new PluginStorage($db,str_repeat('f',32),'contact');check($other->list('messages')===[],'Other tenant cannot read inbox');
check(!$other->delete('messages',$messages[0]['id']),'Other tenant cannot delete message');
check((new PluginStorage($db,$m->tenant,'other'))->list('messages')===[],'Other plugin cannot read inbox');
$block=$m->query("SELECT * FROM blocks WHERE name='contact-form'")[0];
foreach (['dev','test','live','rollback'] as $level) foreach (['html','style','script'] as $field) check(strlen($block[$level.'-'.$field])>0,"SQL source column $level-$field installed");
$m->execute("UPDATE blocks SET `dev-html`='CMS edited form' WHERE name='contact-form'");
$m->lifecycle('contact','DisablePlugin');rejects(fn()=>$guest->action('contact','submit',$data),'Disabled actions blocked');check(!$guest->pageAccess('contact-form'),'Disabled page blocked');
$m->lifecycle('contact','EnablePlugin');check($m->enabled('contact'),'Reenable preserves installation');
$before=$m->state('contact')['package'];
rejects(fn()=>$m->install('contact',$root.'/plugins/downloaded/contact-drift.zip'),'Applied migration checksum changes rejected');
check($m->state('contact')['package']===$before && $m->enabled('contact'),'Failed update preserves active package');
rejects(fn()=>PluginManifest::relative('../core/DbCreds.php'),'Traversal rejected');
rejects(fn()=>$m->install('traversal',$root.'/plugins/downloaded/traversal.zip'),'Archive traversal rejected');
rejects(fn()=>$m->install('symlink',$root.'/plugins/downloaded/symlink.zip'),'Archive symlink rejected');
rejects(fn()=>$m->install('siplonly',$root.'/plugins/downloaded/siplonly.zip'),'PHP rejects required SIPL-only handler');
rejects(fn()=>$m->install('invalidphp',$root.'/plugins/downloaded/invalidphp.zip'),'PHP rejects invalid handler callable');
rejects(fn()=>$m->install('missingphp',$root.'/plugins/downloaded/missingphp.zip'),'PHP rejects missing declared handler');
$m->install('frontend',$root.'/plugins/downloaded/frontend.zip');check($m->enabled('frontend'),'Frontend-only plugin remains valid');
rejects(fn()=>$m->install('broken',$root.'/plugins/downloaded/broken.zip'),'Failed migration rejected');
check(!$m->state('broken'),'Failed install not published');
rejects(fn()=>$m->install('broken',$root.'/plugins/downloaded/broken.zip'),'Interrupted migration requires repair');
echo "PHP checks passed: $checks\n";
