const defaultFilter = {
  '_id': 1,
  'Data.Meta': 1,
  'Data.Text': 1
}

class Chat {
  constructor(chatService, collection, initMessageCount) {
    this.worker = chatService.workerTemp
    this.chatService = chatService
    this.collection = collection
    this.sender = 'Alice'
    this.receiver = 'Bob'
    this.messages = []
    this.initMessageCount = initMessageCount
    this.onMessageListUpdate = () => { }
    this.onMessageListUpdateDebug = () => { }
  }

  setParties(sender, receiver) {
    this.sender = sender
    this.receiver = receiver
  }

  async sendText(text) {
    await this.worker.Storage.append(this.collection, {
      'Meta': {
        'Sender': this.sender,
        'Receiver': this.receiver,
        'Type': 'Text'
      },
      'Text': text
    })
    await this.chatService.updateMessageList()
    await this.updateMessageList()
  }

  async sendEmoji(emoji) {
    await this.worker.Storage.append(this.collection, {
      'Meta': {
        'Sender': this.sender,
        'Receiver': this.receiver,
        'Type': 'Emoji'
      },
      'Emoji': {
        'Content': new Uint8Array(emoji.content)
      }
    })
    await this.updateMessageList()
  }

  async sendImage(image, type) {
    await this.worker.Storage.append(this.collection, {
      'Meta': {
        'Sender': this.sender,
        'Receiver': this.receiver,
        'Type': 'Image'
      },
      'Image': {
        'Type': type,
        'Content': new Uint8Array(image)
      }
    })
    await this.updateMessageList()
  }

  async fetchLatest(after) {
    const length = this.messages.length > 0 ? 1000 : this.initMessageCount
    let latest = await this.worker.Storage.latest(this.collection, 'FetchTime', after, defaultFilter, length)
    if (latest === null || latest === undefined || latest.length === 0) return []
    if (!Array.isArray(latest)) latest = [latest]
    latest.reverse()
    console.log(latest)
    const msgs = []
    for (const i in latest) {
      const item = latest[i]
      switch (item.Data.Meta.Type) {
        case 'Text':
          msgs.push(new TextMessage(item.FetchTime, item._id, item.Data.Meta.Sender, item.Data.Meta.Receiver, item.Data.Text))
          break
        case 'Image':
          msgs.push(new ImageMessage(item.FetchTime, item._id, item.Data.Meta.Sender, item.Data.Meta.Receiver, async () => {
            const imageMessageFull = await this.worker.Storage.get(this.collection, item._id, '_id', {
              '_id': 1,
              'Data': 1,
              'FetchTime': 1
            })
            return imageMessageFull.Data.Image
          }))
          break
        case 'Emoji':
          const msg = new EmojiMessage(item.FetchTime, item._id, item.Data.Meta.Sender, item.Data.Meta.Receiver, async () => {
            const imageMessageFull = await this.worker.Storage.get(this.collection, item._id, '_id', {
              '_id': 1,
              'Data': 1,
              'FetchTime': 1
            })
            return imageMessageFull.Data.Emoji.Content
          })
          msg.load()
          msgs.push(msg)
          break
        default:
          console.log('An undefined Message.')
      }
    }
    return msgs
  }

  async updateMessageList() {
    console.log('updating ml')
    const newMessages = await this.fetchLatest(this.messages.length > 0 ? this.messages[this.messages.length - 1].time : undefined)
    if (newMessages.length > 0) {
      for (const i in newMessages) {
        if (!(this.messages.length > 0 && this.messages[this.messages.length - 1].id === newMessages[i].id))
          this.messages.push(newMessages[i])
      }
      this.onMessageListUpdate()
      this.onMessageListUpdateDebug()
    }
  }
}

class Message {
  constructor(time, id, sender, receiver, type) {
    this.time = time
    this.id = id
    this.sender = sender
    this.receiver = receiver
    this.type = type
  }
}

class TextMessage extends Message {
  constructor(time, id, sender, receiver, text) {
    super(time, id, sender, receiver, 'Text')
    this.text = text
  }
}

class ImageMessage extends Message {
  constructor(time, id, sender, receiver, loader, initImageValue) {
    super(time, id, sender, receiver, 'Image')
    this.loader = loader
    this.imageValue = initImageValue
  }

  async load(onLoad) {
    this.imageValue = await this.loader()
    onLoad()
  }
}

class EmojiMessage extends Message {
  constructor(time, id, sender, receiver, loader) {
    super(time, id, sender, receiver, 'Emoji')
    this.loader = loader
    this.imageValue = undefined
    this.onLoad = () => { }
  }

  async load() {
    this.imageValue = await this.loader()
    this.onLoad()
  }
}

export default Chat