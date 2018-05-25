if(typeof(global)!== 'undefined'){
	var fs = require('fs');
	var noiseGen = require('proc-noise');
	var Perlin = new noiseGen();
}

class Map{
	constructor(tilemap, isServer){
		this.tileMap = [];
//		this.map = {};
		this.isServer = false;
		this.pendingChangedTiles = [];	//serverside only

		this.standardTileHp = 1;

		if(typeof(isServer) == 'undefined'){
			this.tileMap = tilemap;

			this.tileMap.height = this.tileMap.length;
			this.tileMap.width = this.tileMap.length;
//			game.world.setBounds(0, 0, this.tileMap.width*tileSize, this.tileMap.height*tileSize);

			this.map = game.add.tilemap();
			this.map.addTilesetImage('spritesheet', 'spritesheet', tileSize, tileSize, 0, 0);
			this.rocksLayer = this.map.create('rocks', this.tileMap.width, this.tileMap.height, tileSize, tileSize);
			this.rocksLayer.resizeWorld();

//			this.map.addTilesetImage('tiles1024', 'tiles1024');

			console.log(this.map);
			for(var i = 0; i < this.tileMap.height; i++){
				for(var j = 0; j < this.tileMap.width; j++){
//					var tile = {};
//					tile.hp = this.standardTileHp;
//					tile.type = this.map.getTile(i, j, obstacles);
//					tile.type = 0;
					var type = this.tileMap[i][j].type;
//					var tile = new Tile(this.rocksLayer, type, i, j, tileSize, tileSize);
//					console.log(type);
					//this.tileMap[i][j].sprite = AddSprite('spritesheet', {x: i, y: j}, type);
					this.map.putTile(type, i, j, this.rocksLayer);
//					this.map.fill(2, i, j, 1, 1, this.rocksLayer);
//					console.log("tile put");
				}
			}
		}
		else{
			Perlin.noiseReseed();
			this.noiseScale = 0.07;
			this.isServer = true;
			this.tileMap.height = 50;
			this.tileMap.width = 50;
		//	var mapData = this.ServerLoadJSON(mapName);
		//	this.map = this.ServerParseMap(mapData);

			for(var i = 0; i < this.tileMap.height; i++){
				this.tileMap[i] = {};
				var print = "";
				for(var j = 0; j < this.tileMap.width; j++){
//					var tile = {};
//					tile.hp = this.standardTileHp;
//					tile.type = this.map.layers[1].tiles[j][i];
					var tile = this.ServerGenerateTile(i, j);
					this.tileMap[i][j] = tile;
				}
			}
		}
	}

	ServerGenerateTile(x, y){
		var tile = {};
		var value = Perlin.noise(x * this.noiseScale, y * this.noiseScale);

		tile.x = x;
		tile.y = y;
		tile.type = Math.round(value*4/*total types of tile*/);
		tile.hp = this.standardTileHp;

		return(tile);
	}

	GetTile(x, y){
		return(this.tileMap[x][y]);
	}

	IsTileFree(x, y){
		var free = true;
		var tile = this.GetTile(x, y);
//		console.log("type "+tile.type);

		if(tile.type != 2 && tile.type != 3){
			free = false;
	//		console.log("tile not free");
		}

		return(free);
	}

	HitTile(x, y, damage, type){
		var tile = this.GetTile(x, y);
		tile.hp -= damage;

		if(this.isServer)
			if(tile.hp <= 0){
				this.RemoveTile(x, y);
			}
	}

	RemoveTile(x, y){
		if(this.isServer){
			if(this.tileMap[x][y].type != 2 && this.tileMap[x][y].type != 3){
				this.tileMap[x][y].type = 2;
				var tile = {x: x, y: y};
				tile.hp = 0;
				this.pendingChangedTiles.push(tile);
	//			console.log("removed Tile "+tile.x+", "+tile.y);
			}
		}
		else{
			if(this.tileMap[x][y].type != 2 && this.tileMap[x][y].type != 3){
				this.tileMap[x][y].type = 2;
				this.map.putTile(2, x, y, this.rocksLayer);
//				DeleteSprite(this.tileMap[x][y].sprite);
//				this.map.removeTile(x, y, 1);
			}
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
			}
		}
		return(map);
	}
}




if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Map;
}

