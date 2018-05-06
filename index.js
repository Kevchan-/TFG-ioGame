var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var UUID = require('node-uuid');

app.use(express.static(__dirname+'/public'));
app.use(express.static(__dirname+'/source'));

app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/', function(req,res){
	res.render('pages/index');
});

var roomServer = require('./source/roomServer.js');
var gameServer = require('./source/gameServer.js');

io.on('connection', function(socket){
	//socket's the connected client
	socket.userid = UUID();	
	
	socket.emit('onConnected', {id: socket.userid});

	roomServer.FindRoom(socket);

	socket.on('message', function(message){
		roomServer.OnMessage(socket, message);
	});
	
	socket.on('disconnect', function(){
		console.log('user '+socket.userid+' disconnected');
		roomServer.Disconnect(socket)
	});
});

http.listen(3000, function(){
	console.log('Listening on 3000');
});