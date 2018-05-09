var tileSize = 16;

class Player{
	constructor(game, client, isSelf){
		this.socket = client;
		this.game = game;
		this.host = false;
		this.server = false;
		this.id = "";
		this.sprite = {};	//clientside only
		this.serverSprite = {};		//debug server sprite position
		this.inputs = [];	//serverside
		this.pendingInputs = [];	//inputs for when we reconciliate with server, clientside only
		this.pendingIterationDeltaTimes = [];	//for reconciliation. Since we don't store inputs that don't change the destination tile, we need to store the deltaTimes of every iteration here
		this.positionBuffer = [];	//clientside, save previous positions here for interpolation
		this.lastInputSequenceNumber = 0;
		this.isSelf = isSelf;
		this.state = 'not connected';	
		this.test = 0;

		if(this.socket){
			console.log("Player created in server");
			this.id = client.userid;
			this.lastInputSequenceNumber = -1;
			this.server = true;
		}else{
			console.log("Player created");
		}
		
		this.pos = {
			x: 0,
			y: 0
		};
		
		console.log("Position: "+this.pos.x+", "+this.pos.y);

		this.destination = {	//the tile we're moving to, if we moving
			x: 0,
			y: 0
		};

		this.size = {
			x: tileSize,
			y: tileSize
		};

		this.moving = false;	//if traveling to the destination tile
		this.speed = 5;			//how much time it takes to move from tile to tile
	}

	ServerStoreInput(data){
		var data = JSON.parse(data);
		var input = {};
		input.timeStamp = data.timeStamp.replace(",",".");
//		console.log(input.timeStamp);
		input.key = data.key;
		input.sequenceNumber = data.sequenceNumber;
		this.inputs.push(input);
	}

	//process messages from server reggarding our position. do server reconciliation
	ClientServerReconciliation(netUpdates){
		//test on net
	
		var latestUpdate = netUpdates[netUpdates.length-1];
		var myServerPos = latestUpdate[this.id].pos;
		var serverSequence = latestUpdate[this.id].inputSequence;	

		var auxPos = this.pos;	//to check if positions match after the reconciliation


		var i = 0;
		while(i < this.pendingInputs.length){
			if(this.pendingInputs[i].sequence >= serverSequence && this.pendingInputs[i].reached){
				this.pos = myServerPos;
				this.moving = latestUpdate[this.id].moving;
				this.destination = latestUpdate[this.id].destination;				

				var input = this.pendingInputs[i];
				this.ApplyInput(input);
				//get delta time
				for(var j = 0; j < this.pendingIterationDeltaTimes[input.sequence].length; j++){
					var deltaTime = this.pendingIterationDeltaTimes[input.sequence][j];
					this.UpdatePhysics(deltaTime);
					i++;					
				}

			}
			else{
				this.pendingInputs.splice(i, 1);
			}
		}

	//	console.log("Client position: "+auxPos.x+", "+auxPos.y);
	//	console.log("Reconc position: "+this.pos.x+", "+this.pos.y);
	}

	ClientProcessInputs(socket, time){	//we check the current inputs to store them for later reconciliation and send them to the server right now
		//if we have cliendside prediction enabled we'll move the char as we check the inputs right here
		var now = new Date().getTime()/1000.0;
		var deltaTime = now - this.lastUpdateTime || now; //if lastupdatetime doesn't exist yet just use the current date
		this.lastUpdateTime = now;

		var input = {};
		input.key = "n";

		if(game.input.activePointer.isDown){
			input.key = 'd';
		}
		else{
			if(upKey.isDown){
				input.key = 'u';
			}
			else if(rightKey.isDown){
				input.key = 'r';
			}
			else if(downKey.isDown){
				input.key = 'd';
			}
			else if(leftKey.isDown){
				input.key = 'l';
			}			
		}


		var newDestination = this.ApplyInput(input);

		if(newDestination){
			input.sequenceNumber = this.lastInputSequenceNumber;
			this.lastInputSequenceNumber++;

			input.id = this.id;
			input.timeStamp = time.toString().replace(".", ",");

			var serialized = JSON.stringify(input);
			serialized = "i."+serialized;
			this.game.socket.send(serialized);
			this.pendingInputs.push(input);
		}
	}

	ServerProcessInputs(){
		var input = {};
		input.key = "n";

		var now = new Date().getTime()/1000.0;
		var deltaTime = now - this.lastUpdateTime || now; //if lastupdatetime doesn't exist yet just use the current date
		this.lastUpdateTime = now;	

		var numberOfInputs = this.inputs.length;

		if(numberOfInputs){
			for(var i = 0; i < numberOfInputs; i++){
				if(this.inputs[i].sequenceNumber > this.lastInputSequenceNumber){
					input.key = this.inputs[i].key;
					var newDestination = this.ApplyInput(input);
					if(newDestination){
						this.lastInputSequenceNumber = this.inputs[i].sequenceNumber;
						this.inputs.splice(0, i+1);						
					}
					break;
				}
			}
		}		
	}


