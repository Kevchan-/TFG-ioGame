if(typeof(global)!== 'undefined'){
	var fs = require('fs');
	var noiseGen = require('proc-noise');
	var Perlin = new noiseGen();
	var DropClass = require('./drop.js');
	var ThreatClass = require('./threat.js');
	var PowerUpClass = require('./powerUp.js');
var seedrandom = require('seedrandom');

}

class Map{
	constructor(room, tilemap, isServer, teamColors){
		this.width = 40;
		this.height = 40;
		this.tileMap = [];
		this.drops = [];
		this.threats = [];
		this.powerUps = [];
		this.dropRandom = 100;
		this.game = room;
		for(var i = 0; i < this.width; i++){
			this.drops[i] = {};
			for(var j = 0; j < this.height; j++){
				this.drops[i][j] = null;
			}
		}
		
		this.isServer = false;
		this.pendingChangedTiles = [];	//serverside only
		this.pendingAddedTiles = [];	//serverside only
		this.pendingDrops = [];	//serverside only
		this.pendingTakenPowerUps = [];	//serverside only
		this.pendingTilesToBreak = []; //clientside only, tiles yet to confirm that are broken on clientside
		this.tilesToReset = []; //serverside again, but this one will be timers to reset removed tiles
		this.tileResetTime = 1;
		this.tileResetMin = 1000;

		this.standardTileHp = 1;
		this.strongTileHp = 2;
		this.staticTileHp = 100000;

		if(typeof(isServer) == 'undefined' || isServer == false){
			this.tileMap = tilemap;

			this.tileMap.height = this.tileMap.length;
			this.tileMap.width = this.tileMap.length;

			this.map = game.add.tilemap();

			var bmd = game.make.bitmapData(tileSize * 25, tileSize * 2);
		    var colors = Phaser.Color.HSVColorWheel();
		    this.colorIndexes = {};

		    var i = teamColors.length-1;
		    var index = 0;
		    for (var y = 0; y < 2; y++)
		    {
		        for (var x = 0; x < 25; x++)
		        {
		            bmd.rect(x * tileSize, y * tileSize, tileSize, tileSize, teamColors[i]);
		            this.colorIndexes[teamColors[i]] = index;
		            index++;
		            i -= 1;
		        }
		    }
   			game.world.setBounds(tileSize*(-this.tileMap.width/2), tileSize*(-this.tileMap.height/2), tileSize*(this.tileMap.width+this.tileMap.width), tileSize*(this.tileMap.height+this.tileMap.height));

		    this.blankColorIndex = teamColors.length-1;

			this.map.addTilesetImage('colors', bmd, tileSize, tileSize, 0, 0, 0 );
			this.map.addTilesetImage('spritesheet', 'spritesheet', tileSize, tileSize, 0, 0,this.map.tilesets[0].total);
			this.rocksGid = this.map.tilesets[1].firstgid;

			this.bgLayer = this.map.create('bg', this.tileMap.width, this.tileMap.height, tileSize, tileSize);
			this.rocksLayer = this.map.createBlankLayer('rocks', this.tileMap.width, this.tileMap.height, tileSize, tileSize);
			this.bgLayer.alpha = 1;
			this.rocksLayer.alpha = 1;
		//	this.rocksLayer.resizeWorld();

			for(var i = 0; i < this.tileMap.height; i++){
				for(var j = 0; j < this.tileMap.width; j++){
					var type = this.tileMap[i][j].type;
					var index = this.GetColorIndex(this.tileMap[i][j].id);
					if(type != 3){
						this.map.putTile(this.rocksGid+type, i, j, this.rocksLayer);
						this.map.putTile(index, i, j, this.bgLayer);
					}
					else{
						this.map.putTile(index, i, j, this.bgLayer);
					}
				}
			}
		}
		else{
			this.rng = seedrandom();
			Perlin.noiseReseed();
			this.noiseScale = 0.07;
			this.isServer = true;
			this.tileMap.height = this.height;
			this.tileMap.width = this.width;
		//	var mapData = this.ServerLoadJSON(mapName);
		//	this.map = this.ServerParseMap(mapData);
					var values = {};
			for(var i = 0; i < this.tileMap.height; i++){
				this.tileMap[i] = {};
				var print = "";
				for(var j = 0; j < this.tileMap.width; j++){
//					var tile = {};
//					tile.hp = this.standardTileHp;
//					tile.type = this.map.layers[1].tiles[j][i];

					var tile = this.ServerGenerateTile(i, j);
					values = values+", "+tile.type;
					this.tileMap[i][j] = tile;
				}
			}
		}
	}

