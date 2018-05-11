if(typeof(global)!== 'undefined'){
	var fs = require('fs');
}

class Map{
	constructor(mapName, isServer){
		var map;
		if(typeof(isServer) == 'undefined'){
			map = game.add.tilemap(mapName);
			map.addTilesetImage('tiles1024', 'tiles1024');
//			var layer = map.createLayer('Tile Layer 1');
			var obstacles = map.createLayer('Tile Layer 2');
//			layer.scale.set(gameScale);
			obstacles.scale.set(gameScale);
//			layer.resizeWorld();
			obstacles.resizeWorld();

			var bounds = game.world.getBounds();
	//		console.log("Bounds: "+bounds);
		}
		else{
			var mapData = this.ServerLoadJSON(mapName);
			map = this.ServerParseMap(mapData);
		}
	}

	ServerLoadJSON(mapName){
		var mapData = JSON.parse(fs.readFileSync('./source/assets/'+mapName+'.json'));
		return(mapData);
	}

	ServerParseMap(mapData){
		var layers = mapData.layers;
		var layerLength = mapData.layers.length;
		//GET LAYERS

		var map = {};
		map.height = mapData.height;
		map.width = mapData.width;
		map.layers = {};

		for(var o = 0; o < layerLength; o++){
			map.layers[o] = {};
			map.layers[o].tiles = {};
			var iterator = 0;
			for(var i = 0; i < map.height; i++){
				var string = "";
				map.layers[o].tiles[i] = {};
				for(var j = 0; j < map.width; j++){
					map.layers[o].tiles[i][j] = mapData.layers[o].data[iterator];
					string = string+" "+map.layers[o].tiles[i][j];
					iterator++;
				}
//				console.log("Row: "+string);
			}
		}
		return(map);
	}
}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Map;
}

