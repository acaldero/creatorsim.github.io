/*
 *  Copyright 2018-2023 Felix Garcia Carballeira, Diego Camarmas Alonso, Alejandro Calderon Mateos
 *
 *  This file is part of CREATOR.
 *
 *  CREATOR is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Lesser General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CREATOR is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with CREATOR.  If not, see <http://www.gnu.org/licenses/>.
 *
 */


/*
 *  Register operations
 */

function crex_findReg ( value1 )
{
	var ret = {} ;

	ret.match = 0;
	ret.indexComp = null;
	ret.indexElem = null;

	if (value1 == "") {
		return ret;
	}

	for (var i = 0; i < architecture.components.length; i++)
	{
		 for (var j = 0; j < architecture.components[i].elements.length; j++)
		 {
			  if (architecture.components[i].elements[j].name.includes(value1) != false)
			  {
				  ret.match = 1;
				  ret.indexComp = i;
				  ret.indexElem = j;
				  break ;
			  }
		 }
	}

	return ret ;
}

/*Modifies double precision registers according to simple precision registers*/
function updateDouble(comp, elem)
{
	for (var j = 0; j < architecture.components.length; j++)
		{
		for (var z = 0; z < architecture.components[j].elements.length && architecture.components[j].double_precision == true; z++)
				{
			if (architecture.components[comp].elements[elem].name.includes(architecture.components[j].elements[z].simple_reg[0]) != false){
				var simple = bin2hex(float2bin(architecture.components[comp].elements[elem].value));
				var double = bin2hex(double2bin(architecture.components[j].elements[z].value)).substr(8, 15);
				var newDouble = simple + double;

				architecture.components[j].elements[z].value = hex2double("0x"+newDouble);
			}
			if (architecture.components[comp].elements[elem].name.includes(architecture.components[j].elements[z].simple_reg[1]) != false){
				var simple = bin2hex(float2bin(architecture.components[comp].elements[elem].value));
				var double = bin2hex(double2bin(architecture.components[j].elements[z].value)).substr(0, 8);
				var newDouble = double + simple;

				architecture.components[j].elements[z].value = hex2double("0x"+newDouble);
			}
		}
	}
}

/*Modifies single precision registers according to double precision registers*/
function updateSimple ( comp, elem )
{
	var part1 = bin2hex(double2bin(architecture.components[comp].elements[elem].value)).substr(0, 8);
	var part2 = bin2hex(double2bin(architecture.components[comp].elements[elem].value)).substr(8, 15);

	for (var j = 0; j < architecture.components.length; j++)
		{
		for (var z = 0; z < architecture.components[j].elements.length; z++)
				{
			if (architecture.components[j].elements[z].name.includes(architecture.components[comp].elements[elem].simple_reg[0]) != false) {
				architecture.components[j].elements[z].value = hex2float("0x"+part1);
			}
			if (architecture.components[j].elements[z].name.includes(architecture.components[comp].elements[elem].simple_reg[1]) != false) {
				architecture.components[j].elements[z].value = hex2float("0x"+part2);
			}
		}
	}
}

function readRegister ( indexComp, indexElem )
{
	var draw = {
		space: [] ,
		info: [] ,
		success: [] ,
		danger: [],
		flash: []
	} ;

	if ((architecture.components[indexComp].elements[indexElem].properties.includes("read") != true))
	{
		for (var i = 0; i < instructions.length; i++) {
			draw.space.push(i);
		}
		draw.danger.push(executionIndex);
		executionIndex = -1;

		throw packExecute(true, 'The register '+ architecture.components[indexComp].elements[indexElem].name.join(' | ') +' cannot be read', 'danger', draw);
	}

	if ((architecture.components[indexComp].type == "control") ||
			(architecture.components[indexComp].type == "integer"))
	{
		console_log(parseInt((architecture.components[indexComp].elements[indexElem].value).toString()));
		return parseInt((architecture.components[indexComp].elements[indexElem].value).toString());
	}

	if (architecture.components[indexComp].type == "floating point")
	{
		return parseFloat((architecture.components[indexComp].elements[indexElem].value).toString());
	}
}

function writeRegister ( value, indexComp, indexElem )
{
	var draw = {
		space: [] ,
		info: [] ,
		success: [] ,
		danger: [],
		flash: []
	} ;

	if (value == null) {
		return;
	}

	if ((architecture.components[indexComp].type == "integer") ||
			(architecture.components[indexComp].type == "control"))
	{
			if ((architecture.components[indexComp].elements[indexElem].properties.includes('write') != true))
			{
				if ((architecture.components[indexComp].elements[indexElem].properties.includes('ignore_write') != false)){
					return;
				}

				for (var i = 0; i < instructions.length; i++) {
					 draw.space.push(i);
				}
				draw.danger.push(executionIndex);

				executionIndex = -1;
				throw packExecute(true, 'The register '+ architecture.components[indexComp].elements[indexElem].name.join(' | ') +' cannot be written', 'danger', draw);
			}

			architecture.components[indexComp].elements[indexElem].value = bi_intToBigInt(value,10);
			creator_callstack_writeRegister(indexComp, indexElem);

			if ((architecture.components[indexComp].elements[indexElem].properties.includes('pointer') != false) &&
					(architecture.components[indexComp].elements[indexElem].properties.includes('stack') != false)   &&
					(value != architecture.memory_layout[4].value)) {
						writeStackLimit(parseInt(bi_intToBigInt(value,10)));
			}

			if (typeof window !== "undefined") {
							btn_glow(architecture.components[indexComp].elements[indexElem].name, "Int") ;
			}
	}

	else if (architecture.components[indexComp].type =="floating point")
	{
		if (architecture.components[indexComp].double_precision == false)
		{
			if ((architecture.components[indexComp].elements[indexElem].properties.includes('write') != true))
			{
				if ((architecture.components[indexComp].elements[indexElem].properties.includes('ignore_write') != false)){
					return;
				}
				throw packExecute(true, 'The register '+ architecture.components[indexComp].elements[indexElem].name.join(' | ') +' cannot be written', 'danger', null);
			}

			architecture.components[indexComp].elements[indexElem].value = parseFloat(value);
			creator_callstack_writeRegister(indexComp, indexElem);

			if ((architecture.components[indexComp].elements[indexElem].properties.includes('pointer') != false) &&
					(architecture.components[indexComp].elements[indexElem].properties.includes('stack') != false)   &&
					(value != architecture.memory_layout[4].value)) {
						writeStackLimit(parseFloat(value));
			}

			updateDouble(indexComp, indexElem);

			if (typeof window !== "undefined") {
							btn_glow(architecture.components[indexComp].elements[indexElem].name, "FP") ;
			}
		}

		else if (architecture.components[indexComp].double_precision == true)
		{
			if ((architecture.components[indexComp].elements[indexElem].properties.includes('write') != true))
			{
				if ((architecture.components[indexComp].elements[indexElem].properties.includes('ignore_write') != false)){
					return;
				}
				throw packExecute(true, 'The register '+ architecture.components[indexComp].elements[indexElem].name.join(' | ') +' cannot be written', 'danger', null);
			}

			architecture.components[indexComp].elements[indexElem].value = parseFloat(value);
			updateSimple(indexComp, indexElem);
			creator_callstack_writeRegister(indexComp, indexElem);

			if (typeof window !== "undefined") {
							btn_glow(architecture.components[indexComp].elements[indexElem].name, "DFP") ;
					}
		}
	}
}

