<?php
// PHP-native packaging and upgrade regressions; uses synthetic state only.
require_once __DIR__.'/../packaging/Package.php';
$tool=new Package(); $checks=0;
function check($value,$message) { global $checks; if (!$value) throw new RuntimeException($message); $checks++; echo 'PASS '.$message.PHP_EOL; }
function rejected($operation,$message) { try { $operation(); } catch (Throwable $error) { check(true,$message); return; } check(false,$message); }
$temporary=sys_get_temp_dir().'/si-php-package-'.bin2hex(random_bytes(8)); Package::directory($temporary);
try {
    $root=$temporary.'/site'; Package::directory($root);
    $records=['core/Plugins.php'=>'new entity','core/Tools.php'=>'autoload','core/plugin-schema.sql'=>'shared schema','packaging/Package.php'=>'native tool','editor/media/data/js_methods.js'=>'editor data','core/DbCreds.php'=>'empty credentials','domains/customer/media/logo.png'=>'new media','plugins/installed/custom/php/main.php'=>'new plugin','.htaccess'=>'new config'];
    foreach ($records as $name=>$content) Package::write($root.'/'.$name,'preserve state');
    Package::write($root.'/core_sipl/config.local.json','preserve native config');
    $release=$temporary.'/release.zip';
    $archive=function($values,$overrides=[]) use($release) {
        $zip=new ZipArchive(); $zip->open($release,ZipArchive::CREATE|ZipArchive::OVERWRITE); $files=[];
        foreach ($values as $name=>$data) { $zip->addFromString('SuperIntuitive/'.$name,$data); $files[]=['path'=>$name,'bytes'=>strlen($data),'sha256'=>$overrides[$name] ?? hash('sha256',$data)]; }
        $zip->addFromString('SuperIntuitive/PACKAGE.json',json_encode(['format'=>1,'backend'=>'php','files'=>$files])); $zip->close();
    };
    $archive($records); $plan=$tool->upgrade($release,$root,false);
    check($plan['files']===['core/Plugins.php','core/Tools.php','core/plugin-schema.sql','packaging/Package.php','editor/media/data/js_methods.js'],'upgrade preview selects code only');
    check(file_get_contents($root.'/core/Plugins.php')==='preserve state','preview leaves target unchanged');
    $result=$tool->upgrade($release,$root,true);
    check($result['applied'] && file_get_contents($root.'/core/Plugins.php')==='new entity','PHP upgrade replaces code');
    foreach (array_keys($records) as $name) if (Package::protected($name)) check(file_get_contents($root.'/'.$name)==='preserve state','preserves '.$name);
    check(file_get_contents($root.'/core_sipl/config.local.json')==='preserve native config','PHP upgrade preserves native configuration');
    check(file_get_contents($result['backup'].'/core/Plugins.php')==='preserve state','upgrade keeps recovery copy');
    foreach (['../escape','core/../escape','core/back\\slash','C:/file','CON.txt'] as $bad) rejected(fn()=>Package::relative($bad),'rejects unsafe path '.$bad);
    $archive($records,['core/Plugins.php'=>str_repeat('0',64)]);
    rejected(fn()=>$tool->upgrade($release,$root,true),'corrupt ZIP rejected before target writes');
    check(file_get_contents($root.'/core/Plugins.php')==='new entity','failed upgrade preserves code');
    // The default-theme tool must reproduce the existing sources without
    // changing this checkout's installer or involving another interpreter.
    $themeRoot=$temporary.'/theme'; Package::directory($themeRoot.'/core/setup/default-theme');
    foreach (glob($tool->root.'/core/setup/default-theme/*') as $file) copy($file,$themeRoot.'/core/setup/default-theme/'.basename($file));
    copy($tool->root.'/core/setup/super_intuitive_install.sql',$themeRoot.'/core/setup/super_intuitive_install.sql');
    $before=hash_file('sha256',$themeRoot.'/core/setup/super_intuitive_install.sql');
    (new Package($themeRoot))->theme();
    check(hash_file('sha256',$themeRoot.'/core/setup/super_intuitive_install.sql')===$before,'PHP theme compiler preserves existing generated SQL');
    check(is_file($themeRoot.'/default-page-preview.html'),'PHP theme compiler generates preview');
    $zip=$tool->build($temporary.'/output'); $meta=$tool->verify($zip);
    check($meta['backend']==='php','PHP release builds without SIPL or Python');
    $plugin=$temporary.'/contact.zip'; $tool->contact($plugin);
    $z=new ZipArchive(); $z->open($plugin);
    check($z->getFromName('info.conf')===file_get_contents($tool->root.'/plugin-packages/contact/info.conf'),'Contact ZIP preserves info.conf');
    check($z->locateName('php/contact.php')!==false && $z->locateName('sipl/contact.sipl')!==false,'Contact ZIP contains both compatible handlers'); $z->close();
    echo 'PHP packaging and upgrade checks passed: '.$checks.PHP_EOL;
} finally { Package::remove($temporary); }
