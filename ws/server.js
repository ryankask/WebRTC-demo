/* jshint globalstrict:true, node:true, unused:false */
/* global console */
'use strict';

var WebSocketServer = require('websocket').server,
    http = require('http'),
    httpServer,
    wsServer,
    port = 8090,
    connections = [],
    DEBUG;

DEBUG = true;

function debug(message) {
  if (DEBUG) {
    console.log(message);
  }
}

function sendCallback(error) {
  if (error) {
    debug('send() error: ' + error);
  }
}

function findOtherConnection(currentConnection) {
  var i;

  for (i = 0; i < connections.length; i++) {
    if (connections[i] !== currentConnection) {
      return connections[i];
    }
  }
}

httpServer = http.createServer(function(request, response) {
  debug((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});

httpServer.listen(port, '10.1.0.4', function() {
  debug((new Date()) + ' Server is listening on port ' + port);
});

wsServer = new WebSocketServer({
  httpServer: httpServer,
  autoAcceptConnections: true
});

wsServer.on('connect', function(connection) {
  debug((new Date()) + ' Connection accepted - Protocol Version ' +
        connection.webSocketVersion);

  connections.push(connection);

  connection.on('message', function(message) {
    var envelope, otherConnection;

    if (message.type === 'utf8') {
      envelope = JSON.parse(message.utf8Data);
      debug('Received envelope from ' + envelope.from);

      if (!envelope.from) {
        debug('Ignoring message without "from" key');
        return;
      }

      otherConnection = findOtherConnection(connection);
      if (otherConnection && envelope.body) {
        otherConnection.sendUTF(message.utf8Data, sendCallback);
      }
    }
    else if (message.type === 'binary') {
      debug('received binary message; doing nothing.');
    }
  });

  connection.on('close', function(reasonCode, description) {
    debug(new Date() + ' Peer ' + connection.remoteAddress + ' disconnected.');
    connections.splice(connections.indexOf(connection), 1);
  });
});

if (DEBUG) {
  setInterval(function() {
    console.log('Number of active connections: ' + connections.length);
  }, 100000);
}
