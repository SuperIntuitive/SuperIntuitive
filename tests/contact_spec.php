<?php
namespace SuperIntuitive;
require_once __DIR__.'/../core/Tools.php';
$c=json_decode(file_get_contents($argv[1]),true);
$db=new \PDO($c['phpDsn'],$c['dbUser'],$c['dbPassword'],[\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION,\PDO::ATTR_EMULATE_PREPARES=>false,\PDO::MYSQL_ATTR_SSL_CA=>'/etc/ssl/certs/ca-certificates.crt',\PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT=>false]);
$handler=require __DIR__.'/../plugin-packages/contact/php/contact.php';
$storage=new PluginStorage($db,$c['contactSpecTenant'],'contact');
$checks=0;
function check($condition,$message) { global $checks;if (!$condition) throw new \RuntimeException($message);$checks++;echo "PASS PHP contact $message\n"; }
function rejects($operation,$message) { try { $operation(); } catch (\Throwable $e) { check(true,$message);return; }check(false,$message); }
function post($token=null,$email='spec@example.test') { return ['name'=>'Test Sender','email'=>$email,'topic'=>'SIPL','message'=>"First line\nSecond line 日本語 🚀",'website'=>'','submission'=>$token ?? bin2hex(random_bytes(16))]; }
$call=static fn($action,$post=[])=>$handler($storage,$action,$post);
$mode=$argv[2] ?? '';
if ($mode==='browser-seed') {
    $tenant=$db->query("SELECT LOWER(HEX(id)) FROM entities WHERE name='blocks' LIMIT 1")->fetchColumn();
    $seed=new PluginStorage($db,$tenant,'contact');
    for ($i=0;$i<25;$i++) {
        $id=bin2hex(random_bytes(16));$seed->put('messages',$id,['name'=>'Older inbox fixture '.$i,'email'=>'fixture@example.test','topic'=>'General','message'=>'Synthetic browser fixture','read'=>false]);
        $s=$db->prepare("UPDATE si_plugin_data SET created_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 MINUTE) WHERE tenant=:tenant AND plugin='contact' AND collection='messages' AND record_id=:id");$s->execute(['tenant'=>$tenant,'id'=>$id]);
    }
    echo "PASS browser inbox fixtures created\n";exit;
}
if ($mode==='race') {
    $race=new PluginStorage($db,$c['contactRaceTenant'],'contact');
    echo json_encode($handler($race,'submit',post($c['contactRaceToken'],'race@example.test')));exit;
}
if ($mode==='after-sipl') {
    check($storage->get('messages',$c['contactSpecToken'])['value']['read']===true,'reads read-state saved by SIPL');
    check($storage->count('messages',0,'email','native-spec@example.test')===1,'reads SIPL-created message');
    $race=new PluginStorage($db,$c['contactRaceTenant'],'contact');
    check($race->count('messages')===1,'simultaneous PHP/SIPL submission stored once');
    check($race->get('messages',$c['contactRaceToken'])!==null,'both runtimes share token identity');
    echo "PHP cross-backend contact checks passed: $checks\n";exit;
}
$input=post(strtoupper($c['contactSpecToken']),'  SPEC@EXAMPLE.TEST  ');$input['name']='  Test Sender  ';$input['message']='  '.$input['message'].'  ';
$first=$call('submit',$input);check(isset($first['CONTACTSENT']),'accepts website form fields');
check($first['CONTACTSENT']['id']==='0x'.$c['contactSpecToken'],'normalizes uppercase submission tokens');
$second=$call('submit',$input);check($second['CONTACTSENT']===$first['CONTACTSENT'] && $storage->count('messages')===1,'retries do not duplicate messages');
$row=$storage->get('messages',$c['contactSpecToken']);check($row['value']['email']==='spec@example.test' && $row['value']['name']==='Test Sender','normalizes email and trimmed fields');
$changed=$input;$changed['message']='Changed message';$conflict=$call('submit',$changed);check($conflict['code']==='CONTACT_SUBMISSION_CONFLICT' && $conflict['__httpStatus']===409,'rejects changed payload for received token');
foreach (['name'=>'','email'=>"a@example.test\r\nBcc: b@example.test",'topic'=>'unknown','message'=>['wrong type'],'website'=>'spam','submission'=>'invalid'] as $field=>$bad) {
    $invalid=post();$invalid[$field]=$bad;$result=$call('submit',$invalid);check($result['code']==='CONTACT_VALIDATION_FAILED' && $result['__httpStatus']===400,'rejects invalid '.$field);
}
foreach (['name'=>100,'email'=>254,'message'=>5000] as $field=>$maximum) { $invalid=post();$invalid[$field]=str_repeat('x',$maximum+1);check($call('submit',$invalid)['code']==='CONTACT_VALIDATION_FAILED','rejects over-limit '.$field); }
$boundary=post(null,str_repeat('e',64).'@'.str_repeat('a',63).'.'.str_repeat('b',63).'.'.str_repeat('c',56).'.test');$boundary['name']=str_repeat('n',100);$boundary['message']=str_repeat('m',5000);check(isset($call('submit',$boundary)['CONTACTSENT']),'accepts exact source limits');
$nul=post();$nul['name']="Name\0";check($call('submit',$nul)['code']==='CONTACT_VALIDATION_FAILED','rejects trailing NUL consistently');
$missing=post();unset($missing['submission']);check($call('submit',$missing)['code']==='CONTACT_VALIDATION_FAILED','new forms require submission token');
$quota=new PluginStorage($db,bin2hex(random_bytes(16)),'contact');$quotaCall=static fn($value)=>$handler($quota,'submit',$value);
$last=null;for ($i=0;$i<3;$i++) { $last=post(null,'LIMIT@example.test');check(isset($quotaCall($last)['CONTACTSENT']),'accepts new per-email message '.($i+1)); }
check($quotaCall(post(null,'limit@example.test'))['__httpStatus']===429,'fourth normalized-email submission is limited');
check(isset($quotaCall($last)['CONTACTSENT']) && $quota->count('messages')===3,'retry still succeeds at quota');
$global=new PluginStorage($db,bin2hex(random_bytes(16)),'contact');
for ($i=0;$i<20;$i++) { $result=$handler($global,'submit',post(null,'sender'.$i.'@example.test'));if (!isset($result['CONTACTSENT'])) throw new \RuntimeException('Unexpected tenant rate limit'); }
check($global->count('messages')===20 && $handler($global,'submit',post(null,'last@example.test'))['__httpStatus']===429,'twentieth tenant message succeeds; twenty-first fails');
$pageStorage=new PluginStorage($db,bin2hex(random_bytes(16)),'contact');
for ($i=0;$i<41;$i++) $pageStorage->put('messages',sprintf('%032x',$i+1),['name'=>'Page fixture','email'=>'page@example.test','topic'=>'General','message'=>'<img src=x onerror=alert(1)>','read'=>$i===0]);
$pageCall=static fn($payload)=>$handler($pageStorage,'inbox',$payload)['CONTACTMESSAGES'];
$page1=$pageCall([]);$page2=$pageCall(['offset'=>20]);$page3=$pageCall(['offset'=>40]);
check(count($page1['messages'])===20 && $page1['hasMore'] && count($page2['messages'])===20 && count($page3['messages'])===1 && !$page3['hasMore'],'paginates twenty messages with Load more');
check($page1['total']===41 && $page1['unread']===40,'counts unread messages across all pages');
check(!array_intersect(array_column($page1['messages'],'id'),array_column($page2['messages'],'id')),'page ordering has no duplicate records');
foreach ([-1,100001,'0',false] as $offset) check($handler($pageStorage,'inbox',['offset'=>$offset])['code']==='CONTACT_VALIDATION_FAILED','rejects invalid offset '.json_encode($offset));
$id=$first['CONTACTSENT']['id'];$marked=$call('update',['id'=>$id,'state'=>'read']);check($marked['CONTACTMESSAGEUPDATED']['state']==='read','Admin can mark read');
check($call('update',['id'=>$id,'state'=>'read'])['CONTACTMESSAGEUPDATED']['state']==='read','repeated read update remains successful');
check($call('update',['id'=>$id,'state'=>'unread'])['CONTACTMESSAGEUPDATED']['state']==='unread','Admin can mark unread');
check($call('update',['id'=>$id,'state'=>'other'])['code']==='CONTACT_VALIDATION_FAILED','invalid read state rejected');
$foreign=new PluginStorage($db,bin2hex(random_bytes(16)),'contact');check($handler($foreign,'update',['id'=>$id,'state'=>'read'])['__httpStatus']===404 && $foreign->count('messages')===0,'other tenant cannot read or update a message');
$legacyId=bin2hex(random_bytes(16));$storage->put('messages',$legacyId,['name'=>'Legacy','email'=>'legacy@example.test','subject'=>'Preserved v1 subject','message'=>'Preserved v1 body','read'=>false]);
$legacy=array_values(array_filter($call('inbox')['CONTACTMESSAGES']['messages'],static fn($value)=>$value['id']==='0x'.$legacyId))[0];check($legacy['subject']==='Preserved v1 subject' && $legacy['state']==='unread','preserves v1 stored subjects and read state');
$before=$storage->count('messages');rejects(function () use($storage) { $storage->atomic('messages',function () use($storage) { $storage->put('messages',str_repeat('f',32),['temporary'=>true]);throw new \RuntimeException('Rollback fixture'); }); },'transaction failure is reported');check($storage->count('messages')===$before,'failed SDK transaction rolls back writes');
rejects(fn()=>$storage->count('messages',0,'read" OR 1=1 --',true),'JSON field injection rejected');
echo "PHP contact specification checks passed: $checks\n";
