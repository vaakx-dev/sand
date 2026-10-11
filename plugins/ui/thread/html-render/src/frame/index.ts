import { forwardLinks } from './links'
import { reportSize } from './size'
import { relaySwipes } from './swipe'

if (window.parent !== window) {
  forwardLinks()
  reportSize()
  relaySwipes()
}
