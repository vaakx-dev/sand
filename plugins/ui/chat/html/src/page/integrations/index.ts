import { forwardImages } from './images'
import { forwardKeys } from './keys'
import { forwardLinks } from './links'
import { reportSize } from './size'
import { relaySwipes } from './swipe'
import { followTheme } from './theme'

if (window.parent !== window) {
  followTheme()
  forwardImages()
  forwardKeys()
  forwardLinks()
  reportSize()
  relaySwipes()
}
