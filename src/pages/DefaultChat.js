import React from 'react'
import './ChatPane.css';
import { Form, Button } from 'react-bootstrap';
import IFWorkerInstance from '../service/IFWorker'
import Chat from '../service/Chat'
import FavoriteEmoji from '../service/FavoriteEmoji'
import withSize from 'react-sizeme';
import { ChatItemCard, TextChatItemCard, ImageChatItemCard, EmojiChatItemCard } from '../component/ChatItemCard'
import EmojiSearchPane from '../component/EmojiSearchPane'
import ChatViewMaskPane from '../component/ChatViewMaskPane'
import ChatServcie from '../service/ChatService'

const DEBUG = false
const worker = IFWorkerInstance()
const collection = DEBUG ? 'SecretDebug' : 'Secret'
const emojiCollection = 'FavoriteEmoji'
const chatService = new ChatServcie(worker)

class DefaultChat extends React.Component {
  constructor(props) {
    super(props)
    const parameters = Object.assign({ initMsg: 10 }, parseURLParameters(this.props.location.search.substring(1)))
    this.user = parameters.user
    this.chat = new Chat(chatService, collection, parseInt(parameters.initMsg))
    this.favoriteEmoji = new FavoriteEmoji(worker, emojiCollection)
    this.state = {
      MessageList: [],
      showExtension: false,
      FavoriteEmojiList: [],
    }
    this.autoUpdateInterval = undefined
    this.maskStrategy = parameters.maskStrategy
  }

  componentDidMount() {
    this.chat.onMessageListUpdate = () => { this.setState({ MessageList: this.chat.messages }) }
    this.favoriteEmoji.onEmojiListUpdate = () => { this.setState({ FavoriteEmojiList: this.favoriteEmoji.emojis }) }
    if (this.user === 'A') {
      this.chat.setParties('Alice', 'Bob')
    } else if (this.user === 'B') {
      this.chat.setParties('Bob', 'Alice')
    } else {
      throw new Error('Not a valid user: ' + this.user)
    }
    this.autoUpdateInterval = setInterval(() => { this.chat.updateMessageList() }, 1000)
  }

  componentWillUnmount() {
    this.chat.onMessageListUpdate = () => { }
    this.favoriteEmoji.onEmojiListUpdate = () => { }
    clearInterval(this.autoUpdateInterval)
    chatService.valid = false
  }

  render() {
    return (
      <div className='ChatRoot'>
        <ChatViewMaskPane size={{ height: this.props.size.height - (this.state.showExtension ? this.props.size.height / 2 : 50), width: this.props.size.width }} maskStrategy={this.maskStrategy} onDisplayChange={() => { this.setState({ showExtension: false }) }} />
        <ChatViewPane chat={this.chat} favoriteEmoji={this.favoriteEmoji} messageList={this.state.MessageList} size={{ height: this.props.size.height - (this.state.showExtension ? this.props.size.height / 2 : 50), width: this.props.size.width }} onShowExtensionChange={(e) => { this.setState({ showExtension: e }) }} />
        <ChatInputPane chat={this.chat} favoriteEmoji={this.favoriteEmoji} favoriteEmojiList={this.state.FavoriteEmojiList} size={{ height: 50, width: this.props.size.width }} extensionSize={this.props.size.height / 2} showExtension={this.state.showExtension} onShowExtensionChange={(e) => { this.setState({ showExtension: e }) }} />
      </div>
    );
  }
}

class ChatInputPane extends React.Component {
  constructor(props) {
    super(props);
    this.input = undefined
    this.fileInput = undefined
  }

  componentDidMount() {
    this.props.favoriteEmoji.updateEmojiList()
  }

  componentWillUnmount() {
  }

  onChangeInput(e) {
    this.input = e
  }

  async onSend(e) {
    if (this.input === undefined) return
    const text = this.input.target.value
    if (text.length === 0) return
    await this.props.chat.sendText(text)
    this.input.target.value = ''
  }

