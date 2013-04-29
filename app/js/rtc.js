/* global performance, setLocalAndSendMessage, start, stop, URL,
   webkitRTCPeerConnection, RTCSessionDescription, RTCIceCandidate */
'use strict';

var audio = document.getElementsByTagName('audio')[0],
    call = document.getElementById('call'),
    hangup = document.getElementById('hangup'),
    pc,
    userId,
    pcConfig = {"iceServers": [{'url': 'stun:stun.l.google.com:19302'}]},
    localStream,
    remoteStream,
    started = false,
    sdpConstraints = {mandatory: {OfferToReceiveAudio: true}},
    signalSocket = new WebSocket('ws://' + window.location.host),
    getUserMedia,
    RTCPeerConnection;

if (navigator.mozGetUserMedia) {
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);
} else {
  RTCPeerConnection = webkitRTCPeerConnection;
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
}

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0,
        v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function init() {
  call.disabled = true;
  hangup.disabled = true;
  userId = uuid4();

  trace('Requesting local stream.');
  getUserMedia({audio: true},
    function(stream) {
      trace('Received local stream.');
      localStream = stream;
      call.disabled = false;
    },
    function() {
      console.log('Error.');
    }
  );
}

//
// Signaling comms
//

function sendMessage(message) {
  signalSocket.send(JSON.stringify({
    from: userId,
    body: message
  }));
}

signalSocket.onmessage = function(event) {
  var envelope = JSON.parse(event.data),
      message = envelope.body;

  if (message.type === 'offer') {
    if (!started) {
      trace('Starting after offer received');
      start();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    trace('Sending answer to peer.');
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
  } else if (message.type === 'answer' && started) {
    trace('Received answer');
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && started) {
    pc.addIceCandidate(new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    }));
  } else if (message.type === 'bye' && started) {
    trace('Got message "bye"');
    stop();
  }
};

//
// WebRTC
//

function start(isInitiator) {
  if (!started && localStream && signalSocket) {
    call.disabled = true;
    hangup.disabled = false;
    trace('Creating PeerConnection');
    createPeerConnection();

    trace('Adding local stream');
    pc.addStream(localStream);
    started = true;

    if (isInitiator) {
      pc.createOffer(setLocalAndSendMessage, null, sdpConstraints);
    }
  }
}

function stop() {
  trace('Stopping connection and closing stream.');
  started = false;
  pc.close();
  pc = null;
  audio.src = '';
  hangup.disabled = true;
  call.disabled = false;
}

function setLocalAndSendMessage(sessionDescription) {
  trace('Setting local description');
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

// Peer connection

function onIceCandidate(event) {
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    trace('End of candidates.');
  }
}

function onRemoteAddStream(event) {
  trace('Remote stream added');
  audio.src = URL.createObjectURL(event.stream);
  remoteStream = event.stream;
}

function onRemoteStreamRemoved() {
  trace('Remote stream removed.');
}

function createPeerConnection() {
  pc = new RTCPeerConnection(pcConfig);
  pc.onicecandidate = onIceCandidate;
  pc.onaddstream = onRemoteAddStream;
  pc.onremovestream = onRemoteStreamRemoved;
  trace('Created new peer connection.');
}

//
// DOM Callbacks
//

window.onbeforeunload = function() {
  sendMessage({type: 'bye'});
};

call.onclick = function() {
  start(true);
};

hangup.onclick = function() {
  trace('Ending call');
  stop();
  sendMessage({type: 'bye'});
};

//
// Start
//

init();
