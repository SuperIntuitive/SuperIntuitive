<?php
/** Plugin SDK entry and separate, session-free demo router. No CMS entry point is intercepted. */
final class SIEditorDemoPlugin {
    private array $config,$scopes=[],$settings=[],$copy=[],$localtexts=[]; private ?PDO $db=null; private string $package='',$language='en';
    public function __construct(array $config) {
        $this->config=$config;
        if(!is_string($config['root']??null)||!is_dir($config['root']))throw new RuntimeException('Set the CMS root in the private demo configuration.');
        require_once $this->root('core/Editor.php');
        foreach(['requestBurst'=>240,'requestsPerMinute'=>1800,'contentBurst'=>8,'contentPerMinute'=>60]as$key=>$default){
            $value=$config[$key]??$default;if(!is_int($value)||$value<1||$value>100000)throw new RuntimeException('Invalid demo request limit.');$this->config[$key]=$value;
        }
    }
    public static function configuration(array $value,string $domain='localhost',string $subdomain=''):array {
        $origin=$value['origin']??'';
        if(!is_string($origin)||!preg_match('~^https?://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$~D',$origin))throw new RuntimeException('INVALID_DEMO_ORIGIN');
        $url=parse_url($origin);$host=strtolower($url['host']);
        if(($url['scheme']!=='https'&&$host!=='demo.localhost')||in_array($host,[strtolower($domain),strtolower($subdomain.'.'.$domain),'localhost','127.0.0.1'],true))throw new RuntimeException('INVALID_DEMO_ORIGIN');
        $parents=$value['parents']??[];
        if(!is_array($parents)||!array_is_list($parents)||!count($parents)||count($parents)>8)throw new RuntimeException('INVALID_DEMO_PARENTS');
        foreach($parents as$parent){
            if(!is_string($parent)||!preg_match('~^https?://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$~D',$parent))throw new RuntimeException('INVALID_DEMO_PARENTS');
            $url=parse_url($parent);if($url['scheme']!=='https'&&!in_array(strtolower($url['host']),['localhost','127.0.0.1'],true))throw new RuntimeException('INVALID_DEMO_PARENTS');
        }
        $page=$value['page']??'';
        if(!is_string($page)||!preg_match('#^[A-Za-z0-9_~-]+(?:/[A-Za-z0-9_.~-]+)*$#D',$page))throw new RuntimeException('INVALID_DEMO_PAGE');
        foreach(explode('/',$page)as$segment)if(str_starts_with($segment,'.'))throw new RuntimeException('INVALID_DEMO_PAGE');
        return ['origin'=>$origin,'parents'=>$parents,'page'=>$page];
    }
    public static function action($storage,string $action,array $post):array {
        if($action==='configure'){
            try{$config=self::configuration($post['config']??[],defined('SI_DOMAIN_NAME')?SI_DOMAIN_NAME:'localhost',defined('SI_SUBDOMAIN_NAME')?SI_SUBDOMAIN_NAME:'');}
            catch(Throwable $error){return ['ERROR'=>'Choose a separate HTTPS demo origin, allowed parent origins and a published source page.','__httpStatus'=>400];}
            $storage->put('settings','config',$config);return ['configured'=>true];
        }
        $config=$storage->get('settings','config')['value']??[];
        if($action==='settings')return ['config'=>$config,'package'=>str_replace('\\','/',dirname(__DIR__))];
        if($action==='bootstrap')return ['origin'=>$config['origin']??''];
        return ['ERROR'=>'Unknown demo action.','__httpStatus'=>404];
    }
    private static function json($value):string{return json_encode($value,JSON_THROW_ON_ERROR|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_SLASHES);}
    private static function escape(string $value):string{return htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
    private function root(string $name):string{return rtrim($this->config['root'],'/\\').'/'.$name;}
    private function query(string $sql,array $parameters=[]):array{$s=$this->db->prepare($sql);$s->execute($parameters);return $s->fetchAll(PDO::FETCH_ASSOC);}
    private function load():void {
        $this->db=new PDO($this->config['dsn'],$this->config['dbUser'],$this->config['dbPassword'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
        foreach($this->query('SHOW GRANTS FOR CURRENT_USER()')as$row)foreach($row as$value)if(!preg_match('/^GRANT (USAGE|SELECT) ON /D',$value))throw new RuntimeException('DEMO_REQUIRES_SELECT_ONLY_DATABASE_USER');
        foreach($this->query("SELECT e.name,LOWER(HEX(e.id)) AS id FROM entities e JOIN domains d ON d.id=e.domain_id JOIN subdomains s ON s.id=e.subdomain_id AND s.domain_id=d.id WHERE d.name=:domain AND s.name=:subdomain AND d.status='active' AND s.status='active' AND e.status='active'",['domain'=>$this->config['domain'],'subdomain'=>$this->config['subdomain']??''])as$row)$this->scopes[$row['name']]=$row['id'];
        $tenant=$this->scopes['blocks']??'';
        $row=$this->query("SELECT package FROM si_plugin_installations WHERE tenant=:tenant AND plugin='editor-demo' AND installed=1 AND enabled=1",['tenant'=>$tenant])[0]??null;
        if(!$row)throw new RuntimeException('DEMO_PLUGIN_DISABLED');
        if(!preg_match('~^core/plugin-packages/editor-demo/[A-Za-z0-9_-]+$~D',$row['package']))throw new RuntimeException('INVALID_PLUGIN_PACKAGE');
        $this->package=$this->root($row['package']);
        $row=$this->query("SELECT value FROM si_plugin_data WHERE tenant=:tenant AND plugin='editor-demo' AND collection='settings' AND record_id='config'",['tenant'=>$tenant])[0]??null;
        if(!$row)throw new RuntimeException('CONFIGURE_DEMO_PLUGIN_FIRST');
        $this->settings=self::configuration(json_decode($row['value'],true,512,JSON_THROW_ON_ERROR),$this->config['domain'],$this->config['subdomain']??'');
    }
    private function limited(string $path):bool {
        // File-backed global counters run before PDO or any CMS/session bootstrap.
        $folder=$this->root('core/plugin-requests');
        if(!is_dir($folder)&&!mkdir($folder,0700,true)&&!is_dir($folder))throw new RuntimeException('Cannot create private request counter.');
        $file=$folder.'/editor-demo-'.hash('sha256',$this->config['domain'].':'.($this->config['subdomain']??'')).'.json';
        $handle=fopen($file,'c+');if(!$handle||!flock($handle,LOCK_EX))throw new RuntimeException('Cannot lock private request counter.');
        try{
            $source=stream_get_contents($handle);$buckets=$source===''?[]:json_decode($source,true,512,JSON_THROW_ON_ERROR);$now=time();
            foreach($buckets as$key=>$bucket)if($now-$bucket['start']>=$bucket['window'])unset($buckets[$key]);
            $rules=['burst'=>[$this->config['requestBurst'],10],'minute'=>[$this->config['requestsPerMinute'],60]];
            if(in_array($path,['/cms/sample/canvas','/editor.js'],true))$rules+=['contentBurst'=>[$this->config['contentBurst'],5],'contentMinute'=>[$this->config['contentPerMinute'],60]];
            $limited=false;foreach($rules as$key=>[$limit,$window]){$buckets[$key]??=['start'=>$now,'count'=>0,'window'=>$window];if(++$buckets[$key]['count']>$limit)$limited=true;}
            rewind($handle);ftruncate($handle,0);fwrite($handle,json_encode($buckets,JSON_THROW_ON_ERROR));fflush($handle);return $limited;
        }finally{flock($handle,LOCK_UN);fclose($handle);}
    }
    private function assets():array {
        $files=['/scripts/tools.js','/editor/editor.css','/editor/vendor/acorn.js','/style/widgets.css'];
        foreach(['editor/objects','scripts/widgets']as$folder)foreach(glob($this->root($folder).'/*.js')?:[]as$file)$files[]='/'.$folder.'/'.basename($file);
        foreach(['editor/media/icons','editor/media/fonts/Roboto','editor/media/fonts/Inconsolata','scripts/widgets/icons','scripts/widgets/media/icons']as$folder)foreach(glob($this->root($folder).'/*')?:[]as$file)if(is_file($file)&&in_array(strtolower(pathinfo($file,PATHINFO_EXTENSION)),['png','jpg','gif','ico','svg','ttf'],true))$files[]='/'.$folder.'/'.basename($file);
        return $files;
    }
    private function policy():string {
        $base=$this->settings['origin'];$scripts="'unsafe-inline' 'unsafe-eval' $base/editor.js $base/demo/prelude.js $base/demo/canvas.js";$styles="'unsafe-inline'";$images='data: blob:';$fonts='';
        foreach($this->assets()as$file){$url=$base.implode('/',array_map('rawurlencode',explode('/',$file)));$extension=pathinfo($file,PATHINFO_EXTENSION);if($extension==='js')$scripts.=' '.$url;elseif($extension==='css')$styles.=' '.$url;elseif($extension==='ttf')$fonts.=' '.$url;else $images.=' '.$url;}
        return "sandbox allow-scripts; default-src 'none'; script-src $scripts; style-src $styles; img-src $images; font-src$fonts; connect-src 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors ".implode(' ',$this->settings['parents']);
    }
    private function published():array {
        $page=$this->query("SELECT LOWER(HEX(id)) AS id,name,path,`live-options` AS options FROM pages WHERE entity_id=UNHEX(:scope) AND path=:path AND status='active' LIMIT 1",['scope'=>$this->scopes['pages'],'path'=>$this->settings['page']])[0]??null;
        if(!$page)throw new RuntimeException('PAGE_NOT_FOUND');
        $roles=$this->query("SELECT sr.name FROM relations r JOIN securityroles sr ON sr.id=r.child_id AND sr.entity_id=r.childentity_id WHERE r.parent_id=UNHEX(:page) AND r.parententity_id=UNHEX(:pages) AND r.entity_id=UNHEX(:relations) AND sr.entity_id=UNHEX(:roles) AND r.status='active' AND sr.status='active'",['page'=>$page['id'],'pages'=>$this->scopes['pages'],'relations'=>$this->scopes['relations'],'roles'=>$this->scopes['securityroles']]);
        if($roles&&!in_array('Guest',array_column($roles,'name'),true))throw new RuntimeException('FORBIDDEN');
        $registrations=$this->query("SELECT pp.plugin,pp.page_key,i.enabled,i.installed,i.package FROM si_plugin_pages pp JOIN si_plugin_installations i ON i.tenant=pp.tenant AND i.plugin=pp.plugin WHERE pp.tenant=:tenant AND pp.page_id=:page",['tenant'=>$this->scopes['blocks'],'page'=>$page['id']]);
        foreach($registrations as$r){
            if(!$r['enabled']||!$r['installed'])throw new RuntimeException('FORBIDDEN');
            $manifest=json_decode(file_get_contents($this->root($r['package'].'/install.json')),true,512,JSON_THROW_ON_ERROR);$allowed=false;
            foreach($manifest['pages']??[]as$p)if($p['key']===$r['page_key'])$allowed=!isset($p['permission'])||in_array('Guest',$manifest['permissions'][$p['permission']]??[],true);
            if(!$allowed)throw new RuntimeException('FORBIDDEN');
        }
        $page['blocks']=$this->query("SELECT LOWER(HEX(b.id)) AS id,b.name,b.`live-html` AS html,b.`live-style` AS style,b.`live-script` AS script,LOWER(HEX(r.id)) AS relationsId,r.`live-options` AS relationsOptions,r.`live-order` AS relationsOrder FROM relations r JOIN blocks b ON b.id=r.child_id AND b.entity_id=r.childentity_id WHERE r.parent_id=UNHEX(:page) AND r.parententity_id=UNHEX(:pages) AND r.entity_id=UNHEX(:relations) AND b.entity_id=UNHEX(:blocks) AND r.status='active' AND b.status='active' ORDER BY r.`live-order`,r.id",['page'=>$page['id'],'pages'=>$this->scopes['pages'],'relations'=>$this->scopes['relations'],'blocks'=>$this->scopes['blocks']]);
        return $page;
    }
    public static function language(string $header):string {
        return \SuperIntuitive\Editor::Language($header);
    }
    private function localize(array $page,string $header):array {
        $this->copy=[];$this->localtexts=[];
        $this->language=self::language($header);
        if($this->language!=='en'){
            $this->copy=json_decode(file_get_contents($this->package.'/locales/'.$this->language.'.json'),true,512,JSON_THROW_ON_ERROR);
            if(($this->copy['language']??null)!==$this->language||!is_array($this->copy['texts']??null))throw new RuntimeException('INVALID_DEMO_TRANSLATION');
            $this->copy['texts']=array_replace(\SuperIntuitive\Editor::Locale($header)['texts'],$this->copy['texts']);
            $preset=trim(file_get_contents($this->package.'/html/source.html'));
            foreach($page['blocks']as&$block)if(trim($block['html']??'')===$preset)$block['html']=$this->copy['sample'];
            unset($block);
        }
        $names=[];
        foreach($page['blocks']as$block){preg_match_all('/SI_MULTILANG_([A-Z]{20})/',$block['html']??'',$matches);$names=array_merge($names,$matches[1]);}
        $names=array_values(array_unique($names));
        if($names){
            $installed=array_column($this->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND COLUMN_NAME IN ('_en','_es','_zh','_tl')"),'COLUMN_NAME');
            $columns=implode(',',array_map(fn($column)=>"`$column`",$installed));
            $this->localtexts=$this->query("SELECT LOWER(HEX(id)) AS id,name,$columns FROM localtext WHERE entity_id=UNHEX(?) AND status='active' AND name IN (".implode(',',array_fill(0,count($names),'?')).') ORDER BY id',array_merge([$this->scopes['localtext']],$names));
        }
        return $page;
    }
    private function text(string $source):string {return $this->copy['texts'][$source]??$source;}
    private function content(string $source):string {
        $values=[];foreach($this->localtexts as$row){$value='';foreach([$this->language,'en']as$code)if(isset($row['_'.$code])&&$row['_'.$code]!==''){$value=$row['_'.$code];break;}$values['SI_MULTILANG_'.$row['name']]=$value;}
        return strtr($source,$values);
    }
    private function model(array $page):array {
        require_once $this->root('core/Tools.php');require_once $this->root('core/MiscData.php');$misc=new \SuperIntuitive\MiscData();
        $definitions=[];
        foreach($this->query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('pages','blocks','media','settings','localtext') ORDER BY TABLE_NAME,ORDINAL_POSITION")as$r){
            $name=$r['TABLE_NAME'];$column=$r['COLUMN_NAME'];$field=preg_replace('/^(dev|test|live|rollback)-/','',$column);
            $definitions[$name]??=['columns'=>[],'attributes'=>[],'deployable'=>'false','entityoptions'=>['EN'=>$name,'SN'=>$name]];
            $definitions[$name]['columns'][]=$column;$definitions[$name]['attributes'][$field]??=['type'=>'text','optional'=>$r['IS_NULLABLE'],'maxchars'=>$r['CHARACTER_MAXIMUM_LENGTH']];
            if($column!==$field){$definitions[$name]['deployable']='true';$definitions[$name]['attributes'][$field]['deployable']='true';}
            if($column==='id')$definitions[$name]['attributes'][$field]['type']='primary';
        }
        $blocks=[];foreach($page['blocks']as$block){$key=$block['name'];$n=2;while(isset($blocks[$key]))$key=$block['name'].$n++;$block['id']='0x'.$block['id'];$block['relationsId']='0x'.$block['relationsId'];$block['options']=$block['relationsOptions'];$block['order']=$block['relationsOrder'];$block['ittr']='';$block['modifiedon']='';$blocks[$key]=$block;}
        $pages=[['id'=>'0x'.$page['id'],'name'=>$page['name'],'path'=>$page['path'],'page'=>$page['path'],'domain'=>$this->config['domain'],'subdomain'=>$this->config['subdomain']??'','domainName'=>$this->config['domain'],'subdomainName'=>$this->config['subdomain']??'','pageName'=>$page['name'],'pageId'=>$page['id']]];
        $colors="<option value=''>".self::escape($this->text('Color Names'))."</option>";foreach($misc->ColorNames as$color)$colors.="<option value='".self::escape($color)."'>".self::escape($color).'</option>';
        $languages="<option value=''></option>";foreach($misc->Languages as$code=>$name)$languages.="<option value='".self::escape($code)."'>".self::escape($name).'</option>';
        $session=['domains'=>[$this->config['domain']=>['subdomains'=>[($this->config['subdomain']??'')=>['deployment'=>'dev','user'=>['loggedin'=>false,'name'=>'guest','roles'=>['Guest'],'preferences'=>(object)[]],'entities'=>$definitions]]]]];
        $values=['$blockObjects'=>(object)$blocks,'$pageObjects'=>$pages,'$entityDefinitions'=>$definitions,'$recordCount'=>count($definitions),'$mediaObjects'=>[],'$rolesdata'=>[],'$relationsjson'=>[],'$settings2'=>[],'$localtexts'=>[],'$myLangs'=>['en'],'$currentPlugins'=>(object)[],'$downloadedplugs'=>[],'$PasswordStrength'=>'^[\\s\\S]{10,72}$','$helplinks'=>['mdn','w3'],'$quickmenuitems'=>$misc->UserDefaultQuickmenu,'$allmimetypes'=>$misc->MimeTypes,'$mimes'=>['Images'=>['image/png','image/jpeg'],'Audio'=>['audio/mpeg'],'Video'=>['video/mp4'],'Docs'=>['application/pdf'],'Data'=>['application/json'],'Fonts'=>['font/woff2']],'json_encode($coloroptions)'=>$colors,'json_encode($langoptions)'=>$languages,'json_encode($supportedLanguages)'=>"<option value='en'>English</option>",'json_encode($usertable)'=>"<table id='si_editor_users_table'><thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead><tbody></tbody></table>",'json_encode(SI_LANGS)'=>'en','SI_DOMAIN_NAME'=>$this->config['domain'],'SI_SUBDOMAIN_NAME'=>$this->config['subdomain']??'','$sessionPageData'=>$session];
        $values['json_encode($defaultLanguages)']=['en'];
        $values['$myLangs']=array_values(array_unique([$this->language,'en']));
        $values['json_encode(SI_LANGS)']=$this->language;
        $values['$localtexts']=$this->localtexts;
        $supported='';foreach(['en','es','zh','tl']as$code)if(in_array('_'.$code,$definitions['localtext']['columns'],true))$supported.="<option value='$code'>".self::escape($this->text($misc->Languages[$code])).'</option>';
        $values['json_encode($supportedLanguages)']=$supported;
        $table="<table id='si_editor_users_table'><thead><tr>";foreach(['Name','Email','Status']as$label)$table.='<th>'.self::escape($this->text($label)).'</th>';
        $values['json_encode($usertable)']=$table.'</tr></thead><tbody></tbody></table>';
        return [$values,['pages'=>$pages,'blocks'=>array_values($blocks),'settings'=>[],'media'=>[],'localtext'=>$this->localtexts]];
    }
    private function editorScript(array $page):string {
        [$values,$records]=$this->model($page);$lookups=[];
        foreach(['html_elements','html_attributes','css_properties','js_methods','php_methods','sql_methods']as$name)$lookups[$name]=json_decode(file_get_contents($this->root('editor/media/data/'.$name.'.json')),true,512,JSON_THROW_ON_ERROR);
        $source=file_get_contents($this->root('editor/editor.js'));$start=strpos($source,'?>');$end=strrpos($source,'<?php');if($start===false||$end<=$start)throw new RuntimeException('EDITOR_TEMPLATE_CHANGED');
        $source=substr($source,$start+2,$end-$start-2);
        $source=preg_replace('~\{\s*<\?(?:=\s*\$dataage|php\s+echo\s+\$dataage\s*;?)\s*\?>\s*\}~','{}',$source);
        $source=preg_replace('~'.chr(96).'<\?php\s+echo\s+Tools::GetPhpInfo\(\)\s*\?>'.chr(96).'~',self::json('<p>'.self::escape($this->text('Sample mode: your changes stay in this browser. Saving, uploads and publishing are disabled.')).'</p>'),$source);
        foreach(['SI_DOMAIN_NAME','SI_SUBDOMAIN_NAME']as$key)$source=str_replace('"<'.'?= '.$key.' ?>"',self::json($values[$key]),$source);
        // The CMS stores QuickMenu as a trusted JavaScript literal, not JSON.
        // Preserve that one public slot's existing format; never evaluate editor PHP.
        $source=preg_replace_callback('~<\?=\s*(.*?)\s*\?>~s',function($m)use($values){if(!array_key_exists($m[1],$values))throw new RuntimeException('EDITOR_TEMPLATE_CHANGED: '.$m[1]);return $m[1]==='$quickmenuitems'?$values[$m[1]]:self::json($values[$m[1]]);},$source);
        if(str_contains($source,'<?php')||str_contains($source,'<?='))throw new RuntimeException('EDITOR_TEMPLATE_CHANGED');
        $widgets=[];
        foreach(glob($this->root('scripts/widgets').'/*.js')as$file){$script=file_get_contents($file);if(preg_match('/SI\.Widget\.([A-Za-z][A-Za-z0-9_]*)\s*=/',$script,$match)){$name=basename($file,'.js');$widgets[$name]=['name'=>$name,'type'=>$match[1],'script'=>$script,'style'=>"[data-si-widget=\"".$match[1]."\"] {\n}\n",'design'=>[],'custom'=>[]];}}
        $result='SI.EditorText='.self::json((object)($this->copy['texts']??[])).";\nSI.Sample=".self::json(['lookups'=>$lookups,'records'=>$records]).";\n".str_replace('SI.Editor.Run();','',$source)."\nSI.Editor.Data.WidgetSources=".self::json($widgets).";\n";
        foreach($widgets as$widget)$result.='SI.Tools.Widget.Register('.self::json($widget['type']).",[]);\n";
        $result.="\nSI.Sample.runPage=function(){\n";
        foreach($page['blocks']as$block)$result.=($block['script']??'')."\n";
        return $result."\n};\n";
    }
    private function html(array $page):string {
        $data=[];foreach($page['blocks']as$block){$options=json_decode($block['relationsOptions']??'{}',true)??[];$data[$block['name']]=['Settings'=>$options['settings']??(object)[],'Widgets'=>$options['widgets']??(object)[]];}
        $result="<!doctype html><html lang='".$this->language."'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>".self::escape($this->text('Editor demo'))."</title><script src='/demo/prelude.js'></script><script>window.SI={Page:{Settings:{},Blocks:".self::json((object)$data)."},CSRF:{Token:''},User:{Name:'guest',Roles:['Guest'],Preferences:{}},Widget:{},Widgets:{}}</script><style id='si_page_style'>";
        foreach($page['blocks']as$block)$result.='/*-!'.str_replace('*/','',$block['name'])."!-*/\n".str_ireplace('</style','<\\/style',$block['style']??'')."\n";
        $result.="</style><link rel='stylesheet' href='/style/widgets.css'><link rel='stylesheet' href='/editor/editor.css'><script defer src='/scripts/tools.js'></script>";
        foreach($this->assets()as$file)if(str_starts_with($file,'/scripts/widgets/')&&str_ends_with($file,'.js'))$result.="<script defer src='".self::escape($file)."'></script>";
        $result.="<script defer src='/editor.js'></script>";
        foreach($this->assets()as$file)if(str_starts_with($file,'/editor/objects/')&&str_ends_with($file,'.js'))$result.="<script defer src='".self::escape($file)."'></script>";
        $result.="<script defer src='/demo/canvas.js'></script></head><body data-guid='0x".$page['id']."'><i id='si_colorscheme'></i>";
        foreach($page['blocks']as$block){$options=json_decode($block['relationsOptions']??'{}',true)??[];$tag=$options['tag']??'div';if(!in_array($tag,['div','section','article','header','footer','nav','main','aside','span'],true))throw new RuntimeException('INVALID_BLOCK_TAG');$styles='';foreach($options['style']??[]as$name=>$value)if(preg_match('/^[A-Za-z-]+$/D',$name))$styles.=$name.':'.$value.';';$id=preg_replace('/[^A-Za-z0-9_]/','_',$block['name']);if($id===''||ctype_digit($id[0]))$id='id'.$id;$source=$block['html']??'';$classes='si-block';$binding='';if(preg_match('/^SI_MULTILANG_([A-Z]{20})$/D',trim($source),$match)){$classes.=' si-multilingual si-multilingual-'.$match[1];$binding=" data-si_ml_token='".$match[1]."'";}$result.="<$tag id='si_block_$id' class='$classes'$binding data-order='".$block['relationsOrder']."' style='".self::escape($styles)."'>".$this->content($source)."</$tag>";}
        if($this->language!=='en')$result.="<small id='si_sample_ai_notice' style='display:block;margin:24px;text-align:center;opacity:.7;font:11px Arial,sans-serif'>".self::escape($this->text('Translated by AI')).'</small>';
        return $result.'</body></html>';
    }
    public function response(string $method,string $uri,string $host,string $acceptLanguage='en'):array {
        $path=rawurldecode(parse_url($uri,PHP_URL_PATH)?:'/');$query=parse_url($uri,PHP_URL_QUERY)??'';
        $reply=fn($status,$body,$type='text/plain; charset=utf-8')=>[$status,$body,['Content-Type'=>$type,'Cache-Control'=>'no-store','X-Content-Type-Options'=>'nosniff','Referrer-Policy'=>'no-referrer','Permissions-Policy'=>'camera=(), microphone=(), geolocation=(), payment=(), usb=()','Origin-Agent-Cluster'=>'?1']];
        if($this->limited($path)){[$status,$body,$headers]=$reply(429,'Demo busy. Please try again shortly.');$headers['Retry-After']='60';return [$status,$body,$headers];}
        if(!in_array($method,['GET','HEAD'],true))return $reply(403,'Demo changes are temporary. Writes are disabled.');
        if($query!==''&&!($path==='/cms/sample/canvas'&&preg_match('/^reset=[0-9]{1,16}$/D',$query)))return $reply(403,'Unavailable in the demo.');
        if(!in_array($path,array_merge(['/cms/sample/canvas','/editor.js','/demo/prelude.js','/demo/canvas.js'],$this->assets()),true))return $reply(403,'Unavailable in the demo.');
        try{
            $this->load();if(strtolower($host)!==strtolower(explode('://',$this->settings['origin'],2)[1]))return $reply(400,'Invalid demo host.');
            if(in_array($path,['/cms/sample/canvas','/editor.js'],true)){
                $page=$this->localize($this->published(),$acceptLanguage);
                [$status,$body,$headers]=$path==='/editor.js'?$reply(200,$this->editorScript($page),'application/javascript; charset=utf-8'):$reply(200,$this->html($page),'text/html; charset=utf-8');
                $headers['Content-Language']=$this->language;
                if($path==='/cms/sample/canvas')$headers['Content-Security-Policy']=$this->policy();
                return [$status,$body,$headers];
            }
            if(in_array($path,['/demo/prelude.js','/demo/canvas.js'],true))return $reply(200,file_get_contents($this->package.'/js/canvas/'.($path==='/demo/prelude.js'?'prelude':'canvas').'.js'),'application/javascript; charset=utf-8');
            $file=$this->root(ltrim($path,'/'));$source=file_get_contents($file);$extension=strtolower(pathinfo($file,PATHINFO_EXTENSION));
            if($path==='/style/widgets.css')$source=preg_replace('~^<\?php.*?\?>~s','',ltrim($source,"\xEF\xBB\xBF"));
            if($path==='/scripts/tools.js')$source=str_replace('document.createComment("<?php ','document.createComment("\\x3c?php ',$source);
            if(in_array($extension,['js','css'],true)&&(str_contains($source,'<?php')||str_contains($source,'<?=')))throw new RuntimeException('DYNAMIC_ASSET_NOT_PORTED');
            $types=['js'=>'application/javascript','css'=>'text/css','png'=>'image/png','jpg'=>'image/jpeg','gif'=>'image/gif','ico'=>'image/x-icon','svg'=>'image/svg+xml','ttf'=>'font/ttf'];
            [$status,$body,$headers]=$reply(200,$source,$types[$extension]);if($extension==='ttf')$headers['Access-Control-Allow-Origin']='*';return [$status,$body,$headers];
        }catch(Throwable $error){error_log('Editor demo: '.$error->getMessage());return $reply(403,'The published demo is unavailable. Check plugin configuration, SELECT-only credentials and Guest page access.');}
    }
}
if(PHP_SAPI==='cli-server'){
    try{$file=getenv('SI_DEMO_CONFIG');if(!$file)throw new RuntimeException('Set SI_DEMO_CONFIG to a private service configuration path.');$plugin=new SIEditorDemoPlugin(json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR));[$status,$body,$headers]=$plugin->response($_SERVER['REQUEST_METHOD'],$_SERVER['REQUEST_URI'],$_SERVER['HTTP_HOST']??'',$_SERVER['HTTP_ACCEPT_LANGUAGE']??'en');http_response_code($status);foreach($headers as$name=>$value)header($name.': '.$value);if($_SERVER['REQUEST_METHOD']!=='HEAD')echo $body;}
    catch(Throwable $error){error_log('Editor demo: '.$error->getMessage());http_response_code(503);header('Content-Type: text/plain');echo 'The demo service needs operator configuration.';}
    exit;
}
return static fn($storage,string $action,array $post):array=>SIEditorDemoPlugin::action($storage,$action,$post);
