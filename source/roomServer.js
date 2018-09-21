var uuid = require('node-uuid');
var verbose = true;
var gameCore = require('./gameCore.js');	//gameLogic on both client and server
var gameServer = require('./gameServer.js');	//receives and manages messages from clients
var Stack = require('stackjs');

function hexToRgbA(hex, alpha){
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
    	var col = "rgb(" + r + ", " + g + ", " + b +", " + "1" + ")";
        return col;
    }
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

class GameRoom{
	constructor(client){
		this.roomid = uuid(); 			//room id
		console.log("Room id: "+this.roomid);
		client.room = this;
		this.playerLimit = 50;		//max players in the room
		this.playerClients = {}; 	//create players in this array for clients who join
		this.playerCount = 0;		//there's no players on the playerClients hashmap yet
		this.clientCount = 1;
		this.active = false;
		this.minPlayers = 1;		//player minimum to start the game
		var preColors = ["#bc4df0", "#412270", "#d3ffa3", "#1a7280", "#d0ff00", "#940065", "#516fe8", "#ffee00", "#8eb6e8",
		"#a6f8ff", "#384525", "#c9cc29", "#ab4d55", "#59bfff","#000000","#98a65a","#6b5600", "#ffc44c", "#452525", "#5accbd", 
		"#9c9100", "#703467", "#b37272", "#5aa61f", "#8e00c2", "#0c0075", "#ff8040", "#f3a3ff", "#7a4312", "#ff00d9", 
		"#802626", "#e3a300", "#60e851", "#7091ba", "#b05720", "#597322", "#35525e", "#808080", "#ff99c9", "#520d3c",
		"#2f48ad", "#875be8", "#604c7d", "#a18d62", "#4d539e", "#f2d491", "#f04d8b", "#8affc4", "#cc1414"];
		shuffleArray(preColors);		
		var colors = ["#FFFFFF"].concat(preColors);



		this.teamColors = new Stack();
		for(var i = 0; i < colors.length; i++){
			this.teamColors.push(hexToRgbA(colors[i]));
		}

		this.clientTeamColors = this.teamColors._elements.slice(0);
			console.log("colors: " +this.clientTeamColors.length);

		this.game = new gameCore(this);
		this.gameServer = new gameServer(this);

//		this.AddPlayer(client);
	}

	AddPlayer(newClient){	//this adds clients to playerClients and 
		if(this.playerCount == 0){
			this.playerHost = newClient;	//first client is the host
			this.playerHost.send('h.'+this.playerHost.userid);
		}
		newClient.room = this;
		this.playerClients[newClient.userid] = newClient;
		this.playerCount++;
		console.log("Player count: "+this.playerCount);
	
		if(this.game !== null){
			this.game.ServerAddPlayer(newClient);
			console.log("Player joined with id "+this.game.players[newClient.userid].id);
		}

		this.OnPlayerJoin(newClient);

		if(this.playerCount == this.minPlayers && !this.active){
			console.log("game starts");
			this.StartGame();
		}
	}

	GameStartRequest(client){
		if(!this.game.players[client.userid]){
			this.AddPlayer(client);
		}
	}

	ReviveRequest(client){
		if(this.game.players[client.userid].dead){
		}
	}
	
	OnPlayerJoin(client){	//send the ids of existing and new players to those
		if(this.playerCount > 1){	//if this isn't the first player who joins (host)
			
			var state;
			var playerColors = new Array();
			
			//first notify other players in the array that this new client joined passing them its id
			var newClientColor = this.teamColors.pop();
			playerColors.push(newClientColor);
			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					if(this.playerClients[playerId].userid !== client.userid){
						state = {};
						state.ids = client.userid;
						console.log(newClientColor+" to previous players");
						state.teamColors = playerColors;
						var send = JSON.stringify(state);
						this.playerClients[playerId].send('j.'+send);
					}
				}
			}
			//now pass this client all the ids, first one will be its own one
			state = {};
			var existingIds = client.userid;
//			playerColors = [];
//			playerColors.push(this.teamColors.pop());
			client.teamColor = playerColors[0];
			var counter = 0;
			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					if(this.playerClients[playerId].userid !== client.userid){
						existingIds = existingIds +","+this.playerClients[playerId].userid;
						playerColors.push(this.game.players[playerId].teamColor);
						counter++;
					}
				}
			}
			state.ids = existingIds;
			state.teamColors = playerColors;
			console.log(playerColors+" to new player");
			var send = JSON.stringify(state);
			client.send('j.'+send);
			if(this.active){
				this.StartGame(client);
			}
		}
		else{	//it's just the first player (host) so nothing else needed
			var state = {};
			var playerColors = [];
			playerColors.push(this.teamColors.pop());
			state.ids = client.userid;
			state.teamColors = playerColors;
			client.teamColor = playerColors[0];
			console.log(playerColors+" first player");
			var send = JSON.stringify(state);
			client.send('j.'+send);
		}
	}


	RemovePlayer(client){
		if(this.game.players[client.userid]){
			var color = this.game.players[client.userid].teamColor;
			this.teamColors.push(color);

			if(this.game.players[client.userid].pObject){
				this.game.pWorld.remove(this.game.players[client.userid].pObject);
			}

			this.game.map.PlayerLeft(client.userid);

			if(this.playerHost.userid === client.userid){	//host left so we gotta set the next player to host
				var newhost = false;

				for(var player in this.playerClients){
					if(this.playerClients.hasOwnProperty(player)){
						if(this.playerClients[player]){

							this.playerClients[player].send('l.'+client.userid);	//l for client who left + his id					
								
							if(!newhost){
								newhost = true;
								this.playerHost = this.playerClients[player];
								console.log("New host: "+this.playerHost.userid+".");
								this.playerHost.send('h.'+this.playerHost.userid);
							}
						}
					}
				}
			}
			else{	//only a regular client left
				for(var player in this.playerClients){
					if(this.playerClients.hasOwnProperty(player)){
						this.playerClients[player].send('l.'+client.userid);
					}
				}
			}
			this.playerCount--;
			if(this.playerCount < this.minPlayers){
			//	this.EndGame();
			}
		}
		delete this.playerClients[client.userid];



		console.log("Player count: "+ this.playerCount+".");
	}

	StartGame(newPlayer){
		var playersState = {};	
		if(!this.active){
			this.active = true;
			this.game.ServerStartGame();
		}

			console.log("colors: " +this.clientTeamColors.length);
		if(!newPlayer){	//if no new player is specified then its the first players needed for the game to start
		
			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					//get every player's starting position
					var cords = {};
					var color = this.playerClients[playerId].teamColor;
					console.log(color);
					cords.x = Math.floor(Math.random()*(40));
					cords.y = Math.floor(Math.random()*(40));
					this.game.players[playerId].teamColor = color;

					this.game.players[playerId].pos = cords;
					this.game.players[playerId].destination = cords;
					this.game.players[playerId].lastTile.x = cords.x
					this.game.players[playerId].lastTile.y = cords.y
					this.game.players[playerId].SetUpParameters(cords, playerId);
					playersState[playerId] = this.game.players[playerId].pos;
					playersState[playerId].teamColor = color;
					playersState.teamColors = this.clientTeamColors;
					
					this.game.map.RemoveTile(cords.x, cords.y, null, true);
					playersState.tileMap = this.game.map.tileMap;
				}
			}

		//console.log(playersState.tileMap.width);
			playersState = JSON.stringify(playersState);
