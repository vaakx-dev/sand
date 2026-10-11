export const swipeMessage = 'sand/swipe'

export const swipeLock = 10

export const swipeRelay = `(() => {
  if (window.parent === window) return
  let press
  const post = params => window.parent.postMessage({ jsonrpc: '2.0', method: ${JSON.stringify(swipeMessage)}, params }, '*')
  const scrolls = (node, overflow) => (node === document.scrollingElement ? !/hidden|clip/.test(overflow) : /auto|scroll/.test(overflow))
  const canScroll = (node, dx) => (dx > 0 ? node.scrollLeft > 1 : node.scrollLeft < node.scrollWidth - node.clientWidth - 1)
  const keeps = (target, dx) => {
    if (getSelection()?.isCollapsed === false) return true
    for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
      if (node.matches('input, textarea, select, [contenteditable]')) return true
      const { touchAction, overflowX } = getComputedStyle(node)
      if (!/auto|manipulation|pan-x/.test(touchAction)) return true
      if (scrolls(node, overflowX) && canScroll(node, dx)) return true
    }
    return false
  }
  const release = ({ timeStamp }) => {
    if (press?.relaying) post({ phase: 'end', time: timeStamp })
    press = undefined
  }
  addEventListener('touchstart', event => {
    release(event)
    const [touch] = event.touches
    if (event.touches.length === 1) press = { x: touch.clientX, y: touch.clientY, target: event.target, relaying: false }
  }, { passive: true })
  addEventListener('touchmove', event => {
    if (!press) return
    const { clientX, clientY } = event.touches[0]
    if (!press.relaying) {
      const dx = clientX - press.x
      const dy = clientY - press.y
      if (Math.abs(dy) > ${swipeLock} && Math.abs(dy) > Math.abs(dx)) return void (press = undefined)
      if (Math.abs(dx) < ${swipeLock}) return
      if (event.defaultPrevented || keeps(press.target, dx)) return void (press = undefined)
      press.relaying = true
      post({ phase: 'start', x: clientX, time: event.timeStamp })
    }
    if (event.cancelable) event.preventDefault()
    post({ phase: 'move', x: clientX, time: event.timeStamp })
  }, { passive: false })
  addEventListener('touchend', release)
  addEventListener('touchcancel', release)
})()`
