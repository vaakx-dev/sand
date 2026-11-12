import { composer } from '@sand/composer/contract'
import { wire, wireHello } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { media, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { stashAdd, stashChange, stashList, stashRemove, type Entry } from '../contract'
import { stashEntry } from './entry'

export default definePlugin({
  name: 'stash-web',
  description: 'Sets messages aside and brings them back into a chat',
  inject: { wire, kit },
  apply(ctx) {
    const entries = sig<Entry[]>([])
    const phone = media('(max-width: 767px)')
    const refresh = () => void ctx.wire.call(stashList, {}).then(list => entries.set(list), error => ctx.report(error))
    const remove = async (entry: Entry) => {
      await ctx.wire.call(stashRemove, { id: entry.id })
      entries.update(list => list.filter(other => other.id !== entry.id))
    }
    const take = (entry: Entry) => void remove(entry).catch(error => ctx.report(error))
    if (ctx.wire.ready()) refresh()
    ctx.on(wireHello, refresh)
    ctx.effect(() => ctx.wire.on(stashChange, list => entries.set(list)))
    ctx.watch(composer, found =>
      found
        ? joinDisposers(
            found.aside(async ({ text, content, chat }) => {
              const added = await ctx.wire.call(stashAdd, { text, content, chat })
              entries.update(list => [added, ...list.filter(other => other.id !== added.id)])
            }),
            found.shared('above', here => stashEntry({ kit: ctx.kit, entries, here, phone: () => phone.get(), remove, take }), 100),
          )
        : undefined,
    )
  },
})
