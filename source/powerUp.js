class PowerUp{
	constructor(game, pos, type, server  ){
		this.pos = pos;
		this.id = pos.x+"x"+pos.y;
		this.ending = false;
		this.ended = false;
		this.game = game;
		this.server = server;
		this.active = false;
		this.player = null;
		this.taken = false;
		this.type = type;

		switch(this.type){
			case 8:
			console.log("Unstopable");
			break;

			case 9:
			console.log("Super trail");
			break;

			case 10:
			console.log("Endurance");
			this.type = 11;
			break;

			case 11:
			console.log("Strong trail");
			break;		
		}
		this.timer = 5;

		if(!server){
			this.sprite = AddSprite("powerUp", pos);
		}		
	}

	Take(player){
		if(!this.taken){
			console.log("taken");
			this.player = player;
			if(this.game.selfPlayer.id == player){
				this.self = true;
			}
			else{
				this.self = false;
			}
			if(this.server){
				this.game.players[player].powerUp = this;
				this.game.players[player].points++;
			}
			else{
				if(this.self){
					this.game.selfPlayer.powerUp = this;					
				}
			}

			this.taken = true;
			switch(this.type){
				case 8:
				this.timer = 7;	//reset timer, now its used for when player activates the powerup
				if(!this.server)
				document.getElementById('powerImage').src = "/Drill-1.png";
				break;

				case 9:
				this.timer = 8;
				if(!this.server)
				document.getElementById('powerImage').src = "/Drill-3.png";				
				break;

				case 10:

				this.timer = 14;
				break;


				case 11:
				this.timer = 14;
				if(!this.server)				
				document.getElementById('powerImage').src = "/Drill-2.png";				
				break;
			}

			if(!this.server){
				DeleteSprite(this.sprite);
			
				if(this.self){
					document.getElementById('powerButton').style.display = "block";
					document.getElementById('powerButton').addEventListener('click', this.ProcessInput.bind(this));
				}				
			}	
		}
	}

	ProcessInput(){
		if(this.taken){
			if(!this.active){
				this.game.selfPlayer.powerUpButtonDown = true;
			}
		}
	}

	Use(){
		console.log("using");
		if(!this.active){
			if(!this.server){
				if(this.self){
					this.game.selfPlayer.usingPowerUp = true;					
				}
			}


			if(!this.server){
				if(this.self){
					document.getElementById('powerButton').removeEventListener('click', this.ProcessInput.bind(this));										
				}
			}

			this.active = true;
		}
	}

	Update(deltaTime){
		if(!this.taken){	//not taken
			if(!this.ended){

//				console.log("updating "+ this.timer);
				if(this.timer <= 0){
					this.End();
				}
				else{
					this.timer -= deltaTime;
					if(!this.ending && this.timer <= 3){
						if(!this.server){
							Flickering(this.sprite, 0x00ff00, this.timer, 0.5);
						}
						this.ending = true;
					}
				}
			}

		}
		else{	//taken
 			if(this.active){
				if(this.timer <= 0){
					this.End();
				}
				else{
					this.timer -= deltaTime;
					if(!this.ending && this.timer <= 3){
						this.ending = true;
					}
				} 
 			}
 			else{
 				if(!this.server){
	 				if(shiftKey.isDown){
	 					this.ProcessInput();
	 				}
	 			}
 			}
		}
	}

	End(){
		if(!this.server){
			if(this.taken){
//				document.getElementById('powerButton').removeEventListener('click', this.ProcessInput);
				if(this.self){
					document.getElementById('powerButton').style.display = "none";
					document.getElementById('powerButton').removeEventListener('click', this.ProcessInput.bind(this));
					this.game.selfPlayer.powerUp = null;
					this.game.selfPlayer.usingPowerUp = false;						
					console.log("power up ended");
				}
			}
			else{
				DeleteSprite(this.sprite);				
			}
		}
		else{
			if(this.taken){
				console.log("powerup ended");
				this.game.players[this.player].powerUp = null;
				this.game.players[this.player].usingPowerUp = false;				
			}
			else{
			}

		}
		this.ended = true;
	}

}

if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = PowerUp;	
}