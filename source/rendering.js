
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
    game.load.tilemap('map', 'assets/map.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles', 'assets/tiles.png');
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

function GetSpritePosition(sprite){
    var pos = {};
    pos.x = sprite.x;
    pos.y = sprite.y;
    return(pos);
}

function AddSprite(name, cords){
	var sprite = game.add.sprite(cords.x*tileSize, cords.y*tileSize, name);

/*    var canvas_width = window.innerWidth * window.devicePixelRatio;
    var canvas_height = window.innerHeight * window.devicePixelRatio;

    var aspect_ratio = canvas_width / canvas_height;
    if (aspect_ratio > 1) scale_ratio = canvas_height / canvas_height_max;
    else scale_ratio = canvas_width / canvas_width_max;

    sprite.scale(scale_ratio);*/

//	sprite.anchor.setTo(0.5, 0.5);

    sprite.scale.set(16*spriteScale*scaleRatio);
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

function gofull() {
    if (game.scale.isFullScreen)
    {
        game.scale.stopFullScreen();
    }
    else
    {
        game.scale.startFullScreen(false);
    }

}
