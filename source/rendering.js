
var logo;
//array of all the graphic game objects
var objects = [];
var emitter = null;
var emitterTiles = null;
var emitterExplosions = null;

var spritesheet;
var spriteBatch;

var upKey;
var downKey;
var leftKey;
var rightKey;
var spaceKey;
var backKey;
var controlKey;

var touchCords;


function Preload () {
    game.load.image('red', "red.png");
    game.load.image('blue', "blue.png");
    game.load.image('life', "assets/life.png");
    game.load.image('particle', "assets/particle.png");
    game.load.image('heal', "assets/heal.png");
    game.load.image('bomb', "assets/bomb.png");
    game.load.image('player', "assets/player.png");
    game.load.image('playerBorder', "assets/playerBorder.png");
    game.load.image('powerUp', "assets/powerUp.png");
    game.load.image('sea', "assets/3.png");
    game.load.spritesheet('spritesheet', 'assets/spritesheet.png', 16, 16, 4);

    console.log("spritesheet loaded");
//    game.load.tilemap('map100x100', 'assets/map100x100.json', null, Phaser.Tilemap.TILED_JSON);
//    game.load.atlasJSONHash('spritesheet', 'assets/spritesheet.png', 'assets/spritesheet.json');

}

function Create () {

    spriteBatch = game.add.spriteBatch();
    game.stage.backgroundColor = "#45311D";
    game.stage.smoothed = false;

    upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
    spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACE);
    controlKey = game.input.keyboard.addKey(Phaser.Keyboard.CONTROL);
    shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);
    
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
    else if(which == 3){
        emitterExplosions = game.add.emitter(0, 0, 1000);
        emitterExplosions.makeParticles('particle');
        emitterExplosions.minParticleSpeed.setTo(-50, -50);
        emitterExplosions.maxParticleSpeed.setTo(50, 50);
        emitterExplosions.minParticleScale = 1;
        emitterExplosions.maxParticleScale = 2;
        emitterExplosions.setRotation(0, 0);
    }
}

function ParticleBurst(which, pos, particles, time){
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
    else if(which == 3){
        emitterExplosions.x = Math.round(pos.x*tileSize+tileSize/2);
        emitterExplosions.y = Math.round(pos.y*tileSize+tileSize/2);

        //  The first parameter sets the effect to "explode" which means all particles are emitted at once
        //  The second gives each particle a 2000ms lifespan
        //  The third is ignored when using burst/explode mode
        //  The final parameter (10) is how many particles will be emitted in this single burst
        emitterExplosions.start(true, time*1000, null, particles);        
    }    
}

function ParticlesBurst(which, posVec, particles, time){
    var positions = posVec;

    for(var i = 0; i < positions.length; i++){
        ParticleBurst(which, positions[i], particles, time);
    }
}

function createSillhouette(srcKey) {
    var bmd = game.make.bitmapData();
    // load our texture into the bitmap
    bmd.load(srcKey);
    bmd.processPixelRGB(forEachPixel, this);
  return bmd;
}

function forEachPixel(pixel) {      
  // processPixelRGB won't take an argument, so we've set our sillhouetteColor globally 
    pixel.r = 255;
    pixel.g = 255;
    pixel.b = 255;
    return pixel;
}

function DestroyEmitters(){
    emitterTiles.destroy();
    emitter.destroy();
}

function SetSpritePosition(sprite, pos){
    sprite.x = Math.round((pos.x)*tileSize+tileSize/2);
    sprite.y = Math.round((pos.y)*tileSize+tileSize/2);
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
        var sprite = game.add.sprite(cords.x*tileSize+tileSize/2, cords.y*tileSize+tileSize/2, name); 
    }
    else
    {
        var sprite = game.make.sprite(cords.x*tileSize+tileSize/2, cords.y*tileSize+tileSize/2, name, index);
        spriteBatch.addChild(sprite);
//        console.log("adding sprites");
    }
    sprite.anchor.setTo(0.5, 0.5);
    sprite.index = objects.length;
    objects.push(sprite);
    return(sprite);
}

function Flickering(sprite, tone, duration, interval, on){
    if(sprite){
        var interval = interval;    
        var duration = duration -  interval;

       // console.log("deltatime: "+interval+", duration: "+duration);
        var on = on;

        if(on){
    //        sprite.tint = 0xFFFFFF;
            sprite.visible = false;
            on = false;
        }else{
            sprite.visible = true;
       //     sprite.tint = tone;
            on = true;
        }

    //   console.log(sprite.tint);
        if(duration <= 1){
            if(interval >= 0.5)
                interval = interval/2;
        }

        if(duration <= 0){
//            sprite.tint = 0xFFFFFF;
            sprite.visible = false;
        }
        else{
            setTimeout(Flickering.bind(this, sprite, tone, duration, interval, on), interval*1000);
        } 
    } 
}

function SetCameraTarget(sprite){
    game.camera.follow(sprite);
    console.log("camera following sprite");
}

function DeleteSprite(sprite){
    var index = sprite.index;
    sprite.destroy();
    objects.splice(index, 1);
}

