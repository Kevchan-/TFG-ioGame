var tileSize = 16;

if(typeof(global) !== 'undefined'){
	var SSCD = require('sscd').sscd;
}

function GetAngle(obj1, obj2) {
// angle in radians
//var angleRadians = Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x);
// angle in degrees
var angleDeg = (Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x) * 180 / Math.PI);
return angleDeg;
}

class Player{
	constructor(game, client, isSelf){

		this.socket = client;
		this.id = "";
		this.game = game;
		this.host = false;
		this.server = false;
		this.sprite = null;	//clientside only
		this.serverSprite = {};		//debug server sprite position
		this.receivedInput = false;
		this.lastInputSequenceNumber = 0;

		this.inputs = [];	//serverside
		this.pendingInputs = [];	//inputs for when we reconciliate with server, clientside only
		this.pendingIterationDeltaTimes = [];	//for reconciliation. Since we don't store inputs that don't change the destination tile, we need to store the deltaTimes of every iteration here
		this.pidtCounters = [];
		this.lastProcessedInput = -1;				//for reconc., index of last processed input
		this.positionBuffer = [];	

		this.maxHealthPoints = 3;
		this.healthPoints = this.maxHealthPoints;
		this.immuneTime = 0.2;
		this.damage = 1;
		this.speed = 5;			//how much time it takes to move from tile to tile
		this.hitAnimationDuration = 0.2;
		this.spawnTime = 3;
		this.dead = true;


		this.pos = {
			x: 0,
			y: 0
		};

		this.lastTile = {};
		this.size = {
			x: tileSize,
			y: tileSize
		};

		this.destination = {	//the tile we're moving to, if we moving
			x: 0,
			y: 0
		};

		if(this.socket){
//			console.log("Player created in server");
			this.id = client.userid;
			this.lastInputSequenceNumber = -1;
			this.server = true;
//			this.pObject = this.game.pWorld.add(new SSCD.Rectangle(new SSCD.Vector(this.pos.x*tileSize, this.pos.y*tileSize), new SSCD.Vector(this.size.x/2, this.size.y/2)));		
//			this.pObject.id = this.id;
		}else{
//			console.log("Player created");
		}
		this.isSelf = isSelf;
	}

	DataRecord(){
		this.diedNTimes = 0;
		this.killedN = 0;
		this.points = 0;
		this.tilesBroken = 0;
	}

	SetUpParameters(pos, id){

		this.healthPoints = this.maxHealthPoints;
		this.lastPersonWhoHit = null;

		this.immuneCounter = 0;
		this.hitAnimationCounter = 0;		
		this.spawnCounter = 0;

		this.hurt = false;
		this.dead = false;

		this.inputs = [];	//serverside
		this.pendingInputs = [];	//inputs for when we reconciliate with server, clientside only
		this.pendingIterationDeltaTimes = [];	//for reconciliation. Since we don't store inputs that don't change the destination tile, we need to store the deltaTimes of every iteration here
		this.pidtCounters = [];
		this.lastProcessedInput = -1;				//for reconc., index of last processed input
		this.positionBuffer = [];	//clientside, save previous positions here for interpolation

		this.moving = false;	//if traveling to the destination tile
		this.reached = true;
		this.coolingDown = false;	//if drill animation on

		this.pos = pos;
		
		this.size = {
			x: tileSize,
			y: tileSize
		};

		this.destination = {	//the tile we're moving to, if we moving
			x: 0,
			y: 0
		};

		this.id = id;
		console.log("id "+this.id+" on game");

		this.pObject = this.game.pWorld.add(new SSCD.Rectangle(new SSCD.Vector(this.pos.x*tileSize, this.pos.y*tileSize), new SSCD.Vector(this.size.x/2, this.size.y/2)));		
		this.pObject.id = id;

		this.lastTile = {};
		this.lastTile.x = Math.trunc(this.pos.x);
		this.lastTile.y = Math.trunc(this.pos.y);

		if(!this.server){
			if(this.sprite){
				this.sprite.visible = true;	
				if(this.isSelf){
					SetCameraTarget(this.sprite);					
					this.SetPosition(this.pos);
				}
				console.log("revived position: "+this.pos.x+", "+this.pos.y);
			}
		}
	}

//	Initialize(id){	

//	}

