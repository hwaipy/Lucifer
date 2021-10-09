import React from 'react'
import { CardImage } from 'react-bootstrap-icons';
import moment from 'moment'

class ChatItemCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {}
    this.textCardGap = 80
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  getContent() {
    return 'Not Implemented.'
  }

  getPreferedHeight() {
    return undefined
  }

  buildDisplayTime(time, previousTime) {
    const t1 = new Date(Date.parse(time))
    const t0 = new Date(Date.parse(previousTime))
    const isSameDay = (t0.getFullYear() === t1.getFullYear()) && (t0.getMonth() === t1.getMonth()) && (t0.getDate() === t1.getDate())
    const isSameMinute = (t0.getHours() === t1.getHours()) && (t0.getMinutes() === t1.getMinutes())
    if (isSameDay && isSameMinute) return ''
    const formatString = (isSameDay ? '' : 'YYYY-MM-DD ') + 'HH:mm'
    return moment(t1.getTime()).format(formatString)
  }

  render() {
    const contentStyle = {
      width: (this.props.width - this.textCardGap) + 'px',
      paddingLeft: this.props.isSent ? (this.textCardGap + 'px') : '0px',
      paddingRight: this.props.isSent ? '0px' : (this.textCardGap + 'px'),
    }
    const messageCardStyle = { left: (this.props.isSent ? (this.props.width * 0.3 - 24) : 0) + 'px' }
    const preferedHeight = this.getPreferedHeight()
    if (preferedHeight) {
      messageCardStyle['height'] = preferedHeight
    }
    const displayTime = this.buildDisplayTime(this.props.message.time, this.props.previousMessage === undefined ? '1980-01-01T00:00:00.000000+08:00' : this.props.previousMessage.time)
    return (
      <div>
        <div style={{ width: '100%', textAlign: 'center' }}>{displayTime}</div>
        <div style={contentStyle}>
          <div className={'MessageCard ' + (this.props.isSent ? 'SentMessage' : 'ReceivedMessage')} style={messageCardStyle}>
            {this.getContent()}
          </div>
        </div>
      </div>
    )
  }
}

class TextChatItemCard extends ChatItemCard {
  getContent() {
    return this.props.message.text
  }
}

class ImageChatItemCard extends ChatItemCard {
  constructor(props) {
    super(props);
    this.state = {
      imageValue: undefined
    }
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  loadImage() {
    this.props.message.load(() => { this.setState({ imageValue: this.props.message.imageValue }) })
  }

  getContent() {
    return (
      this.state.imageValue === undefined ?
        <CardImage size={100} style={{ color: '#606060' }} onClick={this.loadImage.bind(this)} /> :
        this.buildImageContent()
    )
  }

  buildImageContent() {
    const image = this.state.imageValue
    const type = image.type
    const content = image.Content
    const base64 = btoa(new Uint8Array(content).reduce((data, byte) => data + String.fromCharCode(byte), ''))
    return <img src={'data:' + type + ';base64,' + base64} height={'100px'} alt={''} />
  }
}

class EmojiChatItemCard extends ChatItemCard {
  constructor(props) {
    super(props);
    this.state = {
      imageValue: undefined
    }
    this.props.message.onLoad = () => {
      this.setState({
        imageValue: this.props.message.imageValue
      })
    }
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  getContent() {
    return (
      this.state.imageValue === undefined ? <div>Emoji Loading...</div> : this.buildEmojiContent()
    )
  }

  getPreferedHeight() {
    return 100
  }

  buildEmojiContent() {
    const content = this.state.imageValue
    const base64 = btoa(new Uint8Array(content).reduce((data, byte) => data + String.fromCharCode(byte), ''))
    return <img src={'data:gif;base64,' + base64} height={'100px'} alt={''} />
  }
}

export { ChatItemCard, TextChatItemCard, ImageChatItemCard, EmojiChatItemCard }