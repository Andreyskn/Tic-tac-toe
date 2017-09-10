const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const io = require('socket.io')(http);

// Serve static assets
app.use(express.static(path.resolve(__dirname, '..', 'build')));

// Always return the main index.html, so react render the route in the client
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
});

//server recieves information about user connecting
io.on('connection', function(socket){

  var currRoom = socket.id;

  //receiving data from client with link from user's adress bar
  //if adress bar is emty user joins room with the name of his socket.id
  //if adress bar contains link to some room user joins that room
  socket.on('checkUrl', function(gameRoom){
    // if room has two players server lets them know that game is ready to play
    // by emitting 'gameStart' event to players only in that room
    if (io.nsps['/'].adapter.rooms[gameRoom] && io.nsps['/'].adapter.rooms[gameRoom].length == 1) {
      socket.leave(currRoom);
      socket.join(gameRoom);
      currRoom = gameRoom;
      io.to(currRoom).emit('gameStart', 'O');
      
    } else {
      //user receives link which points to his room
      socket.emit('inviteLink', 'http://localhost:3000/' + currRoom);
      
    }
  });

  //server get's data from one player  and immediately sends it to another
  socket.on('sendTurnData', function(data, next, win){
    io.to(currRoom).emit('getTurnData', data, next, win);
  });

  //notifying player when his opponent left the game
  socket.on('disconnect', function(){
    io.to(currRoom).emit('playerLeft', 'your opponent left the game');
  });

});
//listening port 3000
http.listen(3000, function(){
  console.log('listening on *:3000');
});