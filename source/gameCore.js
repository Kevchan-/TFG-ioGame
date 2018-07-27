var serverUpdatesPerSecond = 20;	//on server we update preferiby 20 times per second

if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser	
	var PlayerObject = require('./player.js');
	var GameMap = require('./map.js');	
	var SSCD = require('sscd').sscd;
}else{
	var debugDrawing = true;
	var clientUpdateFrequency = 30;	//on client run at 60fps

	var width = 20*16;	//20 tiles on horizontal screen 
	var height = 20*16;
	var innerWidth = window.innerWidth;
	var innerHeight = window.innerHeight;
	var windowsRatio = 1;
	
	if(innerWidth > innerHeight){
		windowsRatio = innerWidth/innerHeight;
		width = width*windowsRatio;
	}
	else{
		windowsRatio = innerHeight/innerWidth;
		height = height*windowsRatio;
	}
	width = Math.round(width);
	height = Math.round(height);
	var game = new Phaser.Game(width, height, Phaser.CANVAS, 'gameCanvas', { preload: Preload, create: Create }, false, false);
//	console.log("Window dimensions: "+window.innerWidth+", "+window.innerHeight);
}


class GameCore{
	constructor(room){
		this.room = room;
		this.server = false;	//is this run by the server or by a client
		this.gameNet;
		this.map;
		this.players = {};
		this.host = {}; 	//serverside only, player object for the host client
		this.selfPlayer = {};	//clientside only, this is the player object from the cient itself. if it's not the clientside then the first player added from the server will be in the players list
		this.playerCount = 0;
		this.localTime = new Date().getTime();
		this.serverUpdates = [];	//clientside only
		this.pWorld = new SSCD.World({grid_size: 16*5});


		this.active = false;

//		console.log("Game created");

		if(this.room){	//only when created on the server are we given a room on constructor
			this.server = true;
		}

		if(this.server){
			this.map = new GameMap(this, "map100x100", true);
		}
		else{
			this.ClientConnectToServer();
		}

		this.entityInterpolation = true;
		this.clientSmoothing = 10;
	}

	Update(){
		if(this.active){
			var time = new Date().getTime()/1000.0;	//to seconds
			this.localDeltaTime = time - this.localTime || time;
			this.localTime = time;

			if(this.server){
				var delay = (1/serverUpdatesPerSecond)*1000;	//*1000 bcause function takes milliseconds, not seconds
				this.ServerUpdate();
				setTimeout(this.Update.bind(this), delay);
			}
			else{
				this.ClientUpdate();
				setTimeout(
					function(){
						window.requestAnimationFrame(this.Update.bind(this), this.viewport);
					}.bind(this), (1/clientUpdateFrequency)*1000
				);
			}
		}
	}

	ServerAddPlayer(client){
		this.players[client.userid] = new PlayerObject(this, client);
		this.playerCount++;
	}

	ServerStartGame(map){
		this.active = true;
		this.Update();
	}


	ServerRevivePlayer(id){
		console.log("SERVER REVIVE PLAYER");
		var cords = {};
		cords.x = Math.floor(Math.random()*(20));
		cords.y = Math.floor(Math.random()*(20));
		this.players[id].SetUpParameters(cords, id);

		this.map.RemoveTile(cords.x, cords.y, null, true);
	}

