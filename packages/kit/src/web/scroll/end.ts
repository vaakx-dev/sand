const pinDistance = 80

export const nearEnd = (scroller: HTMLElement) => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < pinDistance

export const toEnd = (scroller: HTMLElement) => {
  scroller.scrollTop = scroller.scrollHeight
}