	Update(deltaTime){
		if(this.isServer){
			this.UpdateTiles();
			this.CheckPowerUpCollisions();
		}

		var i = 0;

		while(i < this.powerUps.length){
			if(this.powerUps[i].ended){
//				console.log("threats "+this.threats.length);
				this.RemovePowerUp(i);
			}
			else{
				this.powerUps[i].Update(deltaTime);
				i++
			}
		}		

		i = 0;

		while(i < this.threats.length){
			if(this.threats[i].ended){
//				console.log("threats "+this.threats.length);
				this.RemoveThreat(this.threats[i], i);
			}
			else{
				this.threats[i].Update(deltaTime);
				i++
			}
		}
	}

	CheckPowerUpCollisions(){
		if(this.powerUps.length){
			var players = this.game.players;
			for(var playerid in players){
				if(players.hasOwnProperty(playerid)){
					var player = players[playerid];
					if(!player.dead){
						for(var i = 0; i < this.powerUps.length; i++){
							if(!this.powerUps[i].taken){
								var pUp = this.powerUps[i];
								var posX = pUp.pos.x;
								var posY = pUp.pos.y;
								
								if(Math.round(player.pos.x) == posX && Math.round(player.pos.y) == posY){
									if(player.usingPowerUp){

									}
									else{
										if(player.powerUp){
											player.powerUp.End();								
										}										
										console.log("power up collision");
										pUp.Take(player.id);
										var taken = {x: pUp.pos.x, y: pUp.pos.y, id: pUp.id};
										taken.justTaken = true;
										taken.player = player.id;
										this.pendingTakenPowerUps.push(taken);
									}
								}
							}
						}
					}
				}
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

	ResetTile(tile, id){	//serverside
		var newTile = {x: tile.x, y: tile.y, type: tile.type, id: id};
		var isPlayerOnTile = false;

		var players = this.game.players;
		for(var i = 0; i < players.length; i++){
			if(!players[i].dead){
				var pos = players[i].pos;
				var tilePos = {x: Math.abs(newTile.x), y: Math.abs(newTile.y)};
				pos.x = Math.abs(pos.x);
				pos.y = Math.abs(pos.y);
				if(Math.round(pos.x) == tilePos.x && Math.round(pos.y) == tilePos.y){
					isPlayerOnTile = true;
					break;
				}
			}
		}

		if(!isPlayerOnTile){

			this.tileMap[tile.x][tile.y].type = tile.type;
			this.tileMap[tile.x][tile.y].hp = tile.hp;
			this.tileMap[tile.x][tile.y].id = id;
			this.pendingAddedTiles.push(newTile);

			var i = 0;
			while(i < this.pendingChangedTiles.length){
				if(this.pendingChangedTiles[i].x == newTile.x && this.pendingChangedTiles[i].y == newTile.y){
					delete this.pendingChangedTiles[i];
					this.pendingChangedTiles.splice(i, 1);
					break;
				}
				else{
					i++;
				}
			}
		}
		else{
			console.log("couldnt make tile");
		}
	}

	PlayerLeft(id){
		for(var i = 0; i < this.tileMap.height; i++){
			for(var j = 0; j < this.tileMap.width; j++){
				var tile = this.tileMap[i][j];
				if(tile.id == id){ 
					this.tileMap[i][j].id = false;
					if(!this.isServer){
						this.map.putTile(this.blankColorIndex, i, j, this.bgLayer);
					}
				}
			}
		}
	}

	AddDrop(game, pos, type){

		var type = type;
		if(type >= 12 && type <= 15){
			if(type < 14){
				type = 5;
			}
			else if(type == 14){
				type = 6;
			}
			else{
				type = 7;
			}
			this.AddThreat(game, pos, type);
		}
		else if(type >= 16 && type <= 20){
			var powerType = 8;

			if(type == 17){
				powerType = 9;
			}
			else if(type == 18){
				powerType = 10;
			}
			else if(type == 19){
				powerType = 11;
			}

			this.AddPowerUp(game, pos, powerType);
		}
		else if(type > 20 && type < 23){
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

		this.threats.push(newThreat);
		newThreat.index = this.threats.length-1;
	}

	AddPowerUp(game, pos, type){
//		console.log("new power up");
		var tile = {};
		tile.x = Math.trunc(pos.x);
		tile.y = Math.trunc(pos.y);
		var newPUp = {};

		if(!this.isServer){
			newPUp = new PowerUp(game, tile, type, this.isServer);
		}
		else{
			newPUp = new PowerUpClass(game, tile, type, this.isServer);
		}

		this.powerUps.push(newPUp);
		newPUp.index = this.threats.length-1;
	}

	RemoveThreat(threat, index){
		console.log("index: "+index);
		delete this.threats[index];
		this.threats.splice(index, 1);
	}

	ProcessTakenPowerUp(powerUp, player){

	}

	RemovePowerUp(index){
		delete this.powerUps[index];
		this.powerUps.splice(index, 1);		
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
			this.pendingDrops.push(drop);
		}
		delete this.drops[tile.x][tile.y]; 
		this.drops[tile.x][tile.y] = null;
	}

	ServerGenerateTile(x, y){
		var tile = {};
		var value = Perlin.noise(x*this.noiseScale, y*this.noiseScale)*100;
//		console.log(value);
//		var value = Math.abs(Math.round((Perlin.noise(x * this.noiseScale, y * this.noiseScale)*5))-1);

		tile.x = x;
		tile.y = y;
//		tile.type = Math.round(value*4/*total types of tile*/);
		
		if(value <35){
			tile.type = 3;
		}
		else if(value < 60){
			tile.type = 0;
		}
		else if(value < 75){
			tile.type = 1;
		}
		else if(value <= 100){
			tile.type = 2;
		}
		if(tile.type == 0){
			tile.hp = this.standardTileHp;
		}
		else if(tile.type == 1){
			tile.hp = this.strongTileHp;
		}
		else if(tile.type == 2){
			tile.hp = this.staticTileHp;
		}

		tile.id = false;

		return(tile);
	}

	GetTile(x, y){
		return(this.tileMap[x][y]);
	}

	IsTileFree(x, y){
		var free = true;
		var tile = this.GetTile(x, y);
//		console.log("type "+tile.type);

		if((tile.type != 3)){
			free = false;
	//		console.log("tile not free");
		}
		if(tile.hp <= 0){
			free = true;
		}

		return(free);
	}

	HitTile(x, y, damage, id, powerUp){
		var tile = this.GetTile(x, y);
		var damage = damage;
		tile.hp -= damage;


		if(tile.hp <= 0){
			if(this.isServer){
				this.RemoveTile(x, y, id, false);
			}
			else{
				this.RemoveTile(x, y, id, false, true);
			}
		}
		else if(this.server){
			var newtile = {x: x, y: y, attacker: id};
			newtile.hp = tile.hp;
			newtile.randomDrop = 0;
			this.pendingChangedTiles.push(newtile);
		}
		
		var hp = tile.hp;
		return(hp);
	}

	GetColorIndex(id){
		var color;
		var index = this.blankColorIndex;

		if(id){
			if(id == this.game.selfPlayer.id){
				color = this.game.selfPlayer.teamColor;
			}
		
			else{
				color = this.game.players[id].teamColor;
			}
			index = this.colorIndexes[color];
		}

		return(index);
	}

	PutTile(x, y, type, id){		//clientside
		var put = false;

		if(this.tileMap[x][y].type == 3){
			this.tileMap[x][y].type = type;
			var hp = 1;
			this.tileMap[x][y].hp = hp;
			this.tileMap[x][y].id = id;

			var index = this.GetColorIndex(id);

			this.map.putTile(index, x, y, this.bgLayer);
			this.map.putTile(this.rocksGid+type-1, x, y, this.rocksLayer);
			put = true;
		}
		return(put);
	}

	RemoveTile(x, y, id, ghostRemove, conditional){

		var deleted = false;
		var tileType = this.tileMap[x][y].type;
		if(this.isServer){
			var tilePrevId = this.tileMap[x][y].id;

			if(tilePrevId){
				this.game.players[tilePrevId].points--;
			}			

			if(ghostRemove == true){	//remove tile with no other effects
				if(this.tileMap[x][y].type != 3){
					deleted = true;
					this.tileMap[x][y].type = 3;
					this.tileMap[x][y].id = false;
					var tile = {x: x, y: y, attacker: id};
					tile.hp = 0;
					var randomDrop = 100;
					tile.randomDrop = randomDrop;
					tile.justDied = true;
					this.pendingChangedTiles.push(tile);
				}
			}
			else{
				if(this.tileMap[x][y].type != 3){
					deleted = true;
					this.tileMap[x][y].type = 3;
					this.tileMap[x][y].id = false;
					var tile = {x: x, y: y, attacker: id};
					tile.hp = 0;
					var randomDrop = 0;
					if(id){
						randomDrop = this.GenerateDrop();
					}
					this.AddDrop(this.game, {x: x, y: y}, randomDrop);
					tile.randomDrop = randomDrop;
					tile.justDied = true;
					this.pendingChangedTiles.push(tile);
		//			console.log("removed Tile "+tile.x+", "+tile.y);
				}
			}
		}
		else{
			if(this.tileMap[x][y].type != 3){
				if(!conditional){
					this.tileMap[x][y].type = 3;
					this.tileMap[x][y].id = false;
					deleted = true;
				}


				this.map.removeTile(x, y, this.rocksLayer);
				this.map.putTile(this.blankColorIndex, x, y, this.bgLayer);

//					this.pendingTilesToBreak.push({x: x, y: y, attacker: id, counter: 3});
//				DeleteSprite(this.tileMap[x][y].sprite);
//				this.map.removeTile(x, y, 1);
			}
		}

//		var tileToReset = {x: x, y: y, hp: this.tileMap[x][y].hp, type: tileType, running: false, reseted: false};
//		this.tilesToReset.push(tileToReset);

		return(deleted);
	}

	GenerateDrop(){
		var randomDrop = Math.round(this.rng()*this.dropRandom);
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

