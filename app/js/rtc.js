/* jshint globalstrict: true, browser: true */
/* global console */
'use strict';

var inAudio = document.getElementById('in-audio'),
    outAudio = document.getElementById('out-audio'),
    start = document.getElementById('start'),
    call = document.getElementById('call'),
    hangup = document.getElementById('hangup'),
    pc,
    localStream,
    remoteStream,
    started = false,
    sdpConstraints = {mandatory: {OfferToReceiveAudio: true}},
    signalSocket = new WebSocket('ws://localhost:8090');

function init() {
  call.disabled = true;
  hangup.disabled = true;
}

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

//
// Signalling comms
//

function sendMessage(message) {
  var msgString = JSON.stringify(message);
  console.log('Sending message: ' + msgString);
  signalSocket.send(msgString);
}

signalSocket.onmessage = function(event) {
  var msg = JSON.parse(event.data),
      candidate;
  console.log('got message: ' + msg);

  if (msg.type === 'offer') {
    if (!started) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    trace('Sending answer to peer.');
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
  } else if (msg.type === 'answer' && started) {
    pc.setRemoteDescription(new RTCSessionDescription(msg);
  } else if (msg.type === 'candidate' && started) {
    pc.addIceCandidate(new RTCIceCandidate({
      sdpMLineIndex: msg.label,
      candidate: msg.candidate
    }));
  } else if (msg.type === 'bye' && started) {
    setTimeout(function() { outAudio.src = ''; }, 500);
    stop();
  }
};

//
// WebRTC
//

function gotStream(stream) {
  trace('Received local stream.');
  inAudio.src = stream;
  inAudio.play();
  localStream = URL.createObjectURL(stream);
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

function stop() {
  started = false;
  pc.close();
  pc = null;
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

// Peer connection

function createPeerConnection() {
  pc = new RTCPeerConnection(null);
  pc.onicecandidate = onIceCandidate;
  pc.onaddstream = onRemoteAddStream;
  pc.onaddstream = onRemoteStreamRemoved;
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
  outAudio = URL.createObjectURL(event.stream);
  remoteStream = event.stream;
  waitForRemoteAudio();
}

function onRemoteStreamRemoved() {
  trace('Remote stream removed.');
}

function waitForRemoteAudio() {
  var audioTracks = remoteStream.getAudioTracks();
  if (audioTracks.length === 0) {
    hangup.disabled = false;
  } else {
    setTimeout(waitForRemoteAudio, 100);
  }
}

// Message handlers

//
// Button callbacks
//

start.onclick = function start() {
  trace('Requesting local stream.');
  this.disabled = true;
  navigator.webkitGetUserMedia({audio: true}, gotStream,
                               function() { console.log('Error.'); });
};

call.onclick = function() {
  maybeStart(true);
};

hangup.onclick = function() {
  trace('Ending call');
  pc.close();
  pc = null;
  this.disabled = true;
  call.disabled = false;
};


//
// Start
//

init();
