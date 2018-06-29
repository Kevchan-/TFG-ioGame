class Threat{
	constructor(game, pos, type, server){
		this.pos = pos;
		this.type = type;
		this.ended = false;
		this.game = game;
		this.server = server;
		switch(type){
			case 5:
			console.log("bomb");
			if(!server){
				this.sprite = AddSprite("bomb", pos);
			}
			this.timer = 2;
			this.exploded = false;
			this.damage = 5;

			var random = Math.random();
			this.strength = 1;
			if(random > 0.5){
				this.strength = 2;
			}
			if(random > 0.8){
				this.strength = 3;
			}
			break;
			case 6:
			break;
			case 7:
			break;
		}
	}

	Update(deltaTime){
		switch(this.type){
			case 5:
			if(!this.exploded){
				console.log("updating "+ this.timer);
				if(this.timer <= 0){
					this.exploded = true;
					this.Explode();
				}
				else{
					this.timer -= deltaTime;
				}
			}

			break;
			case 6:
			break;
			case 7:
			break;
		}
	}

	Explode(){
		var tileMap = this.game.map.tileMap;
		var radius = 2;

		if(!this.server){
			DeleteSprite(this.sprite);
		}

		if(this.strength == 2){
			radius = 4;
		}
		else if(this.strength == 3){
			radius = 8;
		}

		var tilesAffected = [];

		for(var i = -radius; i <= radius; i++){
			for(var j = -radius; j <= radius; j++){
				var posX = this.pos.x+i;
				var posY = this.pos.y+j;

				if(posX >= 0 && posY >= 0 && posX < tileMap.width && posY < tileMap.height){
					var tile = tileMap[posX][posY];
					var x = tile.x - this.pos.x;
					var y = tile.y - this.pos.y;

//					console.log("point: "+x+", "+y);
					var distanceToCenter = Math.hypot(x, y);

					if(Math.abs(distanceToCenter) <= radius){
						if(!this.server){
						    if(emitterExplosions == null){
							    CreateEmitter(3);
					  	    }							
							setTimeout(
								ParticleBurst.bind(this, 3, {x: tile.x, y: tile.y}, 4), 100
							);							
						}
						else{
							tilesAffected.push(tile);
						}
					}
				}
			}
		}
		if(this.server){
			this.CheckForPlayersAffected(tilesAffected, 6, 0.5);
		}
	}

	CheckForPlayersAffected(tiles, times, interval){
		var players = this.game.players;
		var times = times - 1;

		for(var i = 0; i < tiles.length; i++){
			var posX = tiles[i].x;
			var posY = tiles[i].y;

			for(var player in players){
				if(players.hasOwnProperty(player)){
					if(!players[player].dead)
					if(Math.floor(players[player].pos.x) == posX && Math.floor(players[player].pos.y)){
						players[player].healthPoints -= this.damage;
					}
				}
			}

		}

		if(times == 0){
			this.ended = true;
		}
		else{
			setTimeout(this.CheckForPlayersAffected.bind(this, tiles, times, interval), interval*1000);
		}
	}
}

if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Threat;	
}