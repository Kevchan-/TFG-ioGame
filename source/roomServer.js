var uuid = require('node-uuid');
var verbose = true;
var gameCore = require('./gameCore.js');	//gameLogic on both client and server
var gameServer = require('./gameServer.js');	//receives and manages messages from clients

class GameRoom{
	constructor(client){
		this.roomid = uuid(); 			//room id
		console.log("Room id: "+this.roomid);
		client.room = this;
		this.playerHost = client;	//first client is the host
		this.playerLimit = 3;		//max players in the room
		this.playerClients = {}; 	//create players in this array for clients who join
		this.playerCount = 0;		//there's no players on the playerClients hashmap yet
		this.active = false;
		this.minPlayers = 1;		//player minimum to start the game

		this.game = new gameCore(this);
		this.gameServer = new gameServer(this);

		this.AddPlayer(client);
		this.playerHost.send('h.'+this.playerHost.userid);
	}

	AddPlayer(newClient){	//this adds clients to playerClients and 
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
	
	OnPlayerJoin(client){	//send the ids of existing and new players to those
		if(this.playerCount > 1){	//if this isn't the first player who joins (host)
			
			//first notify other players in the array that this new client joined passing them its id
			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					if(this.playerClients[playerId].userid !== client.userid){
						this.playerClients[playerId].send('j.'+client.userid);
					}
				}
			}
			//now pass this client all the ids, first one will be its own one
			var existingIds = client.userid;
			var counter = 0;
			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					if(this.playerClients[playerId].userid !== client.userid){
						existingIds = existingIds +","+this.playerClients[playerId].userid;
						counter++;
					}
				}
			}
			client.send('j.'+existingIds);
			if(this.active){
				console.log("3d player starting");
				this.StartGame(client);
			}
		}
		else{	//it's just the first player (host) so nothing else needed
			client.send('j.'+client.userid);
		}
	}


	RemovePlayer(client){

		if(this.playerHost.userid === client.userid){	//host left so we gotta set the next player to host

			delete this.playerClients[client.userid];

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
			delete this.playerClients[client.userid];
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
		console.log("Player count: "+ this.playerCount+".");
	}

	StartGame(newPlayer){
		var playersState = {};
		playersState.tileMap = this.game.map.tileMap;

		if(!newPlayer){	//if no new player is specified then its the first players needed for the game to start
			this.active = true;
			this.game.ServerStartGame();

			for(var playerId in this.playerClients){
				if(this.playerClients.hasOwnProperty(playerId)){
					//get every player's starting position
					var cords = {};
					cords.x = Math.floor(Math.random()*(20));
					cords.y = Math.floor(Math.random()*(20));
					this.game.players[playerId].pos = cords;
					this.game.players[playerId].destination = cords;
					this.game.players[playerId].lastTile.x = cords.x
					this.game.players[playerId].lastTile.y = cords.y
					this.game.players[playerId].SetUpParameters(cords, playerId);
					playersState[playerId] = this.game.players[playerId].pos;
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

			var cords = {};
			cords.x = Math.floor(Math.random()*(20));
			cords.y = Math.floor(Math.random()*(20));
			this.game.players[newPlayer.userid].pos = cords;
			this.game.players[newPlayer.userid].destination = cords;
			this.game.players[newPlayer.userid].lastTile.x = cords.x;
			this.game.players[newPlayer.userid].lastTile.y = cords.y;
			this.game.players[newPlayer.userid].SetUpParameters(cords, playerId);
			playersState[newPlayer.userid] = this.game.players[newPlayer.userid].pos;
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
						if(this.rooms[roomid].playerCount < this.rooms[roomid].playerLimit){	//if this room isnt full
							this.log("Entering room "+this.rooms[roomid].roomid+"");
							this.rooms[roomid].AddPlayer(client);
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