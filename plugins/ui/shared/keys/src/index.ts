import { kit } from '@sand/ui-kit/contract'
import { listen } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { keys, type Keys, type Shortcut } from './contract'
import { chorded, keyName, normalKey } from './names'

interface Bound {
  shortcut: Shortcut
  key: string
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

export default definePlugin({
  name: 'keys',
  description: 'Keybinding host: one window listener runs shortcuts',
  inject: { kit },
  apply(ctx) {
    let bindings: Bound[] = []

    const allowed = ({ shortcut }: Bound, key: string, event: KeyboardEvent) =>
      (shortcut.global || chorded(key) || !typing(event.target)) && (shortcut.when?.(event) ?? true)

    const find = (key: string, event: KeyboardEvent) => bindings.findLast(bound => bound.key === key && allowed(bound, key, event))

    const press = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const key = keyName(event)
      const hit = key && find(key, event)
      if (!hit) return
      event.preventDefault()
      try {
        hit.shortcut.run()
      } catch (error) {
        console.error(error)
      }
    }

    const host: Keys = {
      bind(shortcut) {
        const bound = { shortcut, key: normalKey(shortcut.key, ctx.kit.isMac()) }
        bindings = [...bindings, bound]
        return () => {
          bindings = bindings.filter(candidate => candidate !== bound)
        }
      },
    }

    ctx.effect(() => listen<KeyboardEvent>(window, 'keydown', press))
    ctx.provide(keys, host)
  },
})
