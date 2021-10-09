class ChatServcie {
  constructor(worker) {
    this.worker = worker
    this.workerTemp = worker
    this.workQueue = []
    this.valid = true
    setTimeout(async () => {
      while (this.valid) {
        if (this.workQueue.length === 0) await new Promise((e) => setTimeout(e, 50))
        else await this.loop()
      }
    }, 50)
  }

  async loop() {
    console.log('in loop 23')
    // merge duplicated UpdateMessageList actions
    const action = this.workQueue.shift()
    console.log(action)
    switch (action.action) {
      case 'UpdateMessageList':
        console.log('UpdateMessageList')
        break
    }


  }

  async updateMessageList() {
    this.workQueue.push({
      action: 'UpdateMessageList',
      complete: () => { }
    })
  }
}

export default ChatServcie