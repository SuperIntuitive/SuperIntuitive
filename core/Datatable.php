<?php
Tools::Autoload();

class DataSet{
	public $Name = null;
	public $Tables = array();
	function __construct($dataSetName = null){
		if($dataSetName!= null)
		$this->Name = $dataSetName;
	}
	
	public function Add($dataTable){
		$this->Tables[] = $dataTable;
		$dataTable->DataSet = $this;
	}
}
class DataTable{
	public $DataSet = null;
	public $Name = null;
	public $Columns = array();
	public $Rows = array();
	public $RowCount = 0;
	public $ColumnCount = 0;
	public $Numbered = false;
	public $Class = null;
	public $Selectable = false;
	
	function __construct($dataTableName = null){
		if($dataTableName!= null)
		$this->Name = $dataTableName;
	}	
	
	public function AddColumn($dataColumn){
		if (!in_array ( $dataColumn , $this->Columns )){
			$dataColumn->DataTable = $this;
			$this->Columns[] = $dataColumn;
			$this->ColumnCount++;

			$rc = $this->RowCount;
			if($rc > 0){
				$rows = $this->Rows;
				foreach($rows as $row){		
					$row->Columns[] = $dataColumn;
					if($dataColumn->Default != null){
						$row->Cells[] = $dataColumn->Default;
					}
				}
			}

		}
	}	
	public function AddRow($dataRow){
		$dataRow->DataTable = $this;
		$this->Rows[] = $dataRow;
		$this->RowCount++;	
	}	
	function GetColumn($name){
		for($i=0; $i < sizeof($this->Columns); $i++){
			if($this->Columns[$i]->Name == $name){
				return $i;
			}
		}
		return null;
	}
	public function GetRow(int $index){
		if($this->RowCount < $index){
			return $this->Rows[$index];
		}
	}
	public function GetCell($column, $rownum){
		$rownum--; //Trim the header factor off.
		if($rownum>-1){
			$c;
			switch(gettype($column)){
				case 'string': $c = $this->GetColumn($column);break;
				case 'integer':$c = $column;break;
				case 'DataColumn': $c = $column->Ordinal;break;
			}	
			if($c < $this->ColumnCount && $rownum < $this->RowCount){
				return $this->Rows[$rownum]->Cells[$c];	
			}
		}
	}
	public function LoadCsv($path){
		if(!strpos($path, DOCROOT)){
			$path = DOCROOT.$path;
		}
		$name = basename($path, ".csv");
		$handle = fopen($path, "r");
		if ($handle) {
			$rownum = 0;
			while (($line = fgets($handle)) !== false) {
				if($rownum==0){
					$colnum = 0;
					$cols = explode(',',$line);
					foreach($cols as $v){
						$dataColumn = new DataColumn($v);
						$dataColumn->DataTable = $this;
						$dataColumn->Ordinal = $colnum ;
						$this->Columns[] = $dataColumn;
						$colnum++;
					}
					$this->ColumnCount = $colnum;					
					$rownum++;
				}
				else
				{
					$dataRow = new DataRow();
					$dataRow->Cells = str_getcsv($line, ",",'"');
					$dataRow->Columns = $this->Columns;
					$dataRow->RowNumber = $rownum-1;
					$this->AddRow($dataRow);
					$rownum++;
				}
				// process the line read.	
			}
			$this->RowCount = $rownum-1;
			fclose($handle);
			
		} else {
			// error opening the file.
		} 
	}
	public function LoadArray($tablearray){
		//it is assumed that a table array is a numeric array of associative arrays.
		//first go through the first row to get all the column names then add the rows;
		if(is_array($tablearray)){
			if(count($tablearray) >0){
			    //Add the columns
				$cols = array_keys($tablearray[0]);
				$colnum = 0;
				foreach($cols as $col){
					$dataColumn = new DataColumn($col);
					$dataColumn->DataTable = $this;
					$dataColumn->Ordinal = $colnum ;
					$this->Columns[] = $dataColumn;
					$colnum++;
				}
				$rownum = 1;
				foreach($tablearray as $row){
					$dataRow = new DataRow();
					$dataRow->Cells = array_values($row);
					$dataRow->Columns = $this->Columns;
					$dataRow->RowNumber = $rownum;
					$this->AddRow($dataRow);
					$rownum++;
				}
			}
		}
	}
	public function Draw($options = null){
		$default = array(
			"ID"=>null,
			"Class"=>null,
			"Echo"=>false,
			"Numbered"=>$this->Numbered,
			"Borders"=> true,
			"JSON"=>1,
		);
		$options = Tools::SetDefaults($options, $default);
	    //	print_r($options);
		//Deal with Borders
		if($options['JSON']){
				$borders = "";
			if($options['Borders']){
				$borders = "style='background-color:rgba(255, 255, 255, 0.5); color:black; border:1px solid black; border-collapse: collapse;'";
			}
			//Add any class that is provided
			$class = "";
			if($options['Class']){
			   $class = "class='".$options['Class']."'";
			}
			$id = "";
			if($options["ID"]){
				$id = "id='".$options['ID']."'";
			}else{
				$options["ID"] = Tools::Random();
			}
		
			$table = "<table $id $borders $class  ><tr>";
			if($options['Numbered']){
				$table.="<th>#</th>";
			}
			if($options['Borders']){
				$borders = "style='border:1px solid black'";
			}
			foreach($this->Columns as $v){
				if($v->Name != null)
				$table.="<th $borders >$v->Name</th>";
			}
			$table.="<tr>";
			$i = 1;
			foreach($this->Rows as $r){
				$data = $r->Cells;
				$table.= "<tr class='si-row-$i'>";
				if($options['Numbered']){
					$table.="<td style='border:1px solid black'>$i</td>";
				}
				$ord = 1;
				foreach($data as $k=>$v){
					$tblid = $options["ID"]."_row_".$i."_col_".$ord;

					$table.= "<td id='$tblid' class='si-row-$i si-col-$ord' style='border:1px solid black'>$v</td>";				
					$ord++;
				}
				$table.= "</tr>";
				$i++;
			}
			$table .= "</table>";
			if($options['Echo']){
				echo $table;
			}else{
				return $table;
			}

		}
		else{
			$class = "";
			if($options['Class']){
			   $class = "class:'".$options['Class']."',";
			}
			$id = "";
			if($options["ID"]){
				$id = "id:'".$options['ID']."',";
			}

			$select = "Ele('table',{
				$id
				$class
				style:{
				    backgroundColor: 'rgba(255, 255, 255, 0.5);',
					color:'black'
				}
			})";

			return $select;
		}		
	}
}
class DataColumn{
	public $DataTable = null;
	public $Name = null;
	public $Ordinal = 0;
	public $DataType = "string";
	public $Default = null;
	
	function __construct($dataColumnName = null){
		if($dataColumnName!= null)
		$this->Name = trim($dataColumnName);
	}	
	function SetDefault($default){
		
	}
	public function Sort($dir, $type='') {
	

	}
}
class DataRow{
	public $DataTable = null;
	public $Columns = null;
	public $Cells = array();
	public $RowNumber= null;
}


