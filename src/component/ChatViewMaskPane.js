import React from 'react'
import withSize from 'react-sizeme';

class ChatViewMaskPane extends React.Component {
  constructor(props) {
    super(props)
    this.maskStrategy = new MaskStrategy(this.props.maskStrategy, () => { this.setDisplayState(this.maskStrategy.display) })
    this.state = {
      display: this.maskStrategy.display
    }
    this.checkStateInterval = undefined
    this.touchedTime = 0
    this.touchPosition = [0, 0]
    this.touching = false
    this.touchButtonSize = 60
    this.onDisplayChange = this.props.onDisplayChange
    this.globalEventKey = ['contextmenu', 'click', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseover', 'mouseout', 'mouseup', 'keydown', 'keypress', 'keyup', 'touchstart', 'touchend', 'touchmove']
  }

  componentDidMount() {
    document.addEventListener("visibilitychange", this.onDocumentVisivilityChange.bind(this))
    document.getElementById("ChatViewPane").ondblclick = (e) => { this.maskStrategy.onContentAction(e) }
    this.globalEventKey.forEach(e => { document.addEventListener(e, this.maskStrategy.onGlobalAction.bind(this.maskStrategy)) })
    this.maskStrategy.turnOnIdle()
  }

  componentWillUnmount() {
    document.removeEventListener("visibilitychange", this.onDocumentVisivilityChange.bind(this))
    this.maskStrategy.turnOffIdle()
    document.getElementById("ChatViewPane").ondblclick = undefined
    this.globalEventKey.forEach(e => { document.removeEventListener(e, this.maskStrategy.onGlobalAction.bind(this.maskStrategy)) })
  }

  onDocumentVisivilityChange() {
    if (document.hidden) {
      this.maskStrategy.setMaskState(true)
    }
  }

  onMaskPaneSurfaceEvent(e) {
    const positionSource = (e.touches && e.touches.length > 0) ? e.touches[0] : e
    const position = { x: positionSource.clientX / this.props.size.width, y: positionSource.clientY / this.props.size.height }
    switch (e.type) {
      case 'mousedown':
      case 'touchstart':
        this.maskStrategy.onSurfaceAction('begin', position)
        break
      case 'mousemove':
      case 'touchmove':
        this.maskStrategy.onSurfaceAction('move', position)
        break
      case 'mouseup':
      case 'touchend':
        this.maskStrategy.onSurfaceAction('end', position)
        break
      case 'touchcancel':
        this.maskStrategy.onSurfaceAction('cancel', position)
        break
      default:
    }
  }

  setDisplayState(display) {
    if (display !== this.state.display) {
      this.setState({ display: display })
      this.onDisplayChange()
    }
  }

  render() {
    const styleCover = {
      width: '100%',
      height: this.props.size.height + 'px',
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundColor: 'white'
    }
    if (!this.state.display) { styleCover['opacity'] = '0.0' }
    const styleRoot = {
      overflow: 'hidden',
      position: 'absolute',
      left: this.state.display ? '0px' : this.props.size.width - this.touchButtonSize,
      top: this.state.display ? '0px' : this.props.size.height - this.touchButtonSize,
      width: this.state.display ? this.props.size.width : this.touchButtonSize,
      height: this.state.display ? this.props.size.height : this.touchButtonSize,
      zIndex: '9990'
    }
    return (
      <div style={styleRoot} onTouchStart={this.onMaskPaneSurfaceEvent.bind(this)} onTouchMove={this.onMaskPaneSurfaceEvent.bind(this)} onTouchEnd={this.onMaskPaneSurfaceEvent.bind(this)} onTouchCancel={this.onMaskPaneSurfaceEvent.bind(this)} onMouseDown={this.onMaskPaneSurfaceEvent.bind(this)} onMouseUp={this.onMaskPaneSurfaceEvent.bind(this)} onMouseMove={this.onMaskPaneSurfaceEvent.bind(this)}>
        <div style={styleCover} >
          <img src={'./cover.png'} width={this.props.size.width + 'px'} alt={''} draggable='false' />
          <img src={'./cover2.png'} width={this.props.size.width + 'px'} alt={''} draggable='false' />
        </div>
      </div>
    );
  }
}

class MaskStrategy {
  constructor(strategy, onMaskStateChange) {
    this.strategy = strategy
    this.display = (strategy !== 'none')
    this.actions = []
    this.idleInterval = undefined
    this.onMaskStateChange = onMaskStateChange
    this.lastActionTime = new Date().getTime()
  }

  turnOnIdle() {
    if (this.idleInterval === undefined) this.idleInterval = setInterval(() => { this.onSurfaceAction('idle', null) }, 100)
  }

  turnOffIdle() {
    clearInterval(this.idleInterval)
    this.idleInterval = undefined
  }

  onSurfaceAction(type, position) {
    this.actions.push({
      type: type,
      position: position,
      time: new Date().getTime()
    })
    const order = this.parseActionList()
    switch (order) {
      case 'unmask':
        this.setMaskState(false)
        break
      default:
    }
    const idleTime = new Date().getTime() - this.lastActionTime
    if (idleTime > 60000) this.maskTimeout()
  }

  onContentAction(event) {
    if (event.type === 'dblclick') {
      let target = event.target
      while (target != null) {
        if (target.id === 'ChatViewPane') {
          this.setMaskState(true)
          return
        }
        if (target.className.split(' ').indexOf('MessageCard') >= 0) { return }
        target = target.parentElement
      }
    }
  }

  onGlobalAction(event) {
    this.lastActionTime = new Date().getTime()
  }

  maskTimeout() {
    if (this.strategy !== 'none' && this.strategy !== 'simple') {
      this.setMaskState(true)
    }
  }

  setMaskState(display) {
    if (this.strategy !== 'none') {
      this.display = display
      this.onMaskStateChange()
    }
  }

  parseActionList() {
    this.clearExpiredActions()
    this.clearHeadlessActions()
    if (this.actions.length > 0) {
      if (this.actions[this.actions.length - 1].type === 'end') {
        const order = this.parseGestureAction()
        this.actions.splice(0)
        return order
      }
    }
    return 'nothing'
  }

  clearExpiredActions() {
    const expirationTime = this.actions[this.actions.length - 1].time - 10000
    while (this.actions.length > 0) { if (this.actions[0].time > expirationTime) { return } else { this.actions.shift() } }
  }

  clearHeadlessActions() {
    while (this.actions.length > 0) { if (this.actions[0].type === 'begin') { return } else { this.actions.shift() } }
    if (this.actions.length > 0 && this.actions[this.actions.length - 1].type === 'cancel') { this.actions.splice(0) }
  }

  parseGestureAction() {
    const path = this.actions.filter((a) => { return a.type !== 'idle' }).map((a) => { return a.position }).filter((p) => { return !isNaN(p.x) && !isNaN(p.y) })
    const begin = path[0]
    const end = path[path.length - 1]
    const deltaX = end.x - begin.x
    const deltaY = end.y - begin.y
    if (deltaX > 0.5 && Math.abs(deltaY) < 0.1) {
      if (this.strategy === 'strict') {
        return (begin.x < 0.25) && (begin.y > 0.9) ? 'unmask' : 'nothing'
      } else {
        return 'unmask'
      }
    } else { return 'nothing' }
  }
}

export default withSize({ monitorHeight: true })(ChatViewMaskPane)
