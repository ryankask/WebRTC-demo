# WebRTC Demo

This repository contains some HTML5 experiments using WebRTC and
WebSockets.

## Running

1. Install WebSocket-Node: `npm install websocket`

2. Start the web server `node ws/server.js [host][:port]` (defaults to
   `127.0.0.1:8090`)

3. Open a browser and navigate to http://host:port (default:
   http://localhost:8090)

4. Open another window and do the same.

5. Press call from one of the windows.

6. Talk to yourself or a colleague.

7. Hang up

## Flow

1. Web socket connection created to support exchanging signaling
   messages (the "signaling socket"). I use
   [WebSocket-Node](https://github.com/Worlize/WebSocket-Node) for the
   server and at present the server supports two users at once.

2. One of two users intiates a call by pressing a button (say Alice)

3. Alice's `start` function is called is with initiator set to true

4. Alice creates a peer connection and an offer

5. The resulting session description (containing the offer) is sent
   via the signaling socket to Bob (message type is "offer")

6. Bob receives the message and calls `start` with initiator not set

7. Bob sets his peer connection's remote description to the
   description just received and then creates an answer.

8. The resulting session description is sent to Alice with message
   type set to "answer".

9. Alice receives the answer and sets her peer connection's remote
   description to the received description.

Any time the remote description is set on a peer connection, the `onaddstream`
will fire as soon as possible. In this example, the audio elements source will
be set to the passed stream in that callback.

`onremovestream` is called when a stream is removed and the remote description
is set again. It is not used in this example.

See [WebRTC draft](http://dev.w3.org/2011/webrtc/editor/webrtc.html)
for all the gory details.

I believe that while the above signaling exchange is happening, Alice
and Bob also exchange ICE candidates and try to find an a transport
address that "works." This is a complex topic: see
[RFC 5245](http://tools.ietf.org/html/rfc5245). Also useful is
[An Offer/Answer Model with the Session Description Protocol (SDP)](http://tools.ietf.org/html/rfc3264)

This implementation uses
[WebRTC Basics](http://www.html5rocks.com/en/tutorials/webrtc/basics/)
from HTML5 Rocks as a guide and ultimately
[the webrtc-samples project](https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/)
form Google.

These two demos were my main guides:

1. https://code.google.com/p/webrtc-samples/source/browse/trunk/demos/html/pc1.html
2. https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html

# License

See the LICENSE file.
