
var logo;
//array of all the graphic game objects
var objects = [];
var emitter = null;
var emitterTiles = null;

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
    game.load.image('particle', "assets/particle.png");
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

function CreateEmitter(which){
    if(which == 1){
        emitter = game.add.emitter(0, 0, 100);
        emitter.makeParticles('particle');
    //    emitter.gravity = 100;
        emitter.minParticleSpeed.setTo(-200, -200);
        emitter.maxParticleSpeed.setTo(200, 200);

        emitter.minParticleScale = 0.5;
        emitter.maxParticleScale = 2;
        emitter.setRotation(0, 0);
    }
    else if(which == 2){
        emitterTiles = game.add.emitter(0, 0, 100);
        emitterTiles.makeParticles('particle');
    //    emitter.gravity = 100;
        emitterTiles.minParticleSpeed.setTo(-100, -100);
        emitterTiles.maxParticleSpeed.setTo(100, 100);

        emitterTiles.minParticleScale = 0.5;
        emitterTiles.maxParticleScale = 1;
        emitterTiles.setRotation(0, 0);
    }
}

function ParticleBurst(which, pos, particles) {
    //  Position the emitter where the mouse/touch event was
    if(which == 1){
        emitter.x = Math.round(pos.x*tileSize+tileSize/2);
        emitter.y = Math.round(pos.y*tileSize+tileSize/2);

        //  The first parameter sets the effect to "explode" which means all particles are emitted at once
        //  The second gives each particle a 2000ms lifespan
        //  The third is ignored when using burst/explode mode
        //  The final parameter (10) is how many particles will be emitted in this single burst
        emitter.start(true, 100, null, particles);
    }
    else if(which == 2){
        emitterTiles.x = Math.round(pos.x*tileSize+tileSize/2);
        emitterTiles.y = Math.round(pos.y*tileSize+tileSize/2);

        //  The first parameter sets the effect to "explode" which means all particles are emitted at once
        //  The second gives each particle a 2000ms lifespan
        //  The third is ignored when using burst/explode mode
        //  The final parameter (10) is how many particles will be emitted in this single burst
        emitterTiles.start(true, 80, null, particles);        
    }
}

function DestroyEmitters(){
    emitterTiles.destroy();
    emitter.destroy();
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

