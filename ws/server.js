/* jshint globalstrict:true, node:true, unused:false */
'use strict';

var WebSocketServer = require('websocket').server,
    http = require('http'),
    httpServer,
    wsServer,
    port = 8090,
    DEBUG;

DEBUG = true;

httpServer = http.createServer(function(request, response) {
  if (DEBUG) console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});

httpServer.listen(port, function() {
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

wsServer.on('connect', function(connection) {
  if (DEBUG) console.log((new Date()) + ' Connection accepted' +
                         ' - Protocol Version ' + connection.webSocketVersion);

  function sendCallback(err) {
    if (err) console.error('send() error: ' + err);
  }

  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      if (DEBUG) console.log('Received utf-8 message of ' + message.utf8Data.length + ' characters.');
      connection.sendUTF(message.utf8Data, sendCallback);
    }
    else if (message.type === 'binary') {
      if (DEBUG) console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
      connection.sendBytes(message.binaryData, sendCallback);
    }
  });
  connection.on('close', function(reasonCode, description) {
    if (DEBUG) console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
  });
});