//			console.log("positions: "+playersState);

			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					//we send all every starting position
					this.playerClients[playerId].send('s.'+playersState);
				}
			}
		}
		else{
			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					//get every player's starting position
					playersState[playerId] = this.game.players[playerId].pos;
				}
			}

			var color = newPlayer.teamColor;
			console.log(color);
			var cords = {};
			cords.x = Math.floor(Math.random()*(40));
			cords.y = Math.floor(Math.random()*(40));
			this.game.players[newPlayer.userid].pos = cords;
			this.game.players[newPlayer.userid].teamColor = color;
			this.game.players[newPlayer.userid].destination = cords;
			this.game.players[newPlayer.userid].lastTile.x = cords.x;
			this.game.players[newPlayer.userid].lastTile.y = cords.y;
			this.game.players[newPlayer.userid].SetUpParameters(cords, playerId);
			playersState[newPlayer.userid] = this.game.players[newPlayer.userid].pos;
			playersState[newPlayer.userid].teamColor = color;
			playersState.teamColors = this.clientTeamColors;
			
			this.game.map.RemoveTile(cords.x, cords.y, null, true);
			playersState.tileMap = this.game.map.tileMap;

			playersState = JSON.stringify(playersState);
			newPlayer.send('s.'+playersState);
		}
	}

	EndGame(){
		this.active = false;
		this.game.active = false;
	}
}

var RoomServer = module.exports = {roomCount : 0, rooms : {}};

	RoomServer.log = function(){
		if(verbose){
			console.log.apply(this, arguments);
		}
	}

	RoomServer.FindRoom = function(client){
		this.log('There are '+this.roomCount+ " game rooms");
		var logged = false;
		if(this.roomCount < 1){	//there are no rooms made
			this.log("No rooms found, creating new room");
			this.CreateRoom(client);
			logged = true;
		}else{
			for(var roomid in this.rooms){
				if(this.rooms.hasOwnProperty(roomid)){
					if(this.rooms[roomid]){
						if(this.rooms[roomid].clientCount < this.rooms[roomid].playerLimit){	//if this room isnt full
							this.log("Entering room "+this.rooms[roomid].roomid+"");
							this.rooms[roomid].clientCount++;
							client.room = this.rooms[roomid];
							//this.rooms[roomid].AddPlayer(client);
							logged = true;
						}
					}
				}
				if(logged){
					break;
				}
			}
			if(!logged){	//rooms found but all were full
				this.log("All rooms are full, creating new room");
				this.CreateRoom(client);
			}

			//HERE WE NOTIFY THE PLAYERS WHO JOINED

		}
	}

	RoomServer.CreateRoom = function(host){
		var gameRoom = new GameRoom(host);
		this.rooms[gameRoom.id] = gameRoom;
		this.roomCount++;

//start updating the game:
//		gameRoom.game
//tell the client they're hosting now. s for server, h for hosting, followed by a string with the date
	}

	RoomServer.DeleteRoom = function(room){
		delete this.rooms[room.id];
		this.roomCount--;
	}

	RoomServer.OnMessage = function(socket, message){
		socket.room.gameServer.OnMessage(socket, message);
	}

	RoomServer.Disconnect = function(client){
		client.room.RemovePlayer(client);
		if(client.room.playerCount == 0){
			this.DeleteRoom(client.room);
		}
	}


//module.exports = RoomServer;