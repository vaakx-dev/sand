import { listen, resizeObserver } from '@sand/dom'
import { sizeChanged } from '../page/protocol'
import { post } from './post'

const pageHeight = () => {
  const root = document.documentElement
  return Math.ceil(root.scrollHeight > root.clientHeight ? root.scrollHeight : root.getBoundingClientRect().height)
}

export const reportSize = () => {
  let last = 0
  const report = () => {
    const height = pageHeight()
    if (height === last) return
    last = height
    post(sizeChanged, { height })
  }
  resizeObserver(document.documentElement, report)
  listen(document, 'DOMContentLoaded', () => {
    if (document.body) resizeObserver(document.body, report)
    report()
  })
  listen(window, 'load', report)
}
