<?php
namespace SuperIntuitive;
Tools::Autoload();
class Media {
    private function ResolveMediaUrl($url){
        if(!is_string($url)){
            return false;
        }
        $parts = parse_url($url);
        if($parts === false || isset($parts['user']) || isset($parts['pass'])
            || (isset($parts['scheme']) && !in_array(strtolower($parts['scheme']), array('http', 'https'), true))){
            return false;
        }
        $host = SI_SUBDOMAIN_NAME === '' ? SI_DOMAIN_NAME : SI_SUBDOMAIN_NAME.'.'.SI_DOMAIN_NAME;
        if(isset($parts['host']) && strtolower($parts['host']) !== $host){
            return false;
        }
        $path = rawurldecode($parts['path'] ?? '');
        if(!preg_match('~^/media/(images|audio|videos|video|data|fonts|icons|documents)/([A-Za-z0-9_ .-]+)$~D', $path, $match)
            || $match[2] === '.' || $match[2] === '..'){
            return false;
        }
        $root = realpath($_SERVER['DOCUMENT_ROOT'].'/domains/'.SI_DOMAIN_NAME.'/media');
        $directory = $root === false ? false : realpath($root.'/'.$match[1]);
        if($directory === false || strpos($directory, $root.DIRECTORY_SEPARATOR) !== 0){
            return false;
        }
        $file = $directory.'/'.$match[2];
        if(is_link($file)){
            return false;
        }
        return array('directory' => $directory.'/', 'name' => $match[2], 'category' => $match[1]);
    }

    public function Promote($post){
        $return =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'];
        $fail = function($message) use (&$return){ $return['ERROR'] = $message; return false; };
        if(!is_array($post)) return $fail('The media deployment request is invalid.');
        $media = $this->ResolveMediaUrl($post['Url'] ?? null);
        $deployment = $post['Deployment'] ?? null;
        if($media === false || !in_array($deployment, array('dev', 'test', 'live'), true)){
            return $fail('The media URL or deployment is invalid.');
        }
        if($deployment === 'live'){
            if(preg_match('/^(?:dev|test|rollback)_/', $media['name'])) return $fail('Select the Live media file to save a rollback copy.');
            $name = 'rollback_'.$media['name'];
        }else{
            if(!Tools::StartsWith($media['name'], $deployment.'_')) return $fail('The media file does not match its source deployment.');
            $name = ($deployment === 'dev' ? 'test_' : '').substr($media['name'], strlen($deployment) + 1);
        }
        $source = $media['directory'].$media['name'];
        $target = $media['directory'].$name;
        if(!is_file($source) || is_link($target)) return $fail('The source media file is unavailable.');
        // Publish with an atomic rename so readers never receive a partially copied file.
        $temporary = tempnam($media['directory'], '.si-promote-');
        if($temporary === false) return $fail('Could not prepare the media file for deployment.');
        try{
            if(!copy($source, $temporary) || !chmod($temporary, fileperms($source) & 0777) || !rename($temporary, $target)){
                return $fail('The media file could not be promoted.');
            }
        }finally{
            if(is_file($temporary)) unlink($temporary);
        }
        if($deployment === 'live'){
            $return['PROMOTED'] = 'Live media saved to rollback.';
        }else{
            $category = $media['category'];
            $deployTo = $deployment === 'dev' ? 'Test' : 'Live';
            $url = '/media/'.$category.'/'.$name;
            $return['FILEPROMOTED'] = 'si_media_'.ucfirst($category).'_'.$deployTo.'Preview|'.$category.'|'.$url.'?v='.bin2hex(random_bytes(8));
        }
        return true;
    }

    public function Recycle($post){
        $media = $this->ResolveMediaUrl($post['url'] ?? null);
        $id = Tools::FixGuid($post['mediaId'] ?? null);
        if($media === false || $id === false){
            return false;
        }
        $filename = preg_replace('/^(?:dev_|test_|rollback_)/', '', $media['name']);
        $recycle = $media['directory'].'recycle/';
        if(is_link(rtrim($recycle, '/')) || (!is_dir($recycle) && !mkdir($recycle, 0755))){
            return false;
        }
        foreach(array('dev_', 'test_', 'rollback_', '') as $prefix){
            $source = $media['directory'].$prefix.$filename;
            $target = $recycle.$prefix.$filename;
            if(is_link($source) || is_link($target)){
                return false;
            }
            if(is_file($source) && !rename($source, $target)){
                return false;
            }
        }
        $db = new Database();
        $entityId = Tools::FixGuid($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['media']['instanceguid'] ?? null);
        if($entityId === false){
            return false;
        }
        $query = $db->DBC()->prepare('DELETE FROM `media` WHERE `id` = UNHEX(:id) AND `entity_id` = UNHEX(:scope)');
        return $query->execute(array(':id' => substr($id, 2), ':scope' => substr($entityId, 2)));
    }
}
