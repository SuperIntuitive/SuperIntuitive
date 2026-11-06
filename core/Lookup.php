<?php
namespace SuperIntuitive;

/** Bounded record lookup; shares the API's authentication, CSRF and entity grants. */
class Lookup {
    public static function Search(array $post): array {
        if (!Tools::UserHasRole('Admin')) throw new \RuntimeException('FORBIDDEN');
        $site=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
        $name=$post['Entity']['Name'] ?? '';
        if (!is_string($name) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,63}$/D',$name)) throw new \RuntimeException('INVALID_ENTITY');
        $scope=Tools::FixGuid($site['entities'][$name]['instanceguid'] ?? null);
        if (!$scope || !filter_var($site['user']['permissions'][strtolower($scope)]['read'] ?? false,FILTER_VALIDATE_BOOLEAN)) throw new \RuntimeException('FORBIDDEN');
        $db=(new Database())->DBC();
        $query=$db->prepare('SELECT COLUMN_NAME,DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:table');
        $query->execute(['table'=>$name]); $schema=$query->fetchAll(\PDO::FETCH_KEY_PAIR);
        $level=Tools::GetCurrentDeployment();
        $resolve=function($field) use($schema,$level) {
            if (!is_string($field) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,63}$/D',$field) || preg_match('/password|secret|token|credential|salt|hash|script|html|style|rules|preferences|options/i',$field)) throw new \RuntimeException('INVALID_LOOKUP_COLUMN');
            $resolved=isset($schema[$level.'-'.$field]) ? $level.'-'.$field : $field;
            if (!isset($schema[$resolved])) throw new \RuntimeException('UNKNOWN_COLUMN');
            return $resolved;
        };
        $default=isset($schema['name'])||isset($schema[$level.'-name']) ? 'name' : (isset($schema['path']) ? 'path' : 'id');
        $display=$post['DisplayColumn'] ?? $default; $displaySql=$resolve($display);
        $columns=$post['Columns'] ?? array_values(array_unique([$display,...array_values(array_intersect(['email','path','status'],array_keys($schema)))]));
        if (is_string($columns)) $columns=array_map('trim',explode(',',$columns));
        if (!is_array($columns) || !array_is_list($columns) || count($columns)>6) throw new \RuntimeException('INVALID_LOOKUP_COLUMNS');
        $columns=array_values(array_unique([$display,...$columns]));
        $selected=['LOWER(HEX(id)) AS id'];
        foreach($columns as$field) { $actual=$resolve($field); if($field!=='id') $selected[]='`'.$actual.'` AS `'.$field.'`'; }
        $search=$post['SearchColumns'] ?? array_values(array_unique([$display,...array_values(array_intersect(['email','path'],array_keys($schema)))]));
        if (is_string($search)) $search=array_map('trim',explode(',',$search));
        if (!is_array($search)||!array_is_list($search)||count($search)>4) throw new \RuntimeException('INVALID_LOOKUP_COLUMNS');
        $term=$post['Search'] ?? ''; $page=$post['Page'] ?? 0; $limit=$post['PageSize'] ?? 10;
        if(!is_string($term)||strlen($term)>512||!is_int($page)||$page<0||$page>400||!is_int($limit)||$limit<1||$limit>50)throw new \RuntimeException('INVALID_LOOKUP_QUERY');
        $where=['entity_id=UNHEX(:scope)']; $params=['scope'=>substr($scope,2)];
        $view=$post['View'] ?? 'active'; if(!in_array($view,['active','all'],true))throw new \RuntimeException('INVALID_LOOKUP_VIEW');
        if(isset($schema['status'])&&$view==='active')$where[]="status='active'";
        if(isset($post['Ids'])) {
            if(!is_array($post['Ids'])||!array_is_list($post['Ids'])||count($post['Ids'])>10)throw new \RuntimeException('INVALID_LOOKUP_IDS');
            $ids=[];foreach($post['Ids']as$index=>$id){$id=Tools::FixGuid($id);if(!$id)throw new \RuntimeException('INVALID_LOOKUP_ID');$key='id'.$index;$ids[]='UNHEX(:'.$key.')';$params[$key]=substr($id,2);}
            $where[]=$ids?'id IN ('.implode(',',$ids).')':'1=0';
        }
        $filters=$post['Filters'] ?? []; if(!is_array($filters)||count($filters)>8)throw new \RuntimeException('INVALID_LOOKUP_FILTER');
        foreach($filters as$field=>$value){
            if(in_array($field,['entity_id','id','createdby','modifiedby'],true))throw new \RuntimeException('INVALID_LOOKUP_FILTER');
            $actual=$resolve($field);$key='f'.count($params);
            if($value===null){$where[]='`'.$actual.'` IS NULL';continue;}
            if(!is_scalar($value))throw new \RuntimeException('INVALID_LOOKUP_FILTER');
            $expression=':'.$key;
            if($schema[$actual]==='binary'){$guid=Tools::FixGuid($value);if(!$guid)throw new \RuntimeException('INVALID_LOOKUP_FILTER');$value=substr($guid,2);$expression='UNHEX('.$expression.')';}
            $where[]='`'.$actual.'`='.$expression;$params[$key]=$value;
        }
        if($term!==''){
            $pattern=strtr($term,['!'=>'!!','%'=>'!%','_'=>'!_','*'=>'%']);if(!str_contains($term,'*'))$pattern.='%';
            $matches=[];foreach($search as$index=>$field){$actual=$resolve($field);$key='search'.$index;$matches[]='`'.$actual."` LIKE :".$key." ESCAPE '!'";$params[$key]=$pattern;}
            if(!$matches)throw new \RuntimeException('INVALID_LOOKUP_COLUMNS');$where[]='('.implode(' OR ',$matches).')';
        }
        $sort=$resolve($post['SortColumn'] ?? $display);$direction=$post['SortDirection'] ?? 'asc';if(!in_array($direction,['asc','desc'],true))throw new \RuntimeException('INVALID_LOOKUP_SORT');
        $query=$db->prepare('SELECT '.implode(',',$selected).' FROM `'.$name.'` WHERE '.implode(' AND ',$where).' ORDER BY `'.$sort.'` '.$direction.',id ASC LIMIT '.($limit+1).' OFFSET '.($page*$limit));
        $query->execute($params);$rows=$query->fetchAll(\PDO::FETCH_ASSOC);$more=count($rows)>$limit;$rows=array_slice($rows,0,$limit);$records=[];
        foreach($rows as$row)$records[]=['id'=>'0x'.$row['id'],'entityType'=>$name,'name'=>(string)($row[$display] ?? $row['id']),'fields'=>$row];
        return ['Records'=>$records,'Columns'=>$columns,'Entity'=>$name,'More'=>$more,'Page'=>$page,'CanCreate'=>filter_var($site['user']['permissions'][strtolower($scope)]['create'] ?? false,FILTER_VALIDATE_BOOLEAN)];
    }
}
