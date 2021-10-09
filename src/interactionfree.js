// let msgpack = require("@ygoe/msgpack")
let msgpack = require("./msgpack")
let JSMQ = require("./JSMQ.js")

class IFWorkerCore {
  constructor(endpoint, serviceObject, serviceName) {
    this.messageIDs = 0
    this.endpoint = endpoint
    this.serviceName = serviceName
    this.serviceObject = serviceObject
    this.dealer = new JSMQ.Dealer()
    this.dealer.onMessage = (this._onMessage).bind(this)
    this.waitingList = new Map()
    this.timeout = 10000
    setTimeout((this._timeoutLoop).bind(this), 0)
    setTimeout((this._heartbeatLoop).bind(this), 0)
    this.running = true
  }

  async connect() {
    let res = null
    let promise = new Promise(function(resolve, reject) {
      res = resolve
    })
    this.dealer.sendReady = function() {
      res()
    };
    this.dealer.connect(this.endpoint)
    await promise
  }

  async request(target, functionName, args, kwargs) {
    let content = {
      Type: "Request",
      Function: functionName,
      Arguments: args,
      KeywordArguments: kwargs
    }
    let contentBuffer = Buffer.from(msgpack.serialize(content))
    let messageID = "" + (this.messageIDs++);
    let message = this._buildMessage(messageID, target === "" ? "Broker" : "Service", target, "Msgpack", contentBuffer)

    let waitingList = this.waitingList
    let promise = new Promise(function(resolve, reject) {
      waitingList.set(messageID, [new Date().getTime(), resolve, reject])
    })
    this.dealer.send(message)
    return promise
  }

  _buildMessage(messageID, targetType, target, serialization, contentBuffer) {
    let message = new JSMQ.Message()
    message.addString("")
    message.addString("IF1")
    message.addString(messageID)
    if (targetType === "Broker" || targetType === "Service") {
      message.addString(targetType)
      message.addString(target)
    } else {
      message.addString("Direct")
      message.addString(target)
    }
    message.addString(serialization)
    message.addBuffer(contentBuffer)
    return message
  }

  _onResponse(content) {
    let responseID = content["ResponseID"];
    let result = content["Result"]
    let error = content["Error"]
    if (this.waitingList.has(responseID)) {
      let promise = this.waitingList.get(responseID)
      this.waitingList.delete(responseID)
      if (error) {
        promise[2](error)
      } else {
        promise[1](result)
      }
    }
  }

  async _onRequest(content, mid, sourcePoint) {
    let functionName = content['Function']
    let args = content['Arguments']
      // let kwargs = content['KeywordArguments']
    let func = this.serviceObject[functionName]
    let response = {
      Type: "Response",
      ResponseID: mid.toString(),
    }
    try {
      if (func) {
        response['Result'] = await Promise.resolve(func.apply(this.serviceObject, args))
      } else {
        response['Error'] = "Function [" + functionName + "] not available."
      }
    } catch (e) {
      response['Error'] = e.toString()
    }
    let responseBuffer = Buffer.from(msgpack.serialize(response))
    let messageID = "" + (this.messageIDs++);
    let message = this._buildMessage(messageID, "Direct", sourcePoint, "Msgpack", responseBuffer)
    this.dealer.send(message)
  }

  async _onMessage() {
    try {
      let message = Array.apply(null, arguments)[0];
      if (message.getSize() === 6) {
        message.popString()
        let frame2Protocol = message.popString()
        let frame3ID = message.popString()
        let frame4From = message.popString()
        let frame5Ser = message.popString()
        let frame6Content = message.popBuffer()
        if (frame2Protocol !== "IF1") {
          console.log("Invalid Protocol: " + frame2Protocol + ".");
        } else if (frame5Ser !== "Msgpack") {
          console.log("Invalid serialization: " + frame5Ser + ".");
        } else {
          let content = msgpack.deserialize(frame6Content)
          // console.log(frame6Content)
          // console.log(content)
          let messageType = content["Type"]
          if (messageType === "Response") {
            this._onResponse(content)
          } else if (messageType === "Request") {
            await this._onRequest(content, frame3ID, frame4From)
          } else {
            console.log("Bad message type: " + messageType + ".");
          }
        }
      } else {
        console.log("Invalid message that contains " + message.length + " frames.");
      }
    } catch (e) {
      console.log(e)
    }
  }

  async _timeoutLoop() {
    function clearWaitingList(_this) {
      _this.waitingList.forEach((value, key) => {
        let timeElapsed = new Date().getTime() - value[0]
        if (timeElapsed >= _this.timeout) {
          _this._onResponse({
            'ResponseID': key,
            'Error': 'Timeout',
          })
        }
      })
    }
    while (this.running) {
      await new Promise(r => setTimeout(r, 1000));
      clearWaitingList(this)
    }
    clearWaitingList(this)
  }

  async _heartbeatLoop() {
    async function doHeartbeat(_this) {
      let isReged = await _this.request('', 'heartbeat')
      if (!isReged && _this.serviceName) {
        await _this.request('', 'registerAsService', _this.serviceName)
      }
    }
    while (this.running) {
      await new Promise(r => setTimeout(r, 3000));
      doHeartbeat(this)
    }
  }

  _close() {
    this.running = false
    this.dealer.close()
  }

  _createProxy(path) {
    let __this = this

    function remoteFunction() {}
    return new Proxy(remoteFunction, {
      get: function(target, key, receiver) {
        if (key === 'then' && path === '') return undefined
        if (key === 'close' && path === '') return (__this._close).bind(__this)
        return __this._createProxy(path + '.' + key)
      },
      apply: function(target, thisArg, args) {
        let items = path.split('.')
        if (items.length !== 2 && items.length !== 3) {
          throw new Error('[' + path + '] is not a valid remote function.');
        }
        return __this.request(items[items.length - 2], items[items.length - 1], args, {})
      },
    })
  }
}

function IFWorker(endpoint, serviceObject, serviceName) {
  let core = new IFWorkerCore(endpoint, serviceObject, serviceName)
  core.connect()
  if (serviceName) {
    core.request('', 'registerAsService', serviceName)
  }
  let p = core._createProxy('')
  return p
}

export default IFWorker;