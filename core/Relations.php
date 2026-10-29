<?php
namespace SuperIntuitive;
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
Tools::Autoload();

class Relations {

	public function __construct(){

	}
	
	public function __destruct(){

	}

	public function New($post){
        if(!is_array($post)){
            return false;
        }
        $db = new Database();
        return $db->NewRelatedEntity($post['EntityName'] ?? null, $post['EntityId'] ?? null,
            $post['RelatedEntityName'] ?? null, $post['RelatedEntityId'] ?? null,
            $post['Order'] ?? 0, $post['Options'] ?? null);
    }

	//this will delete all relations where the parent or the child id is supplyied. In the end there will be no realtions eather way. 
	public function DeleteAllRelations($guid){
		


		$sql = "DELETE `relations` WHERE  `parent_id` = $guid OR `child_id` = $guid;";
		$db = new Database();
		$db->Execute($sql);
	}


} 