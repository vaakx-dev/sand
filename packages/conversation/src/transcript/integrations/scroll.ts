const pinDistance = 80

export const nearEnd = (scroller: HTMLElement, distance = pinDistance) => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < distance

export const toEnd = (scroller: HTMLElement) => {
  scroller.scrollTop = scroller.scrollHeight
}
