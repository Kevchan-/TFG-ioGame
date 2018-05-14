if(typeof(global)!== 'undefined'){
	var fs = require('fs');
}

class Map{
	constructor(mapName, isServer){
		this.tileMap = [];
		this.map;
		this.isServer = false;
		if(typeof(isServer) == 'undefined'){
			this.map = game.add.tilemap(mapName);
			this.map.addTilesetImage('tiles1024', 'tiles1024');
			var layer = this.map.createLayer('Tile Layer 1');
			var obstacles = this.map.createLayer('Tile Layer 2');

			layer.resizeWorld();
			obstacles.resizeWorld();

			for(var i = 0; i < this.map.height; i++){
				this.tileMap[i] = {};
				for(var j = 0; j < this.map.width; j++){
					this.tileMap[i][j] = this.map.getTile(i, j, obstacles);

				}
			}
		}
		else{
			this.isServer = true;
			var mapData = this.ServerLoadJSON(mapName);
			this.map = this.ServerParseMap(mapData);

			for(var i = 0; i < this.map.height; i++){
				this.tileMap[i] = {};
				var print = "";
				for(var j = 0; j < this.map.width; j++){
					this.tileMap[i][j] = this.map.layers[1].tiles[j][i];
				}
			}
		}
	}

	GetTile(x, y){
		return(this.tileMap[x][y]);
	}

	IsTileFree(x, y){
		var free = true;
		var tile = this.GetTile(x, y);
		console.log("tile "+x+", "+y+": "+tile);
		if(this.isServer){
			if(tile != 0){
				free = false;
				console.log("is not free");
			}
		}
		else{
			if(tile != null){
				free = false;
			}
		}

		return(free);
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
			}
		}
		return(map);
	}
}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Map;
}

