<?php
namespace SuperIntuitive;
$query=$_GET;
require_once __DIR__.'/core/Tools.php';
Tools::ConfigureSessionCookieParams(); session_start(); Tools::DefineServer(); Tools::SendSecurityHeaders();
try {
    $m=PluginManager::current(); $id=PluginManifest::name($query['plugin'] ?? '');
    $file=PluginManifest::relative($query['file'] ?? '');
    if (!$m->enabled($id) || preg_match('~(?:^|/)(?:php|sipl|sql)(?:/|$)~i',$file)) throw new \RuntimeException('FORBIDDEN');
    $extension=strtolower(pathinfo($file,PATHINFO_EXTENSION));
    $types=['svg'=>'image/svg+xml','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','webp'=>'image/webp','ico'=>'image/x-icon','woff'=>'font/woff','woff2'=>'font/woff2','ttf'=>'font/ttf'];
    if (!isset($types[$extension])) throw new \RuntimeException('FORBIDDEN');
    $source=PluginManifest::file($m->package($id),$file);header("Content-Security-Policy: sandbox; default-src 'none'; style-src 'unsafe-inline'");header('Content-Type: '.$types[$extension]);header('Cache-Control: no-store');readfile($source);
} catch (\Throwable $e) { http_response_code(403); }
