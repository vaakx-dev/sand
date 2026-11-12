import { botMemorySpace } from '@sand/bot-memory/contract'
import { wire } from '@sand/devices-contract'
import { featureState, type FeatureState } from '@sand/features/contract'
import { markdown, type Markdown } from '@sand/markdown/contract'
import { memoryChangeWire, memoryNoteWrite, memoryRead, memoryWrite, type MemoryRef } from '@sand/memory/contract'
import { panel } from '@sand/panel/contract'
import { projectMemorySpace } from '@sand/project-memory/contract'
import { pulse, wireValues } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { threadChange, threads, threadsChange } from '@sand/web-client/contract'
import { derive, dynamicChild, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { memoryView } from './view'

interface Place {
  ref: MemoryRef
  about: string
}

const BOT_ABOUT = 'What this bot remembers across all its conversations.'
const PROJECT_ABOUT = 'Shared by every thread in this project, on all your PCs.'

const keyOf = ({ space, id }: MemoryRef) => `${space}/${id}`

export default definePlugin({
  name: 'panel-memory',
  description: "The side panel's Memory tab: a bot's own memory and notes in its chat, or the project's shared memory in a thread's chat, live and editable",
  inject: { panel, kit, wire, threads },
  apply(ctx) {
    const threadInfo = pulse(ctx, [threadChange, threadsChange])
    const features = sig<FeatureState | undefined>(undefined)
    ctx.watch(featureState, found => features.set(found))
    const remembering = () => features.get()?.on('memory') !== false
    const files = wireValues(ctx, ctx.wire, {
      key: keyOf,
      read: ref => ctx.wire.call(memoryRead, ref),
      change: memoryChangeWire,
      changed: ([ref, found]) => [keyOf(ref), found],
    })

    const projectOf = (thread: string) => {
      threadInfo.version.get()
      return ctx.threads.get(thread)?.info.project ?? undefined
    }
    const placeOf = ({ owner, session }: Subject): Place | undefined => {
      if (owner === 'bot') return { ref: { space: botMemorySpace, id: session }, about: BOT_ABOUT }
      const project = projectOf(session)
      return project === undefined ? undefined : { ref: { space: projectMemorySpace, id: project }, about: PROJECT_ABOUT }
    }

    const view = ({ ref, about }: Place, markdown: Markdown) =>
      memoryView({
        kit: ctx.kit,
        markdown,
        files: () => files(ref),
        about,
        saveMemory: text => ctx.wire.call(memoryWrite, { ...ref, text }),
        saveNote: note => ctx.wire.call(memoryNoteWrite, { ...ref, ...note }),
      })

    const render = (subject: () => Subject, markdown: Markdown) => {
      const place = derive(() => placeOf(subject()))
      const shownKey = derive(() => {
        const shown = place.get()
        return shown && keyOf(shown.ref)
      })
      return dynamicChild(shownKey, () => {
        const shown = place.get()
        return shown ? view(shown, markdown) : null
      })
    }

    ctx.watch(markdown, found =>
      found
        ? ctx.panel.tab({
            id: 'memory',
            label: 'Memory',
            icon: 'brain',
            order: 7,
            shows: subject => remembering() && placeOf(subject) !== undefined,
            render: subject => render(subject, found),
          })
        : undefined,
    )
  },
})
