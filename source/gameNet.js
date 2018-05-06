

class GameNet{
	constructor(game){
		var gameCore = game;
		console.log("Network controller created");
	}
}

if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = GameNet;	
}