	ServerStoreInput(data){
		var data = JSON.parse(data);
		var input = {};
		input.timeStamp = data.timeStamp.replace(",",".");
		input.key = data.key;
		input.sequenceNumber = data.sequenceNumber;
		this.inputs.push(input);
	}

	//process messages from server reggarding our position. do server reconciliation
	ClientServerReconciliation(netUpdate){
		if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){
			this.reached = true;
		}
		else{
			this.reached = false;
		}

		var latestUpdate = netUpdate;
		var serverDestination = latestUpdate[this.id].destination;
		var myServerPos = latestUpdate[this.id].pos;
		var serverSequence = latestUpdate[this.id].inputSequence;

		var i = 0;

//		console.log(pdinputs);

		if(this.reached)
			while(i < this.pendingInputs.length){
				if(this.pendingInputs[i].sequenceNumber >= serverSequence){
//					console.log(i+" serverSequence: "+serverSequence+", input sequence: "+this.pendingInputs[i].sequenceNumber);

					var input = this.pendingInputs[i];
					var index = input.sequenceNumber+1; 
//					console.log(index);
					
					var inputPos = input.pos;
					var inputDestination = input.destination;

//					console.log("Server destination: "+serverDestination.x+", "+serverDestination.y);
//					console.log("Input position: "+inputPos.x+", "+inputPos.y);
//					console.log("Input destination: "+inputPos.x+", "+inputPos.y);
					
					if(inputPos.x == serverDestination.x && inputPos.y == serverDestination.y){

					}
					else if(inputDestination.x == serverDestination.x && inputDestination.y == serverDestination.y){

					}
					else{
						this.SetPosition(myServerPos);
						this.moving = latestUpdate[this.id].moving;
						this.destination = serverDestination;
						this.coolingDown = latestUpdate[this.id].coolingDown;
						this.lastTile = latestUpdate[this.id].lastTile;

						console.log("FIXING POSITION");
					}

//					console.log(i+" inputSequence: "+index);
	/*					if(this.pendingIterationDeltaTimes[index]){
							console.log("exists");
							var auxMoving = this.moving;
							var auxDestination = this.destination;


//							var auxPos = {};
//							auxPos.x = this.pos.x;	//to check if positions match after the reconciliation
//							auxPos.y = this.pos.y

//							this.pos = myServerPos;
//							console.log("this pos: "+this.pos.x+", "+this.pos.y);
//							this.moving = latestUpdate[this.id].moving;
//							this.destination = latestUpdate[this.id].destination;
/*
							this.ApplyInput(input);
						//get delta time
							console.log("length: "+this.pidtCounters[index]);
							for(var j = 0; j < this.pendingIterationDeltaTimes[index].length; j++){
								var deltaTime = this.pendingIterationDeltaTimes[index][j];
								console.log("moving: "+this.moving+", "+deltaTime);
								this.UpdatePhysics(deltaTime, true);
							}
							
//							console.log("Client position: "+auxPos.x+", "+auxPos.y);
//							console.log("Reconc position: "+this.pos.x+", "+this.pos.y);
//							this.moving = auxMoving;
//							this.destination = auxDestination;
						}*/
					i++;
				}
				else{
					this.pendingInputs.splice(i, 1);
				}
			}



	}

	ClientProcessInputs(socket, time){	//we check the current inputs to store them for later reconciliation and send them to the server right now
		//if we have cliendside prediction enabled we'll apply the input as we check the inputs right here
		var now = new Date().getTime()/1000.0;
		var deltaTime = now - this.lastUpdateTime || now; //if lastupdatetime doesn't exist yet just use the current date
		this.lastUpdateTime = now;

		var input = {};
		input.key = "n";

//		game.debug.text(this.pos.x.toFixed(1)+", " +this.pos.y.toFixed(1), spritePos.x, spritePos.y);

		var spritePos = this.sprite.worldPosition;			
		var spriteWorldPos = this.sprite.position;
//		game.debug.text(spriteWorldPos.x+", " +spriteWorldPos.y, spritePos.x, spritePos.y);

		if(game.input.activePointer.isDown){
			var angle = GetAngle(spritePos, game.input.activePointer.position);
//			game.debug.geom(point, 'rgba(255,255,0,1)');
//			game.debug.text(game.input.activePointer.x+", " +game.input.activePointer.y, point.x, point.y);
//			game.debug.text("Angle: "+angle, game.input.activePointer.x, game.input.activePointer.y);

			if(angle >= -45 && angle <= 45){
				input.key = "r";
			}
			else if(angle >=-135  && angle <= -45){
				input.key = "u";
			}
			else if(angle >=45 && angle <=135){
				input.key = "d"
			}	
			else{
				input.key = "l";
			}
//		console.log("calling  process inputs");
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


		var newDestination = this.ApplyInput(input, deltaTime);

		if(newDestination || newDestination == 'hit'){
			input.sequenceNumber = this.lastInputSequenceNumber;
//			console.log(input.sequenceNumber+": "+newDestination+", "+this.pos.x+", "+this.pos.y);
			this.lastInputSequenceNumber++;

			input.id = this.id;
			input.timeStamp = time.toString().replace(".", ",");
			input.pos = this.pos;
			input.destination = this.destination;

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

		this.reached = false;

		this.receivedInput = false;
		if(numberOfInputs){
			for(var i = 0; i < numberOfInputs; i++){
				if(this.inputs[i].sequenceNumber > this.lastInputSequenceNumber){
					this.receivedInput = true;
					input.key = this.inputs[i].key;
					var newDestination = this.ApplyInput(input, deltaTime);

			//		console.log(this.inputs[i].sequenceNumber+": "+newDestination+", "+this.pos.x+", "+this.pos.y);
					if(newDestination == "hit"){
			//			console.log(newDestination);
						this.lastInputSequenceNumber = this.inputs[i].sequenceNumber;
						this.inputs.splice(0, i+1);	
					}
					else if(newDestination){
						this.lastInputSequenceNumber = this.inputs[i].sequenceNumber;
						this.inputs.splice(0, i+1);						
					}
					else{

					}
					break;
				}
				else{
				}
			}
		}

		if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){

			this.reached = true;
		}
	}


	ApplyInput(input, deltaTime){
		var newDestination = false;

		if(this.moving && !this.coolingDown){
			if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){	//if we already reached 
				this.reached = true;
				this.moving = false;	//then don't move at all this frame and mark as not moving
//				console.log("moving set to false");

				this.lastTile.x = Math.trunc(this.pos.x);
				this.lastTile.y = Math.trunc(this.pos.y);
	
				if(input.key !== "n"){	//check for input the same frame so that we don't stop
					var destination = this.GetDestination(input.key, this.game.map);
					if(destination.state != 'hit'){
						this.destination = destination;
						this.lastDirectionInput = input.key;
						this.moving = true;
						newDestination = true;
					}
					else if(destination.state == 'hit'){
//						console.log("tile "+destination.x+", " +destination.y);
						this.HitTile(destination);
						newDestination = 'hit';
						this.coolingDown = true;
					}
				}
			}
			else{	//we not there
				this.reached = false;
			}
		}
		else if(!this.coolingDown){
			if(input.key !== "n"){	//if we're not moving check for input that tells us to move
				var destination = this.GetDestination(input.key, this.game.map, deltaTime);
				if(destination.state != 'hit'){
					this.destination = destination;
					this.moving = true;

					this.lastDirectionInput = input.key;
					newDestination = true;
//					console.log("moving set to true");
				}
				else if(destination.state == 'hit'){
			//		console.log("tile "+destination.x+", " +destination.y);
					this.HitTile(destination);
					newDestination = 'hit';
					this.coolingDown = true;
				}
				else if(destination.state == 'attack'){

				}
			}
		}
		return(newDestination);
	}

	Update(deltaTime){
		if(!this.dead){
			if(this.hurt){
				if(this.immuneCounter < this.immuneTime){
					this.immuneCounter += deltaTime;
				}
				else{
					this.hurt = false;
					this.immuneCounter = 0;
				}
			}

			this.UpdatePhysics(deltaTime);
		}



	}

	UpdatePhysics(deltaTime){

//		console.log(this.id);
//		console.log(this.game.pWorld.pick_object(rect));

//		console.log("moving: "+this.moving);

		if(this.server){
			if(!this.receivedInput){
				if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){
					this.moving = false;
					this.reached = true;
					if(typeof(this.lastTile) != "undefined"){
						this.lastTile.x = Math.trunc(this.pos.x);
						this.lastTile.y = Math.trunc(this.pos.y);						
					}					
				}
			}
		}

		if(this.moving){
			this.MoveToTile(this.destination, deltaTime);
			//store the deltaTimes for server reconciliation
			if(this.server){
//				console.log("Physics update: "+this.pos.x+", "+this.pos.y);
			}
			else if(!this.server){
			//	if(!this.pendingIterationDeltaTimes[this.lastInputSequenceNumber]){
//					this.pendingIterationDeltaTimes[this.lastInputSequenceNumber] = [];
//					this.pidtCounters[this.lastInputSequenceNumber] = 0;
			//			console.log("Saving dt iterations for input "+this.lastInputSequenceNumber);
			//			var newArray = this.pendingIterationDeltaTimes.slice();
			//			console.log(newArray);
			//	}
//				this.pendingIterationDeltaTimes[this.lastInputSequenceNumber].push(deltaTime);
//				this.pidtCounters[this.lastInputSequenceNumber]++;
			//	console.log("length: "+this.pidtCounters[this.lastInputSequenceNumber]);
//				if(this.pendingIterationDeltaTimes.length >= 10){
//					this.pendingIterationDeltaTimes.splice(0, 1);
//					this.pidtCounters.splice(0,1);
//				}

			//	console.log(this.pos.x+", "+this.pos.y);
			}
		}
		else if(this.coolingDown){
			if(this.hitAnimationCounter < this.hitAnimationDuration){
				this.hitAnimationCounter += deltaTime;
				//do stuff
//				console.log("coolingDown");
			}
			else{
				this.hitAnimationCounter = 0;
				this.coolingDown = false;
			}
		}
	}


	GetDestination(key, map, deltaTime){
		var tile = {};
		tile.x = Math.trunc(this.pos.x);
		tile.y = Math.trunc(this.pos.y);
		tile.state = "moved";
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
		if(tile.x < 0 || tile.y < 0 || tile.x > 20 || tile.y > 20){

		}
		if(!map.IsTileFree(tile.x, tile.y)){
			tile.state = "hit";
	//		console.log("tile "+tile.x+", " +tile.y);
		}

		return(tile);
	}

	HitTile(tilePos){
		this.game.map.HitTile(tilePos.x, tilePos.y, this.damage);

		if(!this.server){
			if(emitterTiles == null){
				CreateEmitter(2);
			}
			ParticleBurst(2, tilePos, 5);
		}
	}

	ReceiveAttack(damage, attackerId){
		this.lastPersonWhoHit = attackerId;
		this.healthPoints -= damage;
		if(!this.server){
			if(emitter == null){
				CreateEmitter(1);
			}
			ParticleBurst(1, this.pos, 10);
		}
	}

	KillPlayer(killerId){
		this.dead = true;
		this.killedN++;
//		this.pObject.set_position()
		this.game.pWorld.remove(this.pObject);
		delete this.pObject;
		console.log(this.id+" died");
//		console.log(this.game.pWorld);
	
		if(!this.server){
			this.sprite.visible = false;
			if(this.isSelf){
				console.log("following "+killerId);
				SetCameraTarget(this.game.players[killerId].sprite);
			}
		}
	}

	LookForCollisions(pos){
		var collision_list = [];
		var rect = new SSCD.Rectangle(new SSCD.Vector(pos.x*tileSize, pos.y*tileSize), new SSCD.Vector(this.size.x/2, this.size.y/2));
		var colliders_ids = [];

//console.log("Rect: "+rect.pos.x+", "+rect.pos.y);

		if(this.game.pWorld.test_collision(rect, undefined, collision_list)){
//			console.log(collision_list);
			for(var i = 0; i < collision_list.length; i++){
//				console.log("hit: "+collision_list[i].id);
				if(typeof(collision_list[i].id) != "undefined")
					if(collision_list[i].id != this.id){
						console.log("hit: "+collision_list[i].id);
						colliders_ids.push(collision_list[i].id);
					}
			}
		}
		return(colliders_ids);
	}

	ResolveCollision(colliders){
		var aux = this.lastTile;
		this.destination = aux;
//		console.log("pre: "+this.lastTile.x+", "+this.lastTile.y);
//		console.log("pos: "+this.pos.x+", "+this.pos.y);
//			this.previousTile = this.destination;

		for(var i = 0; i < colliders.length; i++){
			var angle = GetAngle(this.game.players[colliders[i]].pos, this.pos);
			var hit = false;

			if(angle >= -45 && angle <= 45){
//				console.log("direction l");
				if(this.lastDirectionInput == "l"){
					hit = true;
				}
			}
			else if(angle >=-135  && angle <= -45){
//				console.log("direction d");
				if(this.lastDirectionInput == "d"){
					hit = true;
				}
			}
			else if(angle >=45 && angle <=135){
//				console.log("direction u");				
				if(this.lastDirectionInput == "u"){
					hit = true;
				}				
			}	
			else{
//				console.log("direction r");				
				if(this.lastDirectionInput == "r"){
					hit = true;
				}				
			}

			if(hit){
				this.game.players[colliders[i]].ReceiveAttack(this.damage, this.id);
				if(!this.server){
					game.camera.shake(0.005, 100);
				}
			}
		}

		switch(this.lastDirectionInput){
			case "u":
				this.lastDirectionInput = "d";
				break;
			case "d":
				this.lastDirectionInput = "u";
				break;
			case "r":
				this.lastDirectionInput = "l";
				break;
			case "l":
				this.lastDirectionInput = "r";
				break;
		}
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
		var playerCollision = false;

		if(direction.x != 0){
			simulatedPos.x = this.pos.x + direction.x*this.speed*deltaTime;
		}

		if(direction.y != 0){
			simulatedPos.y = this.pos.y + direction.y*this.speed*deltaTime;	
		}

		var physicsSimulatedPos = {}; 
		physicsSimulatedPos.x = this.pos.x + direction.x*this.speed*0.016;
		physicsSimulatedPos.y = this.pos.y + direction.y*this.speed*0.016;	
		var collisions = this.LookForCollisions(physicsSimulatedPos);

		if(collisions.length){
				playerCollision = true;
		}
		if(playerCollision){
			this.ResolveCollision(collisions);

		}

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
		else{
			if(this.pObject){
				this.pObject.set_position(new SSCD.Vector(this.pos.x*tileSize, this.pos.y*tileSize));
			}
		}
	}

	SetPosition(pos){
		this.pos.x = pos.x;
		this.pos.y = pos.y;	

		if(this.pObject){
			this.pObject.set_position(new SSCD.Vector(this.pos.x*tileSize, this.pos.y*tileSize));
		}
		

//		if(!this.isSelf){
//		}
		if(!this.server){
			SetSpritePosition(this.sprite, pos);	//method on rendering
//			this.game.pWorld.render(game.canvas);
		}
	}

	SetServerPosition(pos){
		SetSpritePosition(this.serverSprite, pos);	//method on rendering		
	}

	CreateSprite(){
		var cords = this.pos;
		if(this.isSelf){
			this.serverSprite = AddSprite('blue', cords);
			this.sprite = AddSprite('red', cords);
			this.sprite.visible = true;
			this.serverSprite.visible = false;
			SetCameraTarget(this.sprite);			
		}
		else{
			this.sprite = AddSprite('blue', cords);
		}
	}

	RemoveSprite(){
		DeleteSprite(this.sprite);
		this.game.pWorld.remove(this.pObject);
	}
}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Player;
}