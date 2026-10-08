import type { Keys, Shortcut } from '@sand/protocol'
import { chorded, errorMessage, keyName, listen, normalKey } from '@sand/dom'
import { definePlugin } from 'drydock'

interface Bound {
  shortcut: Shortcut
  key: string
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

export default definePlugin({
  name: 'keys',
  description: 'Keybinding host: one window listener runs shortcuts',
  uses: { notify: 'shortcut errors go to the console' },
  apply(ctx) {
    let bindings: Bound[] = []

    const find = (key: string, event: KeyboardEvent) =>
      bindings.findLast(bound => bound.key === key && (bound.shortcut.global || chorded(key) || !typing(event.target)))

    const press = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const key = keyName(event)
      const hit = key && find(key, event)
      if (!hit) return
      event.preventDefault()
      try {
        hit.shortcut.run()
      } catch (error) {
        if (ctx.notify) ctx.notify.push(errorMessage(error), { level: 'error' })
        else console.error(error)
      }
    }

    const keys: Keys = {
      bind(shortcut) {
        const bound = { shortcut, key: normalKey(shortcut.key) }
        bindings = [...bindings, bound]
        return () => {
          bindings = bindings.filter(candidate => candidate !== bound)
        }
      },
    }

    ctx.effect(() => listen(window, 'keydown', event => press(event as KeyboardEvent)))
    ctx.provide('keys', keys)
  },
})
