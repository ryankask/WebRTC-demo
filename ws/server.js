/* jshint globalstrict:true, node:true, unused:false */
/* global console */
'use strict';

var WebSocketServer = require('websocket').server,
    http = require('http'),
    httpServer,
    wsServer,
    port = 8090,
    connections = [],
    firstUser,
    secondUser,
    DEBUG;

DEBUG = true;

httpServer = http.createServer(function(request, response) {
  if (DEBUG) {
    console.log((new Date()) + ' Received request for ' + request.url);
  }
  response.writeHead(404);
  response.end();
});

httpServer.listen(port, '10.1.0.4', function() {
    console.log((new Date()) + ' Server is listening on port ' + port);
});

wsServer = new WebSocketServer({
  httpServer: httpServer,
  autoAcceptConnections: true
  // maxReceivedFrameSize: 64*1024*1024,   // 64MiB
  // maxReceivedMessageSize: 64*1024*1024, // 64MiB
  // fragmentOutgoingMessages: false,
  // keepalive: false,
  // disableNagleAlgorithm: false
});

function findOtherConnection(currentConnection) {
  var i;

  for (i = 0; i < connections.length; i++) {
    if (connections[i] !== currentConnection) {
      return connections[i];
    }
  }
}

wsServer.on('connect', function(connection) {
  if (DEBUG) {
    console.log((new Date()) + ' Connection accepted' +
                ' - Protocol Version ' + connection.webSocketVersion);
  }

  connections.push(connection);

  function sendCallback(error) {
    if (error) {
      console.error('send() error: ' + error);
    }
  }

  connection.on('message', function(message) {
    var envelope, otherConnection, returnEnvelope = {};

    if (message.type === 'utf8') {
      envelope = JSON.parse(message.utf8Data);
      console.log('Received envelope from ' + envelope.from);

      if (!envelope.from) {
        console.log('Ignoring message without "from" key');
        connection.sendUTF(JSON.stringify({}), sendCallback);
        return;
      }
      if (!firstUser) {
        console.log('Setting first user to ' + envelope.from);
        firstUser = envelope.from;
      } else if (!secondUser) {
        console.log('Setting second user to ' + envelope.from);
        secondUser = envelope.from;
      }

      returnEnvelope.from = envelope.from;
      returnEnvelope.body = envelope.body;
      otherConnection = findOtherConnection(connection);
      if (otherConnection && returnEnvelope.body) {
        otherConnection.sendUTF(JSON.stringify(returnEnvelope), sendCallback);
      } else {
        console.log('not sending response: no other connections');
      }
    }
    else if (message.type === 'binary') {
      console.log('received binary message; doing nothing.');
      connection.sendBytes([], sendCallback);
    }
  });

  connection.on('close', function(reasonCode, description) {
    if (DEBUG) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress +
                  ' disconnected.');
    }
    connections.splice(connections.indexOf(connection), 1);
  });
});

setInterval(function() {
  console.log('Number of active connections: ' + connections.length);
}, 10000);
