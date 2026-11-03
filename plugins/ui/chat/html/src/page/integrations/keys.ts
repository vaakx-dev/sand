import { keyName } from '@sand/keys/names'
import { listen } from '@vaakx-dev/vrui'
import { pressKey, shortcutKeys } from '../protocol'
import { post } from './post'

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

export const forwardKeys = () => {
  let shortcuts = new Set<string>()

  listen<MessageEvent>(window, 'message', ({ source, data }) => {
    if (source === window.parent && data?.method === shortcutKeys && Array.isArray(data.params?.keys)) shortcuts = new Set(data.params.keys)
  })

  listen<KeyboardEvent>(window, 'keydown', event => {
    if (!event.isTrusted || event.isComposing || event.defaultPrevented || typing(event.target)) return
    const key = keyName(event)
    if (!key || !shortcuts.has(key)) return
    event.preventDefault()
    post(pressKey, { key })
  })
}
