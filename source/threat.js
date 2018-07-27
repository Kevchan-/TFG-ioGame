class Threat{
	constructor(game, pos, type, server, playerId){
		this.pos = pos;
		this.type = type;
		this.ended = false;
		this.game = game;
		this.server = server;
		this.timer = 3;
		this.exploded = false;
		this.damage = 5;	
		this.tilesAffected = [];
		this.player = playerId;

		var random = Math.random();
		if(!server){
			this.sprite = AddSprite("bomb", pos);
			Flickering(this.sprite, 0x00ff00, this.timer+0.3, 0.5);
		}

		if(type == 5){
			this.strength = 1;
		}		
		else if(type == 6){
			this.strength = 2;
		}
		else if(type == 7){
			this.strength = 3;
		}

		console.log("bomb "+this.strength);

		switch(type){
			case 5:

			break;
		}
	}

	Update(deltaTime){
			if(!this.exploded){
//				console.log("updating "+ this.timer);
				if(this.timer <= 0){
					this.exploded = true;
						this.Explode();
				}
				else{
					this.timer -= deltaTime;
				}
			}

			switch(this.type){
				case 5:
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
							this.tilesAffected.push({x: tile.x, y: tile.y});
						}
						else{
							this.tilesAffected.push(tile);
							this.game.map.HitTile(tile.x, tile.y, this.damage, null);
						}
					}
				}
			}
		}
	    console.log("BOOM");
//	    console.log("Tiles affected: "+this.tilesAffected.length);
		if(this.server){
			this.CheckForPlayersAffected(this.tilesAffected, 2, 0.5);
		}
		else{
		     if(emitterExplosions == null){
			     CreateEmitter(3);
	   	    }					
			 	ParticlesBurst(3, this.tilesAffected, 4, 0.5);
			 this.ended = true;
		}
	}

	ClientExplode(tilesAffected){
		for(var i = 0; i < tilesAffected; i++){
			tile = tilesAffected[i];
			this.game.map.HitTile(tile.x, tile.y, this.damage, null);
		}

		if(emitterExplosions == null){
			CreateEmitter(3);
	   	    }					
	 	ParticlesBurst(3, tilesAffected, 4, 0.5);
		this.ended = true;		
	}

	CheckForPlayersAffected(tiles, times, interval){
		var players = this.game.players;
		var times = times - 1;

		for(var player in players){
			if(players.hasOwnProperty(player)){
				if(!players[player].dead){
					for(var i = 0; i < tiles.length; i++){
						var posX = tiles[i].x;
						var posY = tiles[i].y;
						
						if(Math.round(players[player].pos.x) == posX && Math.round(players[player].pos.y) == posY){
							players[player].healthPoints -= this.damage;
							break;
						}
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