	ServerUpdate(){
		var serverTime = this.localTime;
		var state = {};

		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){
				this.players[playerid].ServerProcessInputs();
				this.players[playerid].Update(this.localDeltaTime);

				state[playerid] = {};
				if(this.players[playerid].dead && this.players[playerid].healthPoints <= 0){
//						console.log("Spawn counter "+this.players[playerid].spawnCounter+", "+this.localDeltaTime);
					if(this.players[playerid].spawnCounter <= this.players[playerid].spawnTime){
						this.players[playerid].spawnCounter += this.localDeltaTime;
					}
					else{
						//this.ServerRevivePlayer(playerid);
					}
				}

				state[playerid].healthPoints = this.players[playerid].healthPoints;
				state[playerid].lastPersonWhoHit = this.players[playerid].lastPersonWhoHit;

				if(this.players[playerid].healthPoints <= 0 && !this.players[playerid].dead){
					this.players[playerid].KillPlayer();
				}

//				console.log("Health: "+state[playerid].healthPoints);
				state[playerid].pos = this.players[playerid].pos;
				state[playerid].dead = this.players[playerid].dead;
				state[playerid].destination = this.players[playerid].destination;
				state[playerid].moving = this.players[playerid].moving;
				state[playerid].hitting = this.players[playerid].hitting;
				state[playerid].lastTile = this.players[playerid].lastTile;
				state[playerid].inputSequence = this.players[playerid].lastInputSequenceNumber;
				state[playerid].usePowerUp = this.players[playerid].usingPowerUp;
//				console.log(state[playerid].usePowerUp);

						//		console.log("Server update: "+state[playerid].pos.x+", "+state[playerid].pos.y);
			}
		}

		this.map.Update(this.localDeltaTime);

		if(this.map.pendingChangedTiles.length){
			state.tilesState = {};
		}

		for(var tiles in this.map.pendingChangedTiles){
			if(this.map.pendingChangedTiles.hasOwnProperty(tiles)){
				var tile = this.map.pendingChangedTiles[tiles];
				state.tilesState[tile.x+"x"+tile.y] = {};
				state.tilesState[tile.x+"x"+tile.y].x = tile.x;
				state.tilesState[tile.x+"x"+tile.y].y = tile.y;
				state.tilesState[tile.x+"x"+tile.y].hp = tile.hp;
				state.tilesState[tile.x+"x"+tile.y].attacker = tile.attacker;
				state.tilesState[tile.x+"x"+tile.y].drop = tile.randomDrop;
				state.tilesState[tile.x+"x"+tile.y].justDied = tile.justDied;
			}
		}

		var i = 0;
		while(i < this.map.pendingChangedTiles.length){
			if(this.map.pendingChangedTiles[i].hp > 0){
				delete this.map.pendingChangedTiles[i];
				this.map.pendingChangedTiles.splice(i, 1);
			}			
			else{
				this.map.pendingChangedTiles[i].justDied = false;
				i++;
			}
		}

		if(this.map.pendingDrops.length){
			state.dropsState = {};
		}

		for(var drops in this.map.pendingDrops){
			if(this.map.pendingDrops.hasOwnProperty(drops)){
				var drop = this.map.pendingDrops[drops];
				state.dropsState[drop.x+"x"+drop.y] = {};
				state.dropsState[drop.x+"x"+drop.y].x = drop.x;
				state.dropsState[drop.x+"x"+drop.y].y = drop.y;
			}
		}

		if(this.map.pendingAddedTiles.length){
			state.newTiles = {};
		}

		for(var tiles in this.map.pendingAddedTiles){
			if(this.map.pendingAddedTiles.hasOwnProperty(tiles)){
				var tile = this.map.pendingAddedTiles[tiles];
				state.newTiles[tile.x+"x"+tile.y] = {};
				state.newTiles[tile.x+"x"+tile.y].x = tile.x;
				state.newTiles[tile.x+"x"+tile.y].y = tile.y;
				state.newTiles[tile.x+"x"+tile.y].type = tile.type;
			}
		}

		if(this.map.pendingTakenPowerUps.length){
			state.powerUps = {};
		}

		for(var tiles in this.map.pendingTakenPowerUps){
			if(this.map.pendingTakenPowerUps.hasOwnProperty(tiles)){
				var pUp = this.map.pendingTakenPowerUps[tiles];
				state.powerUps[pUp.x+"x"+pUp.y] = {};
				state.powerUps[pUp.x+"x"+pUp.y].x = pUp.x;
				state.powerUps[pUp.x+"x"+pUp.y].y = pUp.y;
				state.powerUps[pUp.x+"x"+pUp.y].player = pUp.player;
				state.powerUps[pUp.x+"x"+pUp.y].justTaken = pUp.justTaken;
			}
		}

		for(var i = 0; i < this.map.pendingTakenPowerUps.length; i++){
			if(this.map.pendingTakenPowerUps[i].justTaken){
			//	console.log("new pup: "+state.powerUps[tile.x+"x"+tile.y].x+", "+state.powerUps[tile.x+"x"+tile.y].y);
			}
			this.map.pendingTakenPowerUps[i].justTaken = false;
		}

		if(this.map.pendingTakenPowerUps.length >= 3){
			this.map.pendingTakenPowerUps.splice(0,1);
		}

	    if(this.map.pendingChangedTiles.length>=100){
			  this.map.pendingChangedTiles.splice(0, 1);
	    }