	ApplyInput(input){
		var newDestination = false;
		if(this.moving){
			if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){	//if we already reached 
				this.reached = true;
				this.moving = false;	//then don't move at all this frame and mark as not moving
				if(input.key !== "n"){	//check for input the same frame so that we don't stop
					this.destination = this.GetDestination(input.key);
					this.moving = true;
					newDestination = true;
				}				
			}
			else{	//we not there
				this.reached = false;
			}
		}
		else{
			if(input.key !== "n"){	//if we're not moving check for input that tells us to move
				this.destination = this.GetDestination(input.key);
				this.moving = true;
				newDestination = true;
			}
		}
		return(newDestination);
	}


	UpdatePhysics(deltaTime){
		if(this.moving){
			this.MoveToTile(this.destination, deltaTime);
			//store the deltaTimes for server reconciliation
			if(!this.pendingIterationDeltaTimes[this.lastInputSequenceNumber]){
				this.pendingIterationDeltaTimes[this.lastInputSequenceNumber] = [];
			}
			this.pendingIterationDeltaTimes[this.lastInputSequenceNumber].push(deltaTime);

			if(this.pendingIterationDeltaTimes.length >= 10){
				this.pendingIterationDeltaTimes.splice(0, 1);
			}			
		}
	}

	GetDestination(key){
		var tile = {};
		tile.x = Math.trunc(this.pos.x);
		tile.y = Math.trunc(this.pos.y);
		switch(key){
			case "u":
				tile.y = tile.y - 1;
				break;
			case "d":
				tile.y = tile.y + 1;
				break;
			case "r":
				tile.x = tile.x + 1;
				break;
			case "l":
				tile.x = tile.x - 1;
				break;
		}
		return(tile);
	}

	MoveToTile(tilePos, deltaTime){	//moves to adjacent tile
//		console.log("Destinat: "+this.destination.x+", "+this.destination.y);
//		console.log("Position: "+this.pos.x+", "+this.pos.y);

		var direction = {};
		direction.x = tilePos.x - this.pos.x;
		direction.y = tilePos.y - this.pos.y;

		if(direction.x > 0){
			direction.x = 1;
		}
		else if(direction.x < 0){
			direction.x = -1;
		}
		else{
			direction.x = 0;
		}
		if(direction.y > 0){
			direction.y = 1;
		}
		else if(direction.y < 0){
			direction.y = -1;
		}
		else{
			direction.y = 0;
		}

		var simulatedPos = this.pos;
		if(direction.x != 0)
			simulatedPos.x = this.pos.x + direction.x*this.speed*deltaTime;

		if(direction.y != 0)
			simulatedPos.y = this.pos.y + direction.y*this.speed*deltaTime;		

//		console.log("sim position: "+simulatedPos.x+", "+simulatedPos.y);

		//check if we reached the destination
		var reached = false;

		if(direction.x > 0){	//going right
			if(Math.abs(simulatedPos.x) >= Math.abs(tilePos.x)){
				reached = true;
			}
		}
		else if(direction.x < 0){	//going left
			if(Math.abs(simulatedPos.x) <= Math.abs(tilePos.x)){
				reached = true;
			}
		}
		else if(direction.y > 0){	//goin up
			if(Math.abs(simulatedPos.y) >= Math.abs(tilePos.y)){
				reached = true;
			}
		}
		else if(direction.y < 0){	//going down
			if(Math.abs(simulatedPos.y) <= Math.abs(tilePos.y)){
				reached = true;
			}
		}
		if(!reached){
			this.pos.x = simulatedPos.x;
			this.pos.y = simulatedPos.y;
		}else{
	//		console.log("reached objective");
			this.pos.x = tilePos.x;
			this.pos.y = tilePos.y;
		}
//		console.log("Delta time: "+deltaTime);
//		console.log("Position: "+this.pos.x+", "+this.pos.y);
		if(!this.server){
			this.SetPosition(this.pos);
		}
	}

	SetPosition(pos){
		this.pos.x = pos.x;
		this.pos.y = pos.y;		
		SetSpritePosition(this.sprite, pos);	//method on rendering
	}

	SetServerPosition(pos){
		SetSpritePosition(this.serverSprite, pos);	//method on rendering		
	}

	CreateSprite(){
		var cords = this.pos;
		if(this.isSelf){
			this.serverSprite = AddSprite('blue', cords);
			this.sprite = AddSprite('red', cords);
			game.camera.follow(this.sprite);
		}
		else{
			this.sprite = AddSprite('blue', cords);
		}
	}

	RemoveSprite(){
		DeleteSprite(this.sprite);
	}


}

if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Player;
}