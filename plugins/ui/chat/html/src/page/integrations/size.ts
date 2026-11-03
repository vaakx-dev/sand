import { listen, resizeObserver } from '@vaakx-dev/vrui'
import { pageHeight } from '../height'
import { sizeChanged } from '../protocol'
import { post } from './post'

export const reportSize = () => {
  let last = 0
  const report = () => {
    const height = pageHeight()
    if (height === last || height <= 0) return
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
