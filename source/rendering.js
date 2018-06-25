
var logo;
//array of all the graphic game objects
var objects = [];
var spritesheet;
var spriteBatch;

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
    game.load.image('red', "red.png");
    game.load.image('blue', "blue.png");
    game.load.image('sea', "assets/3.png");
    game.load.spritesheet('spritesheet', 'assets/spritesheet.png', 16, 16, 4);
    console.log("spritesheet loaded");
//    game.load.tilemap('map100x100', 'assets/map100x100.json', null, Phaser.Tilemap.TILED_JSON);
//    game.load.atlasJSONHash('spritesheet', 'assets/spritesheet.png', 'assets/spritesheet.json');

}

function Create () {

    spriteBatch = game.add.spriteBatch();
    game.stage.backgroundColor = "#2d2d2d";
    game.stage.smoothed = false;

//    logo = game.add.sprite(0, 0, 'logo');
//    logo.anchor.setTo(0.5, 0.5);
    upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
    
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
  //  game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
//    game.scale.setUserScale(gameScale, gameScale);

    // enable crisp rendering
    game.renderer.renderSession.roundPixels = true;
    Phaser.Canvas.setImageRenderingCrisp(game.canvas);
}

function SetSpritePosition(sprite, pos){
    sprite.x = Math.round(pos.x*tileSize);
    sprite.y = Math.round(pos.y*tileSize);
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

function AddSprite(name, cords, index){
    if(typeof(index) == 'undefined')
    {
        var sprite = game.add.sprite(cords.x*tileSize, cords.y*tileSize, name); 
    }
    else
    {
        var sprite = game.make.sprite(cords.x*tileSize, cords.y*tileSize, name, index);
        spriteBatch.addChild(sprite);
//        console.log("adding sprites");
    }
//  sprite.anchor.setTo(0.5, 0.5);
    sprite.index = objects.length;
    objects.push(sprite);
    return(sprite);
}

function SetCameraTarget(sprite){
    game.camera.follow(sprite);
}

function DeleteSprite(sprite){
    var index = sprite.index;
    sprite.destroy();
    objects.splice(index, 1);
}

