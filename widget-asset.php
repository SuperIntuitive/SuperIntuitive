<?php
namespace SuperIntuitive;
$query=$_GET;
require_once __DIR__.'/core/Tools.php';
Tools::ConfigureSessionCookieParams(); session_start(); Tools::DefineServer(); Tools::SendSecurityHeaders();
header('Cache-Control: private, no-store');
try {
    if (!in_array($_SERVER['REQUEST_METHOD'],['GET','HEAD'],true)) { http_response_code(405); exit; }
    $kind=$query['kind'] ?? '';
    if (!is_string($kind) || !in_array($kind,['script','style'],true)) { http_response_code(400); exit; }
    $source=Widgets::current()->asset($kind);
    header('Content-Type: '.($kind==='script'?'application/javascript':'text/css').'; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD']==='GET') echo $source;
} catch (\Throwable $error) { http_response_code(403); }
