/* jshint globalstrict:true, node:true, unused:false */
/* global console */
'use strict';

var WebSocketServer = require('websocket').server,
    http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    httpServer,
    workingDir = path.join(process.cwd(), 'app'),
    indexFile = 'index.html',
    wsServer,
    hostConfig,
    contentTypes,
    host = '127.0.0.1',
    port = 8090,
    connections = [],
    DEBUG;

DEBUG = true;
contentTypes = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript'
};

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

function respond(response, statusCode, body, filename) {
  var contentType = contentTypes[filename ? filename.split('.')[1] : 'html'];
  response.writeHead(statusCode, {'Content-Type': contentType});

  if (body) {
    response.write(body);
  }

  response.end();
}

function respond404(response) {
  respond(response, 404, '<h1>404 - Not found</h1>');
}

function respond500(response) {
  respond(response, 500, '<h1>500 - Server Error</h1>');
}

if (process.argv.length === 3) {
  var hostConfig = process.argv[2].split(':');
  host = hostConfig[0];
  port = hostConfig[1] || port;
}

httpServer = http.createServer(function(request, response) {
  var requestedPath = url.parse(request.url).pathname,
      requestedFilename;

  debug((new Date()) + ' Received request for ' + requestedPath);

  if (requestedPath === '/') {
    requestedPath = indexFile;
  }

  requestedFilename = path.join(workingDir, requestedPath);

  fs.realpath(requestedFilename, function(error, resolvedPath) {
    if (error || resolvedPath.indexOf(workingDir) !== 0) {
      respond404(response);
    } else {
      fs.readFile(requestedFilename, function(error, data) {
        if (error) {
          respond500(response);
        } else {
          respond(response, 200, data, requestedFilename);
        }
      });
    }
  });
});

httpServer.listen(port, host, function() {
  debug((new Date()) + ' Server is listening on port ' + host + ':' + port + '/');
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

// if (DEBUG) {
//   setInterval(function() {
//     console.log('Number of active connections: ' + connections.length);
//   }, 100000);
// }
