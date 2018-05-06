var UUID = require('node-uuid');
var verbose = true;



class GameServer{	//receive and handle messages from the client
	constructor(gameInstance){
		this.game = gameInstance;
		console.log("Game Server Created");
	}


	OnMessage(socket, message){
		var messageParts = message.split('.');
		var messageType = messageParts[0];
		var data = messageParts[1];

		switch(messageType){
			case 'i':
//				console.log("Messageparts: " +messageParts[1]);
				this.OnInputReceived(socket, data);
				break;
			case 'p':
				console.log("P received");
				break;
			default:
				break;
		}
	}


	OnInputReceived(client, data){
		var game = client.room.game;
		if(this.ValidateInput(data)){
			game.ServerHandleInput(client, data);
		}
		var input = JSON.parse(data);
//		console.log(data);
	}


	ValidateInput(input){
		return(true);
	}

}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = GameServer;	
}