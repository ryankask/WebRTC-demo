/* global performance, setLocalAndSendMessage, stop, URL, maybeStart */
'use strict';

var inAudio = document.getElementById('in-audio'),
    outAudio = document.getElementById('out-audio'),
    start = document.getElementById('start'),
    call = document.getElementById('call'),
    hangup = document.getElementById('hangup'),
    pc,
    userId,
    pcConfig = {"iceServers": [{'url': 'stun:stun.l.google.com:19302'}]},
    localStream,
    remoteStream,
    started = false,
    sdpConstraints = {mandatory: {OfferToReceiveAudio: true}},
    signalSocket = new WebSocket('ws://10.1.0.4:8090'),
    getUserMedia;

if (navigator.mozGetUserMedia) {
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);
} else {
  var RTCPeerConnection = webkitRTCPeerConnection;
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
}

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0,
        v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function init() {
  call.disabled = true;
  hangup.disabled = true;
  userId = uuid4();
  setTimeout(function() { sendMessage(); }, 100);
}

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

//
// Signalling comms
//

function sendMessage(message) {
  signalSocket.send(JSON.stringify({
    from: userId,
    body: message
  }));
}

signalSocket.onmessage = function(event) {
  var envelope = JSON.parse(event.data),
      msg = envelope.body;

  // console.log('Printing envelope');
  // console.log(envelope);

  if (!msg) {
    trace('Ignoring empty message from ' + envelope.from);
    return;
  }

  if (msg.type === 'offer') {
    if (!started) {
      trace('Starting after offer received');
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    trace('Sending answer to peer.');
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
  } else if (msg.type === 'answer' && started) {
    trace('Received answer');
    pc.setRemoteDescription(new RTCSessionDescription(msg));
  } else if (msg.type === 'candidate' && started) {
    pc.addIceCandidate(new RTCIceCandidate({
      sdpMLineIndex: msg.label,
      candidate: msg.candidate
    }));
  } else if (msg.type === 'bye' && started) {
    trace('Got message "bye"');
    setTimeout(function() { outAudio.src = ''; }, 500);
    stop();
  }
};

//
// WebRTC
//

function gotStream(stream) {
  trace('Received local stream.');
  inAudio.src = URL.createObjectURL(stream);
  inAudio.play();
  localStream = stream;
  call.disabled = false;
}

function maybeStart(isInitiator) {
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

}

function setLocalAndSendMessage(sessionDescription) {
  trace('Setting local description');
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

// Peer connection

function createPeerConnection() {
  pc = new RTCPeerConnection(pcConfig);
  pc.onicecandidate = onIceCandidate;
  pc.onaddstream = onRemoteAddStream;
  pc.onremovestream = onRemoteStreamRemoved;
  trace('Created new peer connection.');
}

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
  outAudio.src = URL.createObjectURL(event.stream);
  remoteStream = event.stream;
  //waitForRemoteAudio();
}

function onRemoteStreamRemoved() {
  trace('Remote stream removed.');
}

function waitForRemoteAudio() {
  var audioTracks = remoteStream.getAudioTracks();
  console.log('audioTracks length: ' + audioTracks.length);
  console.log('audioTracks current time: ' + audioTracks.currentTime);
  if (audioTracks.length === 0 || audioTracks.currentTime > 0) {
    hangup.disabled = false;
  } else {
    setTimeout(waitForRemoteAudio, 100);
  }
}

// Message handlers

//
// DOM Callbacks
//

window.onbeforeunload = function() {
  sendMessage({type: 'bye'});
};

start.onclick = function start() {
  trace('Requesting local stream.');
  this.disabled = true;
  getUserMedia({audio: true}, gotStream,
               function() { console.log('Error.'); });
};

call.onclick = function() {
  maybeStart(true);
};

hangup.onclick = function() {
  trace('Ending call');
  stop();
  this.disabled = true;
  call.disabled = false;
};


//
// Start
//

init();
