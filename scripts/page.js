<?php 
namespace SuperIntuitive;
header("Content-Type: application/javascript; charset: UTF-8");

require_once dirname(__DIR__).DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.'Tools.php';
Tools::ConfigureSessionCookieParams();
session_start();
Tools::DefineServer();
Tools::SendSecurityHeaders();

$finishedScript = 'if(!SI){var SI = {}};';


if (!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['blocks'])) {
    // Tools:: Log("in page.js after the condidtion");
    Tools::Autoload('subroot');
    $db = new Database();
    $blocks = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['blocks'];
    $guids = "";
    // Tools::Log($blocks, true);
    foreach($blocks as $block){
        $guids.= $block['id'].',';
           
    }
    $guids = rtrim($guids, ',');
    $libs = $db->GetBlockScriptsByIds($guids);
    foreach($libs as $name=>$type){           
        if (!empty($type['js'])) {
            $finishedScript.= "\n/*__BLOCK=$name */ \n";
            $finishedScript.= $type['js'];
            $finishedScript.= "\n/*__ENDBLOCK=$name */ \n";
        }             
    }
}

$finishedScript .= "\n(function () {\n    function bindLoginForm() {\n        var form = document.getElementById('form_login');\n        if (!form || form.dataset.siLoginBound === 'true') {\n            return;\n        }\n\n        var button = form.querySelector('button');\n        if (button && !button.getAttribute('type')) {\n            button.setAttribute('type', 'button');\n        }\n\n        form.dataset.siLoginBound = 'true';\n        form.addEventListener('submit', function (event) {\n            event.preventDefault();\n            if (window.SI && SI.Login && typeof SI.Login.Attempt === 'function') {\n                SI.Login.Attempt();\n            }\n        });\n    }\n\n    if (document.readyState === 'loading') {\n        document.addEventListener('DOMContentLoaded', bindLoginForm);\n    } else {\n        bindLoginForm();\n    }\n})();";

echo $finishedScript;

?> 

