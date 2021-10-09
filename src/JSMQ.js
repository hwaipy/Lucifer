const WebSocket = require('isomorphic-ws');

const Message = function() {
    var frames = [];

    this.getSize = function() {
        return frames.length;
    }

    // add string at the begining of the message
    this.prependString = function(str) {
        str = String(str);

        // one more byte is saved for the more byte
        var buffer = new Uint8Array(str.length);

        StringUtility.StringToUint8Array(str, buffer);

        frames.splice(0, 0, buffer);
    }

    // add the string at the end of the message
    this.addString = function(str) {
        str = String(str);

        // one more byte is saved for the more byte
        var buffer = new Uint8Array(str.length);

        StringUtility.StringToUint8Array(str, buffer);
        frames.push(buffer);
    }

    // pop a string from the begining of the message
    this.popString = function() {
        var frame = this.popBuffer();

        return StringUtility.Uint8ArrayToString(frame);
    }

    this.popBuffer = function() {
        var frame = frames[0];
        frames.splice(0, 1);

        return frame;
    }

    // addd buffer at the end of the message
    this.addBuffer = function(buffer) {

        if (buffer instanceof ArrayBuffer) {
            frames.push(new Uint8Array(buffer));
        } else if (buffer instanceof Uint8Array) {
            frames.push(buffer);
        } else {
            throw new Error("unknown buffer type");
        }
    }

    // return Uint8Array at location i
    this.getBuffer = function(i) {
        return frames[i];
    }
}

function Endpoint(address) {
    var ClosedState = 0;
    var ConnectingState = 1;
    var ActiveState = 2;

    var reconnectTries = 0;

    console.log("connecting to " + address);
    var webSocket = null;
    var state = ClosedState;

    var that = this;

    var incomingMessage = null;

    open();

    function open() {
        if (webSocket != null) {
            webSocket.onopen = null;
            webSocket.onclose = null;
            webSocket.onmessage = null;
        }
        webSocket = new WebSocket(address);
        webSocket.binaryType = "arraybuffer";
        state = ConnectingState;
        webSocket.onopen = onopen;
        webSocket.onclose = onclose;
        webSocket.onmessage = onmessage;
        webSocket.onError = function(e) {
            console.log(e)
        }
        reconnectTries++;
    }

    function onopen(e) {
        console.log("WebSocket opened to " + address);
        reconnectTries = 0;

        state = ActiveState;

        if (that.activated != null) {
            that.activated(that);
        }
    };

    function onclose(e) {
        console.log("WebSocket closed " + address);
        var stateBefore = state;
        state = ClosedState;

        if (stateBefore === ActiveState && that.deactivated != null) {
            that.deactivated(that);
        }

        if (reconnectTries > 10) {
            window.setTimeout(open, 2000);
        } else {
            open();
        }
    };

    function onmessage(ev) {
        // if (ev.data instanceof Blob) {
        //     var arrayBuffer;
        //     var fileReader = new FileReader();
        //     fileReader.onload = function() {
        //         processFrame(this.result);
        //     };
        //     fileReader.readAsArrayBuffer(ev.data);
        // } else 
        if (ev.data instanceof ArrayBuffer) {
            processFrame(ev.data);
        }
        // Other message type are not supported and will just be dropped
    };

    function processFrame(frame) {
        var view = new Uint8Array(frame);
        var more = view[0];
        if (incomingMessage == null) {
            incomingMessage = new Message();
        }
        incomingMessage.addBuffer(view.subarray(1));
        // last message
        if (more === 0) {
            if (that.onMessage != null) {
                that.onMessage(that, incomingMessage);
            }
            incomingMessage = null;
        }
    }
    // activated event, when the socket is open
    this.activated = null;
    // deactivated event
    this.deactivated = null;
    this.onMessage = null;

    this.getIsActive = function() {
        return state === ActiveState;
    };

    this.getIsConnecting = function() {
        return state === ConnectingState;
    }

    this.write = function(message) {
        var messageSize = message.getSize();

        for (var j = 0; j < messageSize; j++) {
            var frame = message.getBuffer(j);
            var data = new Uint8Array(frame.length + 1);
            data[0] = j === messageSize - 1 ? 0 : 1; // set the more byte
            data.set(frame, 1);
            webSocket.send(data);
        }
    };
}

function SocketBase(xattachEndpoint, xendpointTerminated, xhasOut, xsend, xonMessage) {

    this.onMessage = null;
    this.sendReady = null;

    var endpoints = [];

    this.connect = function(address) {
        var endpoint = new Endpoint(address);
        endpoint.activated = xattachEndpoint;
        endpoint.deactivated = xendpointTerminated;
        endpoint.onMessage = xonMessage;
        endpoints.push(endpoint);
    };

    this.disconnect = function(address) {
        // TODO: implement disconnect
    };

    this.isConnected = function() {
        for (let i = 0; i < endpoints.length; i++)
            if (!endpoints[i].getIsActive())
                return false;
        return true;
    }

    this.isConnecting = function() {
        for (let i = 0; i < endpoints.length; i++)
            if (!endpoints[i].getIsConnecting())
                return false;
        return true;
    }

    this.send = function(message) {
        return xsend(message);
    };

    this.getHasOut = function() {
        return xhasOut();
    };
}

const Dealer = function() {

    var endpoints = [];
    var current = 0;
    var isActive = false;
    var connected = false;
    var messageQueue = [];
    var maxQueueSize = 10

    var that = new SocketBase(xattachEndpoint, xendpointTerminated, xhasOut, xsend, xonMessage);

    function writeActivated() {
        if (that.sendReady != null) {
            that.sendReady(this);
        }
    };

    function xattachEndpoint(endpoint) {
        endpoints.push(endpoint);
        if (!isActive) {
            isActive = true;
            if (writeActivated != null) {
                writeActivated();
            }
        }
        connected = true
        while (messageQueue.length > 0 && connected) {
            xsend(messageQueue.shift())
        }
    }

    function xendpointTerminated(endpoint) {
        var index = endpoints.indexOf(endpoint);
        if (current === endpoints.length - 1) {
            current = 0;
        }
        endpoints.splice(index, 1);
        connected = false
    }

    function xhasOut() {
        // if (inprogress) return true;
        return endpoints.length > 0;
    }

    function xsend(message) {
        if (!connected) {
            if (messageQueue.length < maxQueueSize) messageQueue.push(message)
            return false
        }
        if (endpoints.length === 0) {
            isActive = false;
            return false;
        }
        endpoints[current].write(message);
        current = (current + 1) % endpoints.length;
        return true;
    }

    function xonMessage(endpoint, message) {
        if (that.onMessage != null) {
            that.onMessage(message);
        }
    }
    return that;
}

function StringUtility() {}

StringUtility.StringToUint8Array = function(str, buffer) {
    if (typeof buffer === 'undefined') {
        buffer = new Uint8Array(str.length);
    }

    for (var i = 0, strLen = str.length; i < strLen; i++) {
        var char = str.charCodeAt(i);

        if (char > 255) {
            // only ASCII are supported at the moment, we will put ? instead
            buffer[i] = "?".charCodeAt();
        } else {
            buffer[i] = char;
        }
    }

    return buffer;
}

StringUtility.Uint8ArrayToString = function(buffer) {
    return String.fromCharCode.apply(null, buffer);
}

module.exports = {
    Dealer,
    Message
}