  async onSendEmoji(emoji) {
    await this.props.chat.sendEmoji(emoji)
  }

  onSelectImage() {
    if (this.fileInput.files.length !== 1) return
    const file = this.fileInput.files[0]
    const reader = new FileReader()
    const chat = this.props.chat
    reader.onload = async function () {
      await chat.sendImage(this.result, file.type)
    }
    reader.readAsArrayBuffer(file)
  }

  render() {
    const height = this.props.showExtension ? this.props.extensionSize : this.props.size.height
    return (
      <div className='ChatInputPane' style={{ height: height + 'px' }}>
        <Form.Control size="lg" className='ChatInput' style={{ width: (this.props.size.width - 30 - 50 * 2) + 'px' }} onChange={this.onChangeInput.bind(this)} onKeyPress={(e) => { if (e.code === 'Enter') { this.onSend() } }} />
        <Button variant='primary' className='ChatInputButton' style={{}} onClick={() => {
          const showExtensionState = !this.props.showExtension
          this.props.onShowExtensionChange(showExtensionState)
        }}>I</Button>{' '}
        <Button variant='primary' className='ChatInputButton' style={{}} onClick={() => { this.fileInput.click() }}>+</Button>{' '}
        <EmojiSearchPane marginTop={50} size={{ height: this.props.extensionSize, width: this.props.size.width }} hidden={!this.props.showExtension} favoriteEmojiList={this.props.favoriteEmojiList} onClickEmoji={(emoji) => this.onSendEmoji(emoji)}></EmojiSearchPane>
        <input type="file" accept='.jpg, .jpeg, .png, .gif' style={{ display: 'none' }} ref={node => this.fileInput = node} onChange={this.onSelectImage.bind(this)} />
      </div>
    );
  }
}

class ChatViewPane extends React.Component {
  constructor(props) {
    super(props);
    this.state = {}
    this.contentNode = undefined
  }

  componentDidMount() {
    this.props.chat.onMessageListUpdateDebug = () => {
      this.contentNode.scrollTo(0, 99999999)
    }
  }

  componentWillUnmount() {
  }

  render() {
    const msgs = []
    for (const i in this.props.messageList) {
      const msg = this.props.messageList[i]
      const previousMsg = i === 0 ? undefined : this.props.messageList[i - 1]
      const isSent = msg.sender === this.props.chat.sender
      switch (msg.type) {
        case 'Text':
          msgs.push(<TextChatItemCard key={i} isSent={isSent} message={msg} previousMessage={previousMsg} width={this.props.size.width} />)
          break
        case 'Image':
          msgs.push(<ImageChatItemCard key={i} isSent={isSent} message={msg} previousMessage={previousMsg} width={this.props.size.width} />)
          break
        case 'Emoji':
          msgs.push(<EmojiChatItemCard key={i} isSent={isSent} message={msg} previousMessage={previousMsg} width={this.props.size.width} />)
          break
        default:
          msgs.push(<ChatItemCard key={i} isSent={isSent} message={msg} previousMessage={previousMsg} width={this.props.size.width} />)
      }
    }
    return (
      <div className='ChatViewPaneRoot' style={{ width: this.props.size.width, height: this.props.size.height }}>
        <div className='ChatViewPane' id='ChatViewPane' style={{ height: this.props.size.height + 'px', overflowY: 'auto', overflowX: 'hidden', background: '#EEEEEE' }} ref={node => this.contentNode = node} onMouseDown={() => { this.props.onShowExtensionChange(false) }} onTouchStart={() => { this.props.onShowExtensionChange(false) }}>
          {msgs}
        </div>
      </div>
    );
  }
}

function parseURLParameters(parameterString) {
  const parameters = {}
  parameterString.split("&").forEach((vara) => {
    const pair = vara.split("=")
    if (pair.length === 2) { parameters[pair[0]] = pair[1] }
  })
  return parameters
}

export default withSize({ monitorHeight: true })(DefaultChat)