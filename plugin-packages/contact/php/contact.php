<?php
/** Adapted from superintutitive.com/core_sipl/src/Contact.sipl. */
return static function ($storage, $action, $post) {
    $error=static function ($message,$code,$status=400,$field='') {
        $result=['ERROR'=>$message,'code'=>$code,'__httpStatus'=>$status];
        if ($field!=='') $result['field']=$field;
        return $result;
    };
    $invalid=static fn($field,$message)=>$error($message,'CONTACT_VALIDATION_FAILED',400,$field);
    $receipt=static fn($id)=>['CONTACTSENT'=>['id'=>'0x'.$id],'submitted'=>true,'id'=>$id];
    $counts=static function () use ($storage) {
        $total=$storage->count('messages');
        return ['total'=>$total,'unread'=>$total-$storage->count('messages',0,'read',true)];
    };
    $id=static function ($value) {
        if (!is_string($value) || !preg_match('/^(?:0x)?[A-Fa-f0-9]{32}$/D',$value)) return null;
        return strtolower(preg_replace('/^0x/','',$value));
    };
    if ($action==='inbox') {
        $offset=$post['offset'] ?? 0;
        if (!is_int($offset) || $offset<0 || $offset>100000) return $invalid('','Choose a valid inbox offset.');
        return $storage->atomic('messages',static function () use ($storage,$offset,$counts) {
            $rows=$storage->page('messages',$offset,21);$hasMore=count($rows)>20;$rows=array_slice($rows,0,20);$messages=[];
            foreach ($rows as $row) {
                $value=$row['value'];
                $message=['id'=>'0x'.$row['id'],'name'=>$value['name'],'email'=>$value['email'],'topic'=>$value['topic'] ?? 'General','message'=>$value['message'],'state'=>!empty($value['read'])?'read':'unread','createdon'=>str_replace(' ','T',$row['created_at']).'Z'];
                if (isset($value['subject'])) $message['subject']=$value['subject'];
                $messages[]=$message;
            }
            $data=['messages'=>$messages,'hasMore'=>$hasMore,'offset'=>$offset]+$counts();
            return ['CONTACTMESSAGES'=>$data,'messages'=>$rows,'hasMore'=>$hasMore,'offset'=>$offset,'total'=>$data['total'],'unread'=>$data['unread']];
        });
    }
    if ($action==='update' || $action==='delete') {
        $record=$id($post['id'] ?? null);
        if ($record===null) return $invalid('','Choose a valid message.');
        if ($action==='update' && !in_array($post['state'] ?? null,['read','unread'],true)) return $invalid('','Choose read or unread.');
        return $storage->atomic('messages',static function () use ($storage,$action,$post,$record,$counts,$error) {
            $row=$storage->get('messages',$record);
            if (!$row) return $error('Message not found.','RECORD_NOT_FOUND',404);
            if ($action==='delete') return ['deleted'=>$storage->delete('messages',$record)];
            $value=$row['value'];$value['read']=$post['state']==='read';$storage->put('messages',$record,$value);
            return ['CONTACTMESSAGEUPDATED'=>['id'=>'0x'.$record,'state'=>$post['state']]+$counts()];
        });
    }
    if ($action!=='submit') return $error('Unknown contact action.','UNKNOWN_PLUGIN_ACTION',404);
    $values=[];
    foreach (['name'=>100,'email'=>254,'message'=>5000] as $field=>$maximum) {
        $value=$post[$field] ?? null;
        if (!is_string($value)) return $invalid($field,'Please complete this field.');
        $clean=trim($value);
        if ($clean==='' || strlen($clean)>$maximum || strpos($value,"\0")!==false) return $invalid($field,'Use between 1 and '.$maximum.' characters.');
        $values[$field]=$clean;
    }
    $values['email']=strtolower($values['email']);
    if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/D',$values['email'])) return $invalid('email','Enter a valid email address.');
    // Previously edited v1 forms keep working; the new form always supplies topic/token.
    $legacy=!array_key_exists('topic',$post) && is_string($post['subject'] ?? null) && trim($post['subject'])!=='';
    $topic=$post['topic'] ?? ($legacy?'General':null);
    if (!in_array($topic,['General','SuperIntuitive CMS','Gameatude','SIPL'],true)) return $invalid('topic','Choose one of the listed topics.');
    $values['topic']=$topic;
    if ($legacy) { if (strlen($post['subject'])>200) return $invalid('subject','Use up to 200 characters.'); $values['subject']=$post['subject']; }
    if (($post['website'] ?? '')!=='') return $invalid('','This submission could not be accepted.');
    $token=$post['submission'] ?? ($legacy?bin2hex(random_bytes(16)):null);
    if (!is_string($token) || !preg_match('/^[A-Fa-f0-9]{32}$/D',$token)) return $invalid('','Refresh the form before submitting it.');
    $token=strtolower($token);
    return $storage->atomic('messages',static function () use ($storage,$values,$token,$error,$receipt) {
        $existing=$storage->get('messages',$token);
        if ($existing) {
            foreach (['name','email','topic','message'] as $field) if (($existing['value'][$field] ?? null)!==$values[$field]) return $error('The earlier submission was already received. Submit again to send your changed message.','CONTACT_SUBMISSION_CONFLICT',409);
            return $receipt($token);
        }
        if ($storage->count('messages',300)>=20 || $storage->count('messages',300,'email',$values['email'])>=3) return $error('Too many messages. Please wait five minutes before trying again.','RATE_LIMITED',429);
        $storage->put('messages',$token,$values+['read'=>false,'submission'=>$token]);
        return $receipt($token);
    });
};
