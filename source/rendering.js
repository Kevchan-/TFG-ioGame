
var logo;
//array of all the graphic game objects
var objects = [];

var upKey;
var downKey;
var leftKey;
var rightKey;

var touchCords;

//sprite object
Sprite = function(index, name){
    this.index = index;
    this.name = name;
}

//sprite functions
function Preload () {
    game.load.image('logo', 'phaser.png');
    game.load.image('red', "red.png");
    game.load.image('blue', "blue.png");
    game.load.tilemap('map100x100', 'assets/map100x100.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles1024', 'assets/tiles1024.png');
}

function Create () {
//	game.stage.backgroundColor = '#2d2d2d';
    game.stage.backgroundColor = "#2d2d2d";
	game.stage.smoothed = false;
//    logo = game.add.sprite(0, 0, 'logo');
//    logo.anchor.setTo(0.5, 0.5);
    upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
}

function SetSpritePosition(sprite, pos){
    sprite.x = Math.round(pos.x*16*scaleRatio*spriteScale);
    sprite.y = Math.round(pos.y*16*scaleRatio*spriteScale);
}

function SetCameraPosition(pos){
    game.camera.focusOnXY(pos.x, pos.y);
}

function GetSpritePosition(sprite){
    var pos = {};
    pos.x = sprite.x;
    pos.y = sprite.y;
    return(pos);
}

function AddSprite(name, cords){
	var sprite = game.add.sprite(cords.x*tileSize, cords.y*tileSize, name);

//	sprite.anchor.setTo(0.5, 0.5);

   sprite.scale.set(gameScale);
  // console.log("sprite scale: "+spriteScale+"*"+scaleRatio);
    sprite.index = objects.length;
	objects.push(sprite);
	return(sprite);
}

function DeleteSprite(sprite){
    var index = sprite.index;
    sprite.destroy();
	objects.splice(index, 1);
}

function GetAngle(obj1, obj2) {
// angle in radians
var angleRadians = Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x);
// angle in degrees
var angleDeg = (Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x) * 180 / Math.PI);
return angleDeg;
}
