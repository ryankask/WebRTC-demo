'use strict';

var audio1 = document.getElementById('audio-1'),
    audio2 = document.getElementById('audio-2'),
    start = document.getElementById('start'),
    call = document.getElementById('call'),
    hangup = document.getElementById('hangup'),
    pc1,
    pc2,
    localStream,
    sdpConstraints = {mandatory: {OfferToReceiveAudio: true}};

call.disabled = true;
hangup.disabled = true;


function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function gotStream(stream) {
  trace('Received local stream.');
  audio1.src = stream;
  audio1.play();
  localStream = stream;
  call.disabled = false;
}

start.onclick = function start() {
  trace('Requesting local stream.');
  this.disabled = true;
  navigator.webkitGetUserMedia({audio: true}, gotStream,
                               function() { console.log('Error.')});
};

call.onclick = function() {
  var audioTracks,
      servers;

  this.disabled = true;
  hangup.disabled = false;

  trace('Starting call');
  if (localStream.audioTracks.length > 0) {
    trace('Using audio device: ' + localStream.audioTracks[0].label);
  }

  pc1 = new webkitRTCPeerConnection(servers);
  trace('Created first local peer connection object');
  pc1.onicecandidate = iceCallback1;

  pc2 = new webkitRTCPeerConnection(servers);
  trace('Created second local peer connection object');
  pc2.onicecandidate = iceCallback2;
  pc2.onaddstream = gotRemoteStream;

  pc1.addStream(localStream);
  trace('Adding local stream to peer connection');

  pc1.createOffer(gotDescription1);
}

function gotDescription1(desc) {
  pc1.setLocalDescription(desc);
  trace('Offer from pc1 \n' + desc.sdp);
  pc2.setRemoteDescription(desc);
  pc2.createAnswer(gotDescription2, null, sdpConstraints);
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc);
  trace('Answer from pc2: \n' + desc.sdp);
  pc1.setRemoteDescription(desc);
}

hangup.onclick = function() {
  trace('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  this.disabled = true;
  call.disabled = false;
}

function gotRemoteStream(event){
  audio2.src = webkitURL.createObjectURL(event.stream);
  trace('Received remote stream');
}

function iceCallback1(event){
  if (event.candidate) {
    pc2.addIceCandidate(new RTCIceCandidate(event.candidate));
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event){
  if (event.candidate) {
    pc1.addIceCandidate(new RTCIceCandidate(event.candidate));
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}
