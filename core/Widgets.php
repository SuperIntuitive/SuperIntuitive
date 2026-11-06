<?php
namespace SuperIntuitive;

/** Tenant/deployment overrides preserve widget edits across CMS updates. */
class Widgets {
    public function __construct(public $db, public string $root, public string $tenant, public string $level='live') {
        if (!preg_match('/^[a-f0-9]{32}$/D',$tenant) || !in_array($level,['dev','test','live'],true)) throw new \RuntimeException('INVALID_WIDGET_CONTEXT');
    }
    public static function current(): self {
        $db=(new Database())->DBC();
        $s=$db->prepare("SELECT LOWER(HEX(e.id)) FROM entities e JOIN domains d ON d.id=e.domain_id JOIN subdomains s ON s.id=e.subdomain_id AND s.domain_id=d.id WHERE e.name='blocks' AND d.name=:domain AND s.name=:subdomain AND e.status='active' AND d.status='active' AND s.status='active'");
        $s->execute(['domain'=>SI_DOMAIN_NAME,'subdomain'=>SI_SUBDOMAIN_NAME]);
        return new self($db,$_SERVER['DOCUMENT_ROOT'],(string)$s->fetchColumn(),Tools::GetCurrentDeployment());
    }
    private function query($sql,$p=[]): array { $s=$this->db->prepare($sql); $s->execute($p); return $s->fetchAll(\PDO::FETCH_ASSOC); }
    public function catalog(): array {
        $saved=[];
        if ($this->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='si_widget_sources'")) foreach ($this->query('SELECT name,source FROM si_widget_sources WHERE tenant=:tenant AND level=:level',['tenant'=>$this->tenant,'level'=>$this->level]) as $row) $saved[$row['name']]=json_decode($row['source'],true,64,JSON_THROW_ON_ERROR);
        $result=[];
        foreach (glob($this->root.'/scripts/widgets/*.js') as $file) {
            $name=basename($file,'.js'); $script=file_get_contents($file);
            if (!preg_match('/SI\.Widget\.([A-Za-z][A-Za-z0-9_]*)\s*=/',$script,$match)) continue;
            $entry=$saved[$name] ?? [];
            $result[$name]=['name'=>$name,'type'=>$match[1],'script'=>$entry['script'] ?? $script,'style'=>$entry['style'] ?? "[data-si-widget=\"".$match[1]."\"] {\n}\n",'design'=>$entry['design'] ?? [],'custom'=>array_keys($entry)];
        }
        foreach ($saved as $name=>$entry) if (!isset($result[$name]) && preg_match('/^[A-Z][A-Za-z0-9_]{0,63}$/D',$name) && isset($entry['script'])) $result[$name]=['name'=>$name,'type'=>$name,'script'=>$entry['script'],'style'=>$entry['style'] ?? '', 'design'=>$entry['design'] ?? [],'custom'=>array_keys($entry)];
        return $result;
    }
    public function dispatch(array $post): array {
        if (!Tools::UserHasRole('Admin') || $this->level!=='dev') throw new \RuntimeException('WIDGET_ADMIN_DEV_REQUIRED');
        if ($post['KEY']==='GetWidgetSources') return ['PARAMETER'=>$this->catalog()];
        $name=$post['name'] ?? ''; $catalog=$this->catalog();
        $create=$post['KEY']==='CreateWidget';
        if ($create) {
            if (!is_string($name) || !preg_match('/^[A-Z][A-Za-z0-9_]{0,63}$/D',$name) || isset($catalog[$name]) || in_array($name,array_column($catalog,'type'),true)) throw new \RuntimeException('INVALID_OR_EXISTING_WIDGET');
        } elseif (!is_string($name) || !isset($catalog[$name])) throw new \RuntimeException('INVALID_WIDGET');
        $this->db->exec("CREATE TABLE IF NOT EXISTS si_widget_sources (tenant CHAR(32) NOT NULL,name VARCHAR(64) NOT NULL,level VARCHAR(8) NOT NULL,source MEDIUMTEXT NOT NULL,PRIMARY KEY(tenant,name,level)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $p=['tenant'=>$this->tenant,'name'=>$name,'level'=>'dev'];
        $rows=$this->query('SELECT source FROM si_widget_sources WHERE tenant=:tenant AND name=:name AND level=:level',$p);
        $source=$rows ? json_decode($rows[0]['source'],true,64,JSON_THROW_ON_ERROR) : [];
        if ($create) {
            $source=['script'=>'SI.Widget.'.$name.' = SI.Tools.Widget.Derive('.json_encode($name).");\n",'style'=>"[data-si-widget=\"".$name."\"] {\n}\n",'design'=>[]];
        } elseif ($post['KEY']==='SaveWidgetSource') {
            $kind=$post['kind'] ?? ''; $value=$post['source'] ?? null;
            if (!in_array($kind,['script','style','design'],true) || ($kind==='design' ? !is_array($value) || !array_is_list($value) : !is_string($value))) throw new \RuntimeException('INVALID_WIDGET_SOURCE');
            if (strlen(json_encode($value,JSON_THROW_ON_ERROR))>524288) throw new \RuntimeException('WIDGET_SOURCE_TOO_LARGE');
            $source[$kind]=$value;
        } elseif ($post['KEY']==='PromoteWidgetSource') {
            $target=$post['target'] ?? '';
            if (!in_array($target,['test','live'],true)) throw new \RuntimeException('INVALID_WIDGET_DEPLOYMENT');
            if ($target==='live') {
                $p['level']='test'; $rows=$this->query('SELECT source FROM si_widget_sources WHERE tenant=:tenant AND name=:name AND level=:level',$p);
                $source=$rows ? json_decode($rows[0]['source'],true,64,JSON_THROW_ON_ERROR) : [];
            }
            $p['level']=$target;
        } else throw new \RuntimeException('UNKNOWN_WIDGET_ACTION');
        $targetCatalog=(new self($this->db,$this->root,$this->tenant,$p['level']))->catalog();
        $targetCatalog[$name]=array_replace($catalog[$name] ?? ['name'=>$name,'type'=>$name],$source);
        if (strlen(json_encode($targetCatalog,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR))>921600) throw new \RuntimeException('WIDGET_LIBRARY_TOO_LARGE');
        $p['source']=json_encode((object)$source,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        $sql='INSERT INTO si_widget_sources (tenant,name,level,source) VALUES (:tenant,:name,:level,:source)';
        if (!$create) {
            if ($post['KEY']==='SaveWidgetSource') {
                $p['path']='$.'.$kind; $p['value']=json_encode($value,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
                $sql.=" ON DUPLICATE KEY UPDATE source=JSON_SET(source,:path,JSON_EXTRACT(:value,'$'))";
            } else $sql.=' ON DUPLICATE KEY UPDATE source=VALUES(source)';
        }
        $this->db->prepare($sql)->execute($p);
        return ['PARAMETER'=>['saved'=>true,'name'=>$name,'level'=>$p['level'],'widget'=>$this->catalog()[$name]]];
    }
    public function asset(string $kind): string {
        if (!in_array($kind,['script','style'],true)) throw new \RuntimeException('INVALID_WIDGET_ASSET');
        $catalog=$this->catalog(); $source='';
        if ($kind==='style') $source=preg_replace('/^\xEF\xBB\xBF|<\?php[\s\S]*?\?>/','',file_get_contents($this->root.'/style/widgets.css'));
        foreach ($catalog as $entry) $source.="\n".$entry[$kind]."\n";
        if ($kind==='script') foreach ($catalog as $entry) $source.='SI.Tools.Widget.Register('.json_encode($entry['type']).','.json_encode($entry['design'],JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_THROW_ON_ERROR).");\n";
        if ($kind==='script') $source.="SI.Tools.Widget.Hydrate();\n";
        return $source;
    }
}
