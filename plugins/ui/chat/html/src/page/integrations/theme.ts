import { listen } from '@vaakx-dev/vrui'
import { hostContext, themeStyle } from '../protocol'

export const followTheme = () => {
  const style = document.getElementById(themeStyle)
  if (!style) return
  listen<MessageEvent>(window, 'message', ({ source, data }) => {
    if (source === window.parent && data?.method === hostContext && typeof data.params?.css === 'string') style.textContent = data.params.css
  })
}