/*	    if(this.map.pendingAddedTiles.length>=30){
			  this.map.pendingAddedTiles.splice(0, 1);
	    }*/

	    this.map.pendingAddedTiles = [];
	    if(this.map.pendingDrops.length>=100){
			  this.map.pendingDrops.splice(0, 1);
	    }	    

		state.serverTime = serverTime;
		state.serverDeltaTime = this.localDeltaTime;
		this.lastState = state;

		var serializedState = JSON.stringify(state);

		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){
				this.players[playerid].socket.emit('onServerUpdate', serializedState);
			}
		}
	}

	GenerateDrop(tilePos, type){

	}


	ServerHandleInput(client, data){
		this.players[client.userid].ServerStoreInput(data);
	}

	ServerHandleButtonInput(client, data){
		this.players[client.userid].ServerButtonInput(data);
	}

	ClientUpdate(deltaTime){	
		//process server messages
		this.selfPlayer.ClientProcessInputs(this.socket, this.localTime);
		this.selfPlayer.Update(this.localDeltaTime);
		this.map.Update(this.localDeltaTime);
		this.ClientProcessNetUpdates();
	}

	ClientEntityInterpolation(){
		var now = new Date();
		//position on timeline (refer to that clarifier drawing to understand this)
		var timeStamp = now - (1/serverUpdatesPerSecond)*1000.0; //*1000 = in milliseconds

		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){
				if(this.selfPlayer.id != playerid && !this.players[playerid].dead){

					var buffer = this.players[playerid].positionBuffer;
					if(buffer.length > 1){
					
						//find positions that match our time on the timeline
						var target;
						var previous;
						var deleteUntil = 0;
						for(var i = 0; i < buffer.length-1; i++){
							if(timeStamp > buffer[i].timeStamp && timeStamp < buffer[i+1].timeStamp){
								target = buffer[i+1];
								previous = buffer[i];
								deleteUntil = i;
								break;
							}
						}
						this.players[playerid].positionBuffer.splice(0, deleteUntil);

						if(target && previous){
							//timepoint = how far in between 
							var difference = target.timeStamp - timeStamp;
							var maxDifference = target.timeStamp - previous.timeStamp;
							var timePoint = difference/maxDifference;


							var serverTimePos = {x: this.players[playerid].pos.x, y: this.players[playerid].pos.y};
							serverTimePos.x = Phaser.Math.linear(previous.pos.x, target.pos.x, timePoint);
							serverTimePos.y = Phaser.Math.linear(previous.pos.y, target.pos.y, timePoint);

							//since this is only rendering the player as it was exactly milliseconds ago on the server
							//(with all the net bumps and jumps) we add some smoothing here

							//smoothing
							if(this.clientSmoothing > 0 && this.localDeltaTime < 0.10){
								var smoothedPos = {};
//								console.log(this.localDeltaTime+"*"+this.clientSmoothing+" = "+this.localDeltaTime*this.clientSmoothing);
								smoothedPos.x = Phaser.Math.linear(this.players[playerid].pos.x, serverTimePos.x, this.localDeltaTime*this.clientSmoothing);
								smoothedPos.y = Phaser.Math.linear(this.players[playerid].pos.y, serverTimePos.y, this.localDeltaTime*this.clientSmoothing);
								this.players[playerid].SetPosition(smoothedPos);
							}
							else{
								this.players[playerid].SetPosition(serverTimePos);						
							}
						}		
					}			
				}
			}
		}
	}

	ClientProcessNetUpdates(){	//called on the update loop
		if(this.serverUpdates.length){
			var state = this.serverUpdates[this.serverUpdates.length-1];
	//		console.log("Server update: "+state[this.selfPlayer.id].pos.x+", "+state[this.selfPlayer.id].pos.y);
			var debugPos = state[this.selfPlayer.id].pos;

			if(debugDrawing){
				this.selfPlayer.SetServerPosition(debugPos);
			}

			if(this.selfPlayer.healthPoints > state[this.selfPlayer.id].healthPoints){
			  if(emitter == null){
				  CreateEmitter(1);
		  	  }

			  setTimeout(
				  ParticleBurst.bind(this, 1, this.selfPlayer.pos, 10), 100
			  );

			  game.camera.shake(0.005, 100);

			}
			this.selfPlayer.healthPoints = state[this.selfPlayer.id].healthPoints;

			if(this.selfPlayer.healthPoints <= 0 && !this.selfPlayer.dead){
				this.selfPlayer.KillPlayer(state[this.selfPlayer.id].lastPersonWhoHit);
			}

			if(this.selfPlayer.powerUp){
				if(!this.selfPlayer.powerUp.active && state[this.selfPlayer.id].usePowerUp){
					this.selfPlayer.powerUp.Use();
				}
			}

			for(var playerid in this.players){
				if(this.players.hasOwnProperty(playerid) && typeof(state[playerid]) != "undefined"){
					if(typeof(state[playerid]) == "undefined"){
//						console.log(state);
					}

					if(this.players[playerid].healthPoints > state[playerid].healthPoints && state[playerid].lastPersonWhoHit != this.selfPlayer.id){
					  if(emitter == null){
						  CreateEmitter(1);
				  	  }

			  			setTimeout(
					  		ParticleBurst.bind(this, 1, this.players[playerid].pos, 10), 100
				  		);						
					}

					var hp = state[playerid].healthPoints;
					this.players[playerid].healthPoints = hp;
	//				console.log("Health: "+this.players[playerid].healthPoints);

					if(this.players[playerid].healthPoints <= 0 && !this.players[playerid].dead){
						this.players[playerid].KillPlayer(state[playerid].lastPersonWhoHit);
					}
				}

				if(this.players[playerid].dead && !state[playerid].dead){
					this.players[playerid].SetUpParameters(this.players[playerid].pos, playerid);
				}
			}			

			if(this.entityInterpolation){
				this.ClientEntityInterpolation();
			}
			else{
				for(var playerid in this.players){
					if(this.players.hasOwnProperty(playerid) && playerid != this.selfPlayer.id){
						this.players[playerid].SetPosition(state[playerid].pos);
					}
				}
			}

			var serverChangedTiles = state.tilesState;

			if(serverChangedTiles){
				//console.log(serverChangedTiles);
			}

			for(var tile in serverChangedTiles){
				if(serverChangedTiles.hasOwnProperty(tile)){
					var rTile = serverChangedTiles[tile];
					if(rTile.hp <= 0){
						var type = rTile.drop;
						var dropPos = {x: rTile.x, y: rTile.y};
						if(rTile.justDied){
							if(this.map.RemoveTile(rTile.x, rTile.y)){
								this.map.AddDrop(this, dropPos, type);
							}
						}
					}

					if(rTile.attacker)
					if(rTile.attacker !== this.selfPlayer.id){
						if(rTile.hp <= 0 && rTile.justDied || rTile.hp > 0){
							if(emitterTiles == null){
								CreateEmitter(2);
							}
//							console.log("hp "+rTile.hp);
							setTimeout(
								ParticleBurst.bind(this, 2, {x: rTile.x, y: rTile.y}, 5), 100
							);
						}
					}
					
				}
			}

			var serverAddedTiles = state.newTiles;

			for(var tile in serverAddedTiles){
				if(serverAddedTiles.hasOwnProperty(tile)){
					var newTile = serverAddedTiles[tile];
//					console.log("put tile");
				//	this.map.PutTile(newTile.x, newTile.y, newTile.type);
				}
			}

			var serverRemovedDrops = state.dropsState;

			for(var drops in serverRemovedDrops){
				if(serverRemovedDrops.hasOwnProperty(drops)){
					var drop = serverRemovedDrops[drops];

//					console.log("drop: "+drop.x+", "+drop.y);
					if(this.map.drops[drop.x][drop.y]){
						this.map.RemoveDrop(null, {x: drop.x, y: drop.y});						
					}
				}
			}

			var serverTakenPowerUps = state.powerUps;

			for(var pUps in serverTakenPowerUps){
				if(serverTakenPowerUps.hasOwnProperty(pUps)){
					var pUp = serverTakenPowerUps[pUps];
					var id = pUps;
//					console.log(pUps);
					if(pUp.justTaken){
//						console.log("theres new power up: "+id);
					}

					for(var i = 0; i < this.map.powerUps.length; i++){
//						console.log("pup");
//						console.log("client powerup: "+this.map.powerUps[i].id);
						if(this.map.powerUps[i].id == id && pUp.justTaken){
							if(this.selfInstance){
								this.map.powerUps[i].Take(pUp.player);
							}
							else{
								this.map.powerUps[i].End();
							}
							break;
						}
					}
				}
			}
		}
	}

	ClientOnServerUpdate(data){	//call when reciving a server message, not on the update loop
		var state = JSON.parse(data);
		this.serverUpdates.push(state);

		if(this.selfPlayer.dead && !state[this.selfPlayer.id].dead){
//				console.log("net revived position: "+state[this.selfPlayer.id].pos.x+", "+state[this.selfPlayer.id].pos.y);
				this.selfPlayer.SetUpParameters(state[this.selfPlayer.id].pos, this.selfPlayer.id);
		}

//		console.log(state);
		var lastState = this.serverUpdates[this.serverUpdates.length-1];
//		console.log(lastState[this.selfPlayer.id].pos.x+", "+lastState[this.selfPlayer.id].pos.y);

		this.selfPlayer.ClientServerReconciliation(lastState);
		
		if(this.entityInterpolation){
			for(var playerid in this.players){
				if(this.players.hasOwnProperty(playerid)){
					if(this.selfPlayer.id != playerid){
						var time = new Date();	//we need the positions and their date for interpolation
						this.players[playerid].positionBuffer.push({pos: state[playerid].pos, timeStamp: time});
					}
				}
			}
		}
		if(this.serverUpdates.length >= 30){
			this.serverUpdates.splice(0, 1);
		}
	}

	ClientPlayerStart(clientId){
		if(this.selfPlayer.id == clientId){
			this.selfPlayer.SetUpParameters(this.selfPlayer.pos, clientId);
		}
		else{
			this.players[clientId].SetUpParameters(this.players[clientId].pos, clientId);	
		}
	}

	ClientAddPlayer(clientId){
		if(this.playerCount == 0){
			this.selfPlayer = new Player(this, null, true);
			this.selfPlayer.SetUpParameters(this.selfPlayer.pos, clientId);
			this.selfInstance = true;
//			console.log("Your player was created. You are: "+clientId);
		}
		else{
			this.players[clientId] = new Player(this, null, false);
			this.players[clientId].SetUpParameters(this.players[clientId].pos, clientId);
//			console.log("Player "+clientId+" created");

			if(this.active){
				this.players[clientId].CreateSprite();
			}
		}

		this.playerCount++;
	}

	ClientOnGameStart(data){
		var parsedData = JSON.parse(data);
		this.active = true;
		var tilemap = parsedData.tileMap;
//		console.log(tilemap);
		this.map = new Map(this, tilemap);
		this.selfPlayer.pos = parsedData[this.selfPlayer.id];

//		console.log(this.destination.x+", "+this.destination.y);
		this.selfPlayer.CreateSprite();

		for(var playerId in this.players){
			if(this.players.hasOwnProperty(playerId)){
//				console.log(playersPositions[playerId]);
				this.players[playerId].pos = parsedData[playerId];
				this.players[playerId].CreateSprite();
			}
		}

		this.Update();
	}

	ClientConnectToServer(){
   //     console.log("pos");
		this.socket = io.connect();

		this.socket.on('connect', function(){
			this.selfPlayer.state = 'connecting';
//			console.log("Connecting...");
		}.bind(this));

		this.socket.on('onConnected', this.ClientOnConnected.bind(this));
		this.socket.on('message', this.ClientOnMessage.bind(this));
		this.socket.on('onServerUpdate', this.ClientOnServerUpdate.bind(this));

	}

	ClientOnMessage(data){
		var messageParts = data.split('.');
//		console.log('Message parts: ' + messageParts);
		var command = messageParts[0];
		var commandData = messageParts[1] || null;	//if there's not command data in the string, set it to null
		switch(command){
			case 'j':
				this.ClientOnJoin(commandData);
				break;
			case 's':
				this.ClientOnGameStart(commandData);
				break;
			case 'h':
				this.ClientOnHost(commandData);
				break;
			case 'l':
				this.ClientOnLeft(commandData);
		}
	}

	ClientOnJoin(data){
		var ids = data.split(',');
		for(var i = 0; i < ids.length; i++){
			this.ClientAddPlayer(ids[i]);
		}
	}

	ClientOnLeft(data){
		var id = data;
		this.playerCount--;
		this.players[id].RemoveSprite();
		delete this.players[id];
//		console.log("Player "+id+" left");
	}


	ClientOnHost(data){
//		console.log("You're the host");
		this.selfPlayer.host = true;
	}

	ClientOnConnected(data){
		document.getElementById("playButton").addEventListener('click', function(){
			console.log("pulsado");
			this.socket.send('b.s.');
		}.bind(this));
		console.log("You connected");
//		this.selfPlayer.state = ''
//		this.selfPlayer.state = 'connected';
//		this.selfPlayer.online = true;
	}

}



if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = GameCore;	
}