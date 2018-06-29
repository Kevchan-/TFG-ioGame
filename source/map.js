if(typeof(global)!== 'undefined'){
	var fs = require('fs');
	var noiseGen = require('proc-noise');
	var Perlin = new noiseGen();
	var DropClass = require('./drop.js');
	var ThreatClass = require('./threat.js');
}

class Map{
	constructor(room, tilemap, isServer){
		this.width = 50;
		this.height = 50;
		this.tileMap = [];
		this.drops = [];
		this.threats = [];
		this.dropRandom = 5;
		this.game = room;
		for(var i = 0; i < this.width; i++){
			this.drops[i] = {};
			for(var j = 0; j < this.height; j++){
				this.drops[i][j] = null;
			}
		}
//		this.map = {};
		this.isServer = false;
		this.pendingChangedTiles = [];	//serverside only
		this.pendingAddedTiles = [];	//serverside only
		this.pendingDrops = [];	//serverside only
		this.tilesToReset = []; //serverside again, but this one will be timers to reset removed tiles
		this.tileResetTime = 1;
		this.tileResetMin = 100;

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
			this.tileMap.height = this.height;
			this.tileMap.width = this.width;
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

	Update(deltaTime){
		if(this.isServer){
			this.UpdateTiles();
		}

		var i = 0;

		while(i < this.threats.length){
			if(this.threats[i].ended){
				this.RemoveThreat(this.threats[i]);
			}
			else{
				this.threats[i].Update(deltaTime);
				i++
			}
		}
	}

	UpdateTiles(){
		if(this.tilesToReset.length > this.tileResetMin){
			var i = 0;
			while(i < this.tileResetMin){
				this.ResetTile(this.tilesToReset[i]);
				delete this.tilesToReset[i];
				i++;
			}
			this.tilesToReset.splice(0, this.tileResetMin);
		}
	}

	ResetTile(tile){
		var newTile = {x: tile.x, y: tile.y, type: tile.type};
		this.tileMap[tile.x][tile.y].type = tile.type;
		this.tileMap[tile.x][tile.y].hp = tile.hp;
		this.pendingAddedTiles.push(newTile);

		var i = 0;
		while(i < this.pendingChangedTiles.length){
			if(this.pendingChangedTiles[i].x == newTile.x && this.pendingChangedTiles[i].y == newTile.y){
				delete this.pendingChangedTiles[i];
				this.pendingChangedTiles.splice(i, 1);
			}
			else{
				i++;
			}
		}
		

	}

	AddDrop(game, pos, type){

		if(type == 5){
			this.AddThreat(game, pos, type);
		}
		else{
			var tile = {};
			tile.x = Math.trunc(pos.x);
			tile.y = Math.trunc(pos.y);
			var newDrop = {};

			if(!this.isServer){
				newDrop = new Drop(game, pos, type, this.isServer);
			}
			else{
				newDrop = new DropClass(game, pos, type, this.isServer);
			}
			this.drops[tile.x][tile.y] = newDrop;	
		}
	}

	AddThreat(game, pos, type){
		console.log("new threat");
		var tile = {};
		tile.x = Math.trunc(pos.x);
		tile.y = Math.trunc(pos.y);
		var newThreat = {};

		if(!this.isServer){
			newThreat = new Threat(game, tile, type, this.isServer);
		}
		else{
			newThreat = new ThreatClass(game, tile, type, this.isServer);
		}

		newThreat.index = this.threats.length;
		this.threats.push(newThreat);
	}

	RemoveThreat(threat){
		delete this.threats[threat.index];
		this.threats.splice(threat.index, 1);
	}

	RemoveDrop(drop, pos){
		var tile = {};
		if(typeof(pos) == "undefined"){
			tile = drop.pos;
		}
		else{
			tile.x = Math.trunc(pos.x);
			tile.y = Math.trunc(pos.y);
		}

		if(!this.isServer){
			this.drops[tile.x][tile.y].RemoveSprite();
		}
		else{
			var drop = {};
			drop.x = tile.x;
			drop.y = tile.y;
			this.pendingDrops.push(drop)
		}
		delete this.drops[tile.x][tile.y]; 
		this.drops[tile.x][tile.y] = null;


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

	HitTile(x, y, damage, id){
		var tile = this.GetTile(x, y);
		tile.hp -= damage;

		if(this.isServer){
			if(tile.hp <= 0){
				this.RemoveTile(x, y, id);
			}
			else{
				var newtile = {x: x, y: y, attacker: id};
				newtile.hp = tile.hp;
				newtile.randomDrop = 0;
				this.pendingChangedTiles.push(newtile);
			}
		}
	}

	PutTile(x, y, type){		//clientside
		if(this.tileMap[x][y].type == 2 || this.tileMap[x][y].type == 3){
			console.log(type);
			this.tileMap[x][y].type = type;
			this.map.putTile(type, x, y, this.rocksLayer);
		}
	}

	RemoveTile(x, y, id){
		var deleted = false;
		var tileType = this.tileMap[x][y].type;
		if(this.isServer){
			if(this.tileMap[x][y].type != 2 && this.tileMap[x][y].type != 3){
				deleted = true;
				this.tileMap[x][y].type = 2;
				var tile = {x: x, y: y, attacker: id};
				tile.hp = 0;
				var randomDrop = this.GenerateDrop();
				this.AddDrop(this.game, {x: x, y: y}, randomDrop);
				tile.randomDrop = randomDrop;
				tile.justDied = true;
				this.pendingChangedTiles.push(tile);
	//			console.log("removed Tile "+tile.x+", "+tile.y);
			}
		}
		else{
			if(this.tileMap[x][y].type != 2 && this.tileMap[x][y].type != 3){
				deleted = true;
				this.tileMap[x][y].type = 2;
				this.map.putTile(2, x, y, this.rocksLayer);
//				DeleteSprite(this.tileMap[x][y].sprite);
//				this.map.removeTile(x, y, 1);
			}
		}

		var tileToReset = {x: x, y: y, hp: this.tileMap[x][y].hp, type: tileType, running: false, reseted: false};
		this.tilesToReset.push(tileToReset);

		return(deleted);
	}

	GenerateDrop(){
		var randomDrop = Math.round(Math.random()*this.dropRandom);
		return(randomDrop);
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

