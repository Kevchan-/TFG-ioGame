var serverUpdatesPerSecond = 20;	//on server we update preferiby 20 times per second

if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser	
	var PlayerObject = require('./player.js');
	var GameMap = require('./map.js');
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
	var game = new Phaser.Game(width, height, Phaser.WEBGL, '', { preload: Preload, create: Create }, false, false);
	
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

		this.active = false;

//		console.log("Game created");

		if(this.room){	//only when created on the server are we given a room on constructor
			this.server = true;
		}

		if(this.server){
			this.map = new GameMap("map100x100", true);
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

	ServerUpdate(){
		var serverTime = this.localTime;
		var state = {};

		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){
				this.players[playerid].ServerProcessInputs();
				this.players[playerid].UpdatePhysics(this.localDeltaTime);

				state[playerid] = {};
				state[playerid].pos = this.players[playerid].pos;
				state[playerid].destination = this.players[playerid].destination;
				state[playerid].moving = this.players[playerid].moving;
				state[playerid].reached = this.players[playerid].reached;			
				state[playerid].hitting = this.players[playerid].hitting;			
				state[playerid].inputSequence = this.players[playerid].lastInputSequenceNumber;
						//		console.log("Server update: "+state[playerid].pos.x+", "+state[playerid].pos.y);
//				if(state[playerid].reached){
//				}
//		console.log("Reached: "+state[playerid].reached);
			}
		}

		if(this.map.pendingChangedTiles.length)
			state.tilesState = {};

		for(var tiles in this.map.pendingChangedTiles){
			if(this.map.pendingChangedTiles.hasOwnProperty(tiles)){
				var tile = this.map.pendingChangedTiles[tiles];
				state.tilesState[tile.x+"x"+tile.y] = {};
				state.tilesState[tile.x+"x"+tile.y].x = tile.x;
				state.tilesState[tile.x+"x"+tile.y].y = tile.y;
				state.tilesState[tile.x+"x"+tile.y].hp = tile.hp;
				state.tilesState[tile.x+"x"+tile.y].drop = "no";
			}
		}


	    if(this.map.pendingChangedTiles.length>=3){
			  this.map.pendingChangedTiles.splice(0, 1);
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


	ServerHandleInput(client, data){
		this.players[client.userid].ServerStoreInput(data);
	}

	ClientUpdate(deltaTime){	
		//process server messages
		this.selfPlayer.ClientProcessInputs(this.socket, this.localTime);
		this.selfPlayer.UpdatePhysics(this.localDeltaTime);
		this.ClientProcessNetUpdates();

	}

	ClientEntityInterpolation(){
		var now = new Date();
		//position on timeline (refer to that clarifier drawing to understand this)
		var timeStamp = now - (1/serverUpdatesPerSecond)*1000.0; //*1000 = in milliseconds

		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){
				if(this.selfPlayer.id != playerid){

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
						this.map.RemoveTile(rTile.x, rTile.y);
					}
				}
			}
		}
	}

	ClientOnServerUpdate(data){	//call when reciving a server message, not on the update loop
		var state = JSON.parse(data);
		this.serverUpdates.push(state);

//		console.log("Update received: "+state[this.selfPlayer.id].pos.x+", "+state[this.selfPlayer.id].pos.y);
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

	ClientAddPlayer(clientId){
		if(this.playerCount == 0){
			this.selfPlayer = new Player(this, null, true);
			this.selfPlayer.id = clientId;
//			console.log("Your player was created. You are: "+clientId);
		}
		else{
			this.players[clientId] = new Player(this, null, false);
			this.players[clientId].id = clientId;
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
		this.map = new Map(tilemap);
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
//		console.log("You connected");
//		this.selfPlayer.state = ''
//		this.selfPlayer.state = 'connected';
//		this.selfPlayer.online = true;
	}

}

if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = GameCore;	
}