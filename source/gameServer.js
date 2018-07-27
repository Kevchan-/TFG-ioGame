var UUID = require('node-uuid');
var verbose = true;



class GameServer{	//receive and handle messages from the client
	constructor(room){
		this.room = room;
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
			case 'b':
				this.OnButtonPushed(socket, data);
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
//		console.log(data);
	}

	OnButtonPushed(client, data){
		var messageParts = data.split('.');
		var type = messageParts[0];
		if(type=="s"){
			this.room.GameStartRequest(client);
		}
		else if(type=="r"){
			client.room.game.ServerRevivePlayer(client.userid);
		}
		else{
			var game = client.room.game;
			game.ServerHandleButtonInput(client, data);
		}
	}


	ValidateInput(input){
		return(true);
	}

}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = GameServer;	
}