import { wire, wireHello } from '@sand/devices-contract'
import type { TurnEnding } from '@sand/engine/contract'
import { transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { helloResumes, type Resume, resumeAlternative, resumeCancel, resumesChange, resumeSwitch } from '../contract'
import { limitLine } from './line'

export default definePlugin({
  name: 'usage-resume-web',
  description: 'Shows in the chat when a turn ran out of usage and when it picks up again, with a way to cancel that',
  inject: { wire, kit },
  apply(ctx) {
    const resumes = sig<Resume[]>([])
    const hello = () => resumes.set(ctx.wire.hello(helloResumes) ?? [])
    const planned = (turn: string | undefined) => resumes.get().some(resume => resume.turn === turn)
    const cancel = (turn: string) => void ctx.wire.call(resumeCancel, { turn }).catch(error => ctx.report(error))

    hello()
    ctx.on(wireHello, hello)
    ctx.effect(() => ctx.wire.on(resumesChange, found => resumes.set(found)))
    ctx.watch(transcript, found =>
      found?.ending('limited', ({ data, turn }) =>
        limitLine(ctx.kit, {
          resetsAt: (data as TurnEnding).resetsAt,
          planned: () => planned(turn),
          cancel: () => turn && cancel(turn),
          alternative: () => (turn ? ctx.wire.call(resumeAlternative, { turn }).catch(() => undefined) : Promise.resolve(undefined)),
          switchTo: ({ model }) => (turn ? ctx.wire.call(resumeSwitch, { turn, model }).catch(error => ctx.report(error)) : Promise.resolve()),
        }),
      ),
    )
  },
})
