class Drop{
	constructor(game, pos, type, server){
		this.pos = pos;
		this.type = 1;
		this.game = game;
		this.sprite = {};
		this.server = server;

		switch(this.type){
			case 1://points
			if(!this.server){
				this.sprite = AddSprite("heal", pos);
			}

			this.points = 1;
			break;
			case 0:

			break;
			case 2:

			break;

			case 3:

			break;
			default:

			break;
		}
	}

	RemoveSprite(){
		DeleteSprite(this.sprite);
	}
}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Drop;	
}