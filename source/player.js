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

function rgb2hex(rgb){
 rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
 return (rgb && rgb.length === 4) ? "#" +
  ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
}

class Player{
	constructor(game, client, isSelf){

		this.putTiles = [];
		this.socket = client;
		this.id = "";
		this.game = game;
		this.host = false;
		this.server = false;
		this.sprite = null;	//clientside only
		this.border = null;
		this.serverSprite = {};		//debug server sprite position
		this.receivedInput = false;
		this.lastInputSequenceNumber = 0;

		this.inputs = [];	//serverside
		this.pendingInputs = [];	//inputs for when we reconciliate with server, clientside only
		this.pendingIterationDeltaTimes = [];	//for reconciliation. Since we don't store inputs that don't change the destination tile, we need to store the deltaTimes of every iteration here
		this.pidtCounters = [];
		this.lastProcessedInput = -1;				//for reconc., index of last processed input
		this.positionBuffer = [];	

		this.name = "";
		this.teamColor;
		this.maxHealthPoints = 5;
		this.healthPoints = this.maxHealthPoints;
		this.immuneTime = 0.2;
		this.damage = 1;
		this.speed = 5;			//how much time it takes to move from tile to tile
		this.hitAnimationDuration = 0.2;		//for hitting tiles
		this.attackAnimationDuration = 0.2;		//for attacking players
		this.spawnTime = 3;
		this.dead = true;
		this.wasMurdered = false;

		this.powerUp = null;
		this.powerUpButtonDown = false;	//clientside
		this.usingPowerUp = false;		//serverside
		this.tileTrailButtonDown = false;	//clientside
		this.usingTileTrail = true;		//serverside

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
			this.name = this.socket.name;
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
		this.DataRecord();
	}

	DataRecord(){
		this.diedNTimes = 0;
		this.killedN = 0;
		this.points = 0;
		this.tilesBroken = 0;
	}

	SetUpParameters(pos, id){

		if(!this.server)
		CreateKeys();

		this.healthPoints = this.maxHealthPoints;
		this.lastPersonWhoHit = null;

		this.immuneCounter = 0;
		this.hitAnimationCounter = 0;		
		this.attackAnimationCounter = 0;
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
		this.attackCoolDown = false;

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


		if(!this.server){
			if(this.sprite){
				this.sprite.visible = true;
				this.border.visible = true;	
				this.MakeLives();
				if(this.isSelf){
					SetCameraTarget(this.sprite);				
					this.SetPosition(this.pos);		
				}
				console.log("revived position: "+this.pos.x+", "+this.pos.y);
			}
			if(this.isSelf){
				document.getElementById('tileButton').addEventListener('click', this.HandleTileButton.bind(this));			
				document.getElementById('panelContainer').style.display = "none";
				document.getElementById('rankingPanel').style.display = "block";			
			}
		}
		else{
			this.name = this.socket.name;

			console.log(this.name);
		}

		this.lastTile = {};
		this.lastTile.x = Math.trunc(this.pos.x);
		this.lastTile.y = Math.trunc(this.pos.y);

	}

	HandleTileButton(){
		if(this.server){
			if(this.usingTileTrail){
				this.usingTileTrail = false;
			}
			else{
				this.usingTileTrail = true;
			}
		}
		else{
			this.tileTrailButtonDown = true;
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

	ClientServerReconciliation2(netUpdate){

		var make = true;
		var buffer = this.positionBuffer;

		if(buffer.length < 2){
			make = false;
		}

		if(make){

			var latestUpdate = netUpdate;
			var serverSequence = latestUpdate[this.id].inputSequence;
			var serverTime = latestUpdate.serverTime;
			var serverPos = latestUpdate[this.id].pos;


			var target;
			var previous;
			var deleteUntil = 0;      
      var now = new Date().getTime()/1000.0;
	//		console.log("ServerTime: "+serverTime);
      
      var pos;
  //    console.log("OldestTimes: "+this.positionBuffer[0].timeStamp+", "+this.positionBuffer[1].timeStamp);
      if(serverTime < this.positionBuffer[0].timeStamp){
          pos = this.positionBuffer[0].pos;
      }
      else if(serverTime > this.positionBuffer[this.positionBuffer.length-1].timeStamp){
        pos = this.positionBuffer[this.positionBuffer.length-1];
      }
      else{
        for(var i = 0; i < this.positionBuffer.length-1; i++){
            

          if(serverTime > this.positionBuffer[i].timeStamp && serverTime <= this.positionBuffer[i+1].timeStamp){
            target = this.positionBuffer[i+1];
            previous = this.positionBuffer[i];
            deleteUntil = i;
            break;
          }
        }
        var pos = this.Interpolation(previous, target, serverTime);        
      }

//      console.log("Real Time: "+now);
//			console.log("delete"+deleteUntil);

			if(target && previous){

				
				var auxPos = {x: this.pos.x, y: this.pos.y};
//				console.log("AuxPos: "+auxPos.x+", "+auxPos.y);
  //     			console.log("SerPos: "+serverPos.x+", "+serverPos.y);
	//			console.log("IntPos: "+pos.x+", "+pos.y);

				var xDif = Math.abs(pos.x - serverPos.x);
				var yDif = Math.abs(pos.y - serverPos.y);
					console.log("Difs: "+xDif+","+yDif);

				if(xDif > 0.8 || yDif > 0.8){

//					console.log("Correcting");
					this.moving = latestUpdate[this.id].moving;
					this.destination = latestUpdate[this.id].destination;
					this.coolingDown = latestUpdate[this.id].coolingDown;
					this.lastTile = latestUpdate[this.id].lastTile;
					this.hitting = latestUpdate[this.id].hitting;
					this.coolingDown = latestUpdate[this.id].coolingDown;
					this.attackCoolDown = latestUpdate[this.id].attackCoolDown;
					this.SetPosition(serverPos);

					var i = 0;

					while(i < this.pendingInputs.length){
						if(this.pendingInputs[i].sequenceNumber > serverSequence){							
							var input = this.pendingInputs[i];

							this.ApplyInput(input);	

							for(var j = 0; j < this.positionBuffer.length; j++){
								if(this.pendingInputs[j].inputSequence == input.sequenceNumber){
									this.UpdatePhysics(buffer[j].deltaTime, true);
								}
							}

							i++;
						}					
						else{
							this.pendingInputs.splice(i, 1);
						}
					}
//					console.log("FinPos: "+this.pos.x+", "+this.pos.y);					
				}
			}

			this.positionBuffer.splice(0, deleteUntil);			
      
      i = 0;
      while(i < this.positionBuffer.length){
          if(i == 0){
    //        console.log("Sequences: "+serverSequence+", "+this.positionBuffer[i].inputSequence);
          }        
        if(this.positionBuffer[i].inputSequence < serverSequence){

          this.positionBuffer.splice(0, 1);
        }      
        else{
          break;
        }
      }
      
//      if(this.positionBuffer.length > 100){
//        this.positionBuffer.splice(0, 100);
//      }

       // console.log(this.positionBuffer.length);        
		}
	}

	Interpolation(previous, target, timeStamp){
		var difference = target.timeStamp - timeStamp;
		var maxDifference = target.timeStamp - previous.timeStamp;
		var timePoint = difference/maxDifference;

		var newPos = {x: this.pos.x, y:this.pos.y};

//   		console.log("TimePoint: "+ timePoint);
  //      console.log("Pos x: "+ previous.pos.x+", "+target.pos.y);
		newPos.x = Phaser.Math.linear(previous.pos.x, target.pos.x, timePoint);
		newPos.y = Phaser.Math.linear(previous.pos.y, target.pos.y, timePoint);		
		return(newPos);
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

	ClientProcessInputs(socket, time, localDeltaTime){	//we check the current inputs to store them for later reconciliation and send them to the server right now
		//if we have cliendside prediction enabled we'll apply the input as we check the inputs right here
		var now = new Date().getTime()/1000.0;
//		var deltaTime = now - this.lastUpdateTime || now; //if lastupdatetime doesn't exist yet just use the current date
		var deltaTime = localDeltaTime;
		this.lastUpdateTime = now;

		var input = {};
		input.key = "n";

//		game.debug.text(this.pos.x.toFixed(1)+", " +this.pos.y.toFixed(1), spritePos.x, spritePos.y);

//		var spritePos = this.sprite.worldPosition;
		var spritePos = {x: this.sprite.worldPosition.x+tileSize/2, y: this.sprite.worldPosition.y+tileSize/2};
		var spriteWorldPos = this.sprite.position;
//		game.debug.text(spriteWorldPos.x+", " +spriteWorldPos.y, spritePos.x, spritePos.y);

		if(!this.sprite.input.pointerOver())
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

		if((newDestination != 'limit' || newDestination == 'hit' ) && newDestination != false){
			input.sequenceNumber = this.lastInputSequenceNumber;
//			console.log(input.sequenceNumber+": "+newDestination+", "+this.pos.x+", "+this.pos.y);
			this.lastInputSequenceNumber++;

			input.id = this.id;
			input.timeStamp = time.toString().replace(".", ",");
			input.destination = this.destination;

			var serialized = JSON.stringify(input);
			serialized = "i."+serialized;
			this.game.socket.send(serialized);


			input.pos = this.pos;
			input.timeStamp = time;
			input.deltaTime = deltaTime;
			this.pendingInputs.push(input);
		}


		if(this.powerUpButtonDown){
			var serialized = JSON.stringify(this.powerUpButtonDown);
			this.game.socket.send("b.p."+serialized);
			this.powerUpButtonDown = false;
		}
		if(this.tileTrailButtonDown){
			var serialized = JSON.stringify(this.tileTrailButtonDown);
			this.game.socket.send("b.t."+serialized);
			this.tileTrailButtonDown = false;
			if(this.usingTileTrail){
				this.usingTileTrail = false;
			}
			else{
				this.usingTileTrail = true;
			}
		}
	}

	ServerProcessInputs(){
		var input = {};
		input.key = "n";

		var now = new Date().getTime()/1000.0;
		var deltaTime = now - this.lastUpdateTime || now; //if lastupdatetime doesn't exist yet just use the current date
		this.lastUpdateTime = now;	

		var numberOfInputs = this.inputs.length;


		this.receivedInput = false;
		if(numberOfInputs){

			for(var i = 0; i < numberOfInputs; i++){
				if(this.inputs[i].sequenceNumber > this.lastInputSequenceNumber){
					this.receivedInput = true;
					input.key = this.inputs[i].key;
					input.powerUp = this.inputs[i].powerUpButtonDown;
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

		if(this.reached){

			var drop = this.game.map.drops[this.pos.x][this.pos.y];

			if(drop){
				this.game.map.RemoveDrop(drop);
				
				this.healthPoints = this.maxHealthPoints;
			}			
		}
	}

	ServerButtonInput(data){
		var messageParts = data.split('.');
		var type = messageParts[0];

		if(type == 't'){
			this.HandleTileButton();
		}
		else if(type == 'p'){
			var input = {};
			this.usingPowerUp = true;
			console.log("power up");
			this.powerUp.Use();			
		}
	}

	ApplyInput(input, deltaTime){
		var newDestination = false;
		var tilehp = 10000;

		if(this.moving && !this.coolingDown && !this.attackCoolDown){
			if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){	//if we already reached 
		//		this.reached = true;
				this.moving = false;	//then don't move at all this frame and mark as not moving
//				console.log("moving set to false");
				
				this.lastTile.x = Math.trunc(this.pos.x);
				this.lastTile.y = Math.trunc(this.pos.y);
	
				if(input.key !== "n"){	//check for input the same frame so that we don't stop
					var destination = this.GetDestination(input.key, this.game.map);
					if(destination.state == 'moved'){
						this.destination = destination;
						this.lastDirectionInput = input.key;
						this.moving = true;
						newDestination = true;
					}
					else if(destination.state == 'hit'){
//						console.log("tile "+destination.x+", " +destination.y);

						tilehp = this.HitTile(destination);
						newDestination = 'hit';
						this.coolingDown = true;

						if(this.usingPowerUp){
							if(this.powerUp.type == 8){
								if(tilehp == 0){
									this.destination = destination;
									this.lastDirectionInput = input.key;
									this.moving = true;	
									newDestination = true;
									this.coolingDown = false;
								}
							}
						}
					}
					else if(destination.state == 'limit'){
						newDestination = 'limit';
						console.log(this.moving);
					}
				}
			}
		}
		else if(!this.coolingDown && !this.attackCoolDown){
			if(input.key !== "n"){	//if we're not moving check for input that tells us to move
				var destination = this.GetDestination(input.key, this.game.map, deltaTime);
				if(destination.state == 'moved'){
					this.destination = destination;
					this.moving = true;

					this.lastDirectionInput = input.key;
					newDestination = true;
//					console.log("moving set to true");
				}
				else if(destination.state == 'hit'){
			//		console.log("tile "+destination.x+", " +destination.y);
					tilehp = this.HitTile(destination);
					newDestination = 'hit';
					this.coolingDown = true;

					if(this.usingPowerUp){
						if(this.powerUp.type == 8){
							if(tilehp == 0){
								this.destination = destination;
								this.lastDirectionInput = input.key;
								this.moving = true;									
								newDestination = true;
								this.coolingDown = false;
							}				
						}
					}							
				}
				else if(destination.state == 'limit'){
					newDestination = 'limit';
				}
			}
		}

		if(this.usingPowerUp){
			if(this.powerUp.type == 8){
				if(tilehp == 0){
					this.coolingDown = false;
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
			var reached = this.reached;
			this.UpdatePhysics(deltaTime, false);

      if(this.isSelf){
        var now = new Date().getTime()/1000.0;
        this.positionBuffer.push({pos: this.pos, timeStamp: now, deltaTime: deltaTime, inputSequence : (this.lastInputSequenceNumber-1)});

//        console.log("newBuffer: "+ now);	
      }		      
      
			if(this.reached){
				if(!reached){
					if(this.usingTileTrail){
						if(typeof(this.firstMovement) == "undefined" && !this.server){
							this.firstMovement = true;
//							this.CreateTile({x: this.lastTile.x, y: this.lastTile.y});
						}
						else{
							this.CreateTile({x: this.lastTile.x, y: this.lastTile.y});
						}
					}
				}
			}
		}
	}

	UpdatePhysics(deltaTime, recon){

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
			this.MoveToTile(this.destination, deltaTime, recon);

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

		if(this.attackCoolDown){
			if(this.attackAnimationCounter < this.attackAnimationDuration){
				this.attackAnimationCounter += deltaTime;
			}
			else{
				this.attackAnimationCounter = 0;
				this.attackCoolDown = false;
			}
		}
	}

	CreateTile(pos){
		var type = 1;
		var hp = 1;
		if(this.usingPowerUp){
			if(this.powerUp.type == 11 && this.powerUp.active){
				type = 2;
				hp = 2;
			}
		}

		var doit = true;
		var posX = Math.floor(Math.abs(this.pos.x));
		var posY = Math.floor(Math.abs(this.pos.y));

		if(Math.abs(pos.x) == posX && Math.abs(pos.y) == posY){
			doit = false;
		}

		var tile = {x: pos.x, y: pos.y, type: type, hp: hp};

if(doit){
		if(this.server){
			this.game.map.ResetTile(tile, this.id);
			this.points++;

			if(this.usingPowerUp){
				if(this.powerUp.type == 9 && this.powerUp.active){
					var tile2 = {x: pos.x, y: pos.y, type: type, hp: hp};
					var tile3 = {x: pos.x, y: pos.y, type: type, hp: hp};

					if(this.direction == "right" || this.direction == "left"){
						tile2.y = tile2.y+1;
						tile3.y = tile3.y-1;

						if(tile2.y >= 0 && tile2.y < this.game.map.height){
							this.game.map.ResetTile(tile2, this.id);
							this.points++;	
						}

						if(tile3.y >= 0 && tile3.y < this.game.map.height){
							this.game.map.ResetTile(tile3, this.id);
							this.points++;								
						}					
					}
					else if(this.direction == "up" || this.direction == "down"){
						tile2.x = tile2.x+1;
						tile3.x = tile3.x-1;

						if(tile2.x >= 0 && tile2.x < this.game.map.width){
							this.game.map.ResetTile(tile2, this.id);
							this.points++;	
						}
						if(tile3.x >= 0 && tile3.x < this.game.map.width){
							this.game.map.ResetTile(tile3, this.id);
							this.points++;								
						}									
					}					
				}
			}
		}
		else{
			this.game.map.PutTile(tile.x, tile.y, tile.type, this.id);
			this.points++;
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
		if(tile.x < 0 || tile.y < 0 || tile.x >= this.game.map.tileMap.width || tile.y >= this.game.map.tileMap.height){
			tile.state = "limit"
//			console.log("limit");
		}
		else if(!map.IsTileFree(tile.x, tile.y)){
				tile.state = "hit";
		//		console.log("tile "+tile.x+", " +tile.y);
		}

		return(tile);
	}

	HitTile(tilePos){
		var powerUp = false;
		if(this.usingPowerUp){
			if(this.powerUp.type == 8){
				powerUp = true;
			}
		}
		var hp = this.game.map.HitTile(tilePos.x, tilePos.y, this.damage, this.id, powerUp);

		if(!this.server){
			if(emitterTiles == null){
				CreateEmitter(2);
			}
			setTimeout(
				ParticleBurst.bind(this, 2, tilePos, 5), 100
			);
		}

		return(hp);
	}

	ReceiveAttack(damage, attackerId){
		this.lastPersonWhoHit = attackerId;
		var damage = damage;
		
		if(this.usingPowerUp){
			if(this.powerUp.type == 10 && this.powerUp.active){
				damage = 0;
			}
		}

		this.healthPoints -= damage;

		if(!this.server){
			if(emitter == null){
				CreateEmitter(1);
			}

			setTimeout(
				ParticleBurst.bind(this, 1, this.pos, 10), 100
			);
		}
	}

	KillPlayer(killerId){
		this.dead = true;
		this.killedN++;
//		this.pObject.set_position()
		if(this.pObject){
			this.game.pWorld.remove(this.pObject);
		}
		this.game.map.PlayerLeft(this.id);
		if(this.powerUp){
			this.powerUp.End();
		}
		this.points = 0;
		delete this.pObject;
		console.log(this.id+" died");
//		console.log(this.game.pWorld);
	
		if(!this.server){
			this.sprite.visible = false;
	    	this.border.visible = false;
			if(this.isSelf){
				console.log("following "+killerId);
				if(typeof(killerId) != "undefined" && killerId != null){
					this.wasMurdered = true;
					SetCameraTarget(this.game.players[killerId].sprite);
				}
				setTimeout(
				this.ShowGamePanel.bind(this), 1000);
			}
		}
	}

	ShowGamePanel(){
		$("#playButton").click(this.game.SendPlayRequest.bind(this.game, false));
		$("#name").focus();
		$("#name").removeAttr('placeholder');
		console.log(this.name);
		$("#name").val(this.name);			
		$("#mainText").text("YOU DIED!");
		$("#playButtonText").text("Play again!");
		$("#panelContainer").fadeIn("slow");
		$("#rankingPanel").fadeOut("slow");
	}

	SendPlayRequest(){
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
				this.attackCoolDown = true;

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

	MoveToTile(tilePos, deltaTime, recon){	//moves to adjacent tile
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
		this.reached = false;

		if(direction.x > 0){	//going right
			if(Math.abs(simulatedPos.x) >= Math.abs(tilePos.x)){
				this.reached = true;
			}
			this.direction = "right";
		}
		else if(direction.x < 0){	//going left
			if(Math.abs(simulatedPos.x) <= Math.abs(tilePos.x)){
				this.reached = true;
			}
			this.direction = "left";
		}
		else if(direction.y > 0){	//goin up
			if(Math.abs(simulatedPos.y) >= Math.abs(tilePos.y)){
				this.reached = true;
			}
			this.direction = "up";
		}
		else if(direction.y < 0){	//going down
			if(Math.abs(simulatedPos.y) <= Math.abs(tilePos.y)){
				this.reached = true;
			}
			this.direction = "down";
		}

		if(!this.reached){
			this.pos.x = simulatedPos.x;
			this.pos.y = simulatedPos.y;

			if(!this.server){
				this.RotateSprite(direction);
			}			
		}else{
	//		console.log("reached objective");
			this.pos.x = tilePos.x;
			this.pos.y = tilePos.y;
		}
//		console.log("Delta time: "+deltaTime);
//		console.log("Position: "+this.pos.x+", "+this.pos.y);
		if(!this.server){
			this.SetPosition(this.pos, recon);
		}
		else{
			if(this.pObject){
				this.pObject.set_position(new SSCD.Vector(this.pos.x*tileSize, this.pos.y*tileSize));
			}

//			console.log("pos:" +this.pos.x+", input seq: "+ (this.lastInputSequenceNumber));				
		}
	}

	SetPosition(pos, recon){

		var direction = {};
		if(!this.server){
			if(!this.isSelf){
				direction.x = pos.x - this.pos.x;
				direction.y = pos.y - this.pos.y;			
				direction.x = direction.x.toFixed(2);
				direction.y = direction.y.toFixed(2);


				if(direction.y != 0){
//					console.log("moving vertically: "+direction.y);
				}
				if(direction.x != 0){
//					console.log("moving horizontally: "+direction.x);
				}

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
				
				if(direction.x != 0 || direction.y != 0){
					this.RotateSprite(direction);
				}
			}
		}


		this.pos.x = pos.x;
		this.pos.y = pos.y;	



		if(this.pObject){
			this.pObject.set_position(new SSCD.Vector(this.pos.x*tileSize, this.pos.y*tileSize));
		}
		
		if(!this.server){
			SetSpritePosition(this.sprite, pos);	//method on rendering
			SetSpritePosition(this.border, pos);	//method on rendering
			SetSpritePosition(this.base, pos);
//			this.game.pWorld.render(game.canvas);
		}
		else{		
		}
	}

	SetServerPosition(pos){
		SetSpritePosition(this.serverSprite, pos);	//method on rendering		
	}

	CreateSprite(){
		var cords = this.pos;
		this.base = AddSprite('red', cords);
		var sillhouetteBitMapData = createSillhouette('playerBorder');
		this.border = game.add.sprite(cords.x*tileSize+tileSize/2,cords.y*tileSize+tileSize/2,sillhouetteBitMapData);
		this.border.anchor.setTo(0.5); 
		this.border.tint = rgb2hex(this.teamColor).replace("#", "0x");

			this.base.visible = true;

		if(this.isSelf){
			this.serverSprite = AddSprite('blue', cords);
			this.sprite = AddSprite('player', cords);	
			this.sprite.visible = true;
			this.serverSprite.visible = false;
			this.base.anchor.setTo(0.5);
			this.sprite.anchor.setTo(0.5);
			this.serverSprite.anchor.setTo(0.5);
			SetCameraTarget(this.sprite);

			this.sprite.inputEnabled = true;
		}
		else{
			this.sprite = AddSprite('player', cords);
		}
			this.MakeLives();
			this.sprite.angle = 0;
			this.border.angle = 0;
	}

	MakeLives(){
		if(typeof(this.lives) == "undefined"){
			this.lives = [];
			this.lives.push(this.base.addChild(game.make.sprite(-8-2, -16, 'life')));
			this.lives.push(this.base.addChild(game.make.sprite(-4-2, -16, 'life')));
			this.lives.push(this.base.addChild(game.make.sprite(0-2, -16, 'life')));
			this.lives.push(this.base.addChild(game.make.sprite(4-2, -16, 'life')));
			this.lives.push(this.base.addChild(game.make.sprite(8-2, -16, 'life')));
		}
		else{
			for(var i = 0; i < this.lives.length; i++){
				this.lives[i].visible = true;
			}
		}
	}

	RemoveLife(number){
		console.log("Remove: "+number);
		var removed = 0;

		var pos = this.healthPoints-1;
		for(var i = 0; i < number && pos> 0; i++){
			pos = this.healthPoints-1- i;
			if(pos >= 0){
				this.lives[pos].visible = false;
			}
			console.log(pos);
		}
		while(pos < this.healthPoints){
//			this.lives[pos].visible = false;
			pos++
		}
	}


	RecoverLife(number){

		var recovered = 0;
		for(var o = 0; o < this.lives.length; o++){

			if(recovered == number){
				break;
			}
			if(!this.lives[o].visible){
				this.lives[o].visible = true;
				recovered++;
			}
		}
	}
	RotateSprite(vector){
		if(vector.x == -1){
			this.sprite.angle = 270;
			this.border.angle = 270;
		}
		else if(vector.x == 1){
			this.sprite.angle = 90;
			this.border.angle = 90;
		}
		else if(vector.y == -1){
			this.sprite.angle = 0;
			this.border.angle = 0;
		}
		else if(vector.y == 1){
			this.sprite.angle = 180;
			this.border.angle = 180;
		}
	}

	RemoveSprite(){
		DeleteSprite(this.sprite);
		this.border.destroy();
		if(this.pObject){
			this.game.pWorld.remove(this.pObject);			
		}
	}
}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Player;
}