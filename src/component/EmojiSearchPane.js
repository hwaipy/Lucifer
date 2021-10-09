import React from 'react'
// import { connect } from 'react-redux'

const emojiSize = 60
const emojiInset = 10

class EmojiSearchPane extends React.Component {
  // constructor(props) {
  //   super(props);
  // }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    const height = (this.props.size.height - this.props.marginTop - 5)
    const width = this.props.size.width - 10
    const style = { position: 'absolute', top: this.props.marginTop + 'px', left: '5px', height: height + 'px', width: width + 'px' }
    if (this.props.hidden) { style['display'] = 'none' }

    return (
      <div style={style}>
        <EmojiPane width={width} emojiWidth={emojiSize} emojiHeight={emojiSize} emojiInset={emojiInset} emojis={this.props.favoriteEmojiList} onClickEmoji={(emoji) => this.props.onClickEmoji(emoji)} hidden={this.props.hidden} />
      </div>
    )
  }
}

class EmojiPane extends React.Component {
  // constructor(props) {
  //   super(props);
  // }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    const width = this.props.width
    const emojiWidth = this.props.emojiWidth
    const emojiHeight = this.props.emojiHeight
    const emojiInset = this.props.emojiInset
    const emojis = this.props.emojis

    const columnNum = parseInt((width - emojiInset) / (emojiWidth + emojiInset))
    const left = (width - columnNum * (emojiWidth + emojiInset) + emojiInset) / 2
    const top = emojiInset

    const emojiCards = []
    for (const i in emojis) {
      const row = parseInt(i / columnNum)
      const column = i % columnNum
      const emoji = emojis[i]
      const emojiCard = <EmojiCard key={i} width={emojiWidth} height={emojiHeight} left={left + column * (emojiWidth + emojiInset)} top={top + row * (emojiHeight + emojiInset)} emoji={emoji} onClick={() => { this.props.onClickEmoji(emoji) }} hidden={this.props.hidden} />
      emojiCards.push(emojiCard)
    }
    return (
      <div style={{ position: 'absolute', top: '0px', bottom: '0px', left: '0px', right: '0px', overflowY: 'auto', overflowX: 'hidden' }}>
        {emojiCards}
      </div>
    );
  }
}

class EmojiCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { content: this.props.emoji.content }
    this.needRerender = true
    this.props.emoji.onContentChange = () => {
      this.needRerender = true
      this.setState({ content: this.props.emoji.content })
    }
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  shouldComponentUpdate() {
    return this.needRerender
  }

  prepareContentData() {
    return btoa(new Uint8Array(this.state.content).reduce((data, byte) => data + String.fromCharCode(byte), ''))
  }

  render() {
    this.needRerender = false
    return (
      <div style={{ position: 'absolute', left: this.props.left + 'px', top: this.props.top + 'px', width: this.props.width + 'px', height: this.props.height + 'px', backgroundColor: 'white' }}>
        {
          this.state.content === undefined ? '' :
            <img src={'data:gif;base64,' + this.prepareContentData()} height={this.props.width + 'px'} width={this.props.width + 'px'} alt={''} onClick={this.props.onClick} />
        }
      </div>
    );
  }
}







// class Counter extends React.Component {
//   render() {
//     const { value, onIncreaseClick } = this.props
//     return (
//       <div>
//         <span>{value}</span>
//         <button onClick={onIncreaseClick}>Increase</button>
//       </div>
//     )
//   }
// }

// function mapStateToProps(state) {
//   return {
//     value: state.emo.count
//   }
// }

// function mapDispatchToProps(dispatch) {
//   return {
//     onIncreaseClick: () => dispatch({ type: 'increase' })
//   }
// }

// // const EmojiSearchPane = connect(
// //   mapStateToProps,
// //   mapDispatchToProps
// // )(Counter)

function emojiReducer(state = { count: 0, hashList: [], hashMap: {} }, action) {
  const count = state.count
  switch (action.type) {
    case 'increase':
      return Object.assign({}, state, { count: count + 1 })
    default:
      return state
  }
}

export { emojiReducer }
export default EmojiSearchPane
