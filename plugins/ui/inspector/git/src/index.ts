import { inspector } from '@sand/inspector/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { wire } from '@sand/devices-contract'
import { toastsOf } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { onInterval, sig, type Sig, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type ActionId, actionsFor, type GitFacts, nextAction, stateText } from './actions'
import { gitModel } from './model'
import { gitRow, type Failure } from './row'
import { stepsFor } from './steps'

const renewMs = 2 * 60_000

export default definePlugin({
  name: 'inspector-git',
  description: "The inspector's git actions row: the most useful next git step for the thread's folder, and the rest in a menu",
  inject: { inspector, kit, wire },
  apply(ctx) {
    const model = gitModel(ctx, ctx.wire)
    const notices = toastsOf(ctx)

    const titleOf = ({ session }: Subject, { local }: GitFacts) =>
      ctx.get(threads)?.get(session)?.info.title.trim() || (local.branch ? `Changes on ${local.branch}` : 'Changes')

    const report = (id: ActionId, title: string, error: unknown) => {
      notices.error(title, error, { id: `inspector-git:${id}` })
    }

    const runner = (subject: () => Subject, busy: Sig<string | undefined>) => async (id: ActionId, failure: Failure) => {
      const current = untrack(subject)
      const facts = untrack(() => model.factsOf(current))
      const { session, device, cwd } = current
      if (!facts || !cwd) return
      const step = stepsFor({
        wire: ctx.wire,
        place: { session, device, cwd },
        facts,
        title: titleOf(current, facts),
        opened: pull => {
          if (facts.local.branch) model.opened({ device, cwd, branch: facts.local.branch }, pull)
          ctx.kit.openTab(pull.url)
        },
        open: ctx.kit.openTab,
      })[id]
      busy.set(step.busy)
      try {
        const done = await step.run()
        notices.show({ tone: 'success', ...done })
      } catch (error) {
        if (failure === 'raise') throw error
        report(id, step.failed, error)
      } finally {
        busy.set(undefined)
      }
    }

    const render = (subject: () => Subject) => {
      const busy = sig<string | undefined>(undefined)
      const facts = () => model.factsOf(subject())
      const actions = () => {
        const found = facts()
        return found ? actionsFor(found) : []
      }
      const renew = () => {
        const { device, cwd } = untrack(subject)
        if (cwd) model.renew({ device, cwd })
      }
      renew()
      onInterval(renew, renewMs)
      return gitRow(ctx.kit, {
        actions,
        label: () => busy.get() ?? nextAction(actions())?.label ?? 'Nothing to commit',
        end: () => {
          const found = facts()
          return found ? stateText(found) : ''
        },
        busy: () => busy.get() !== undefined,
        run: runner(subject, busy),
      })
    }

    ctx.effect(() =>
      ctx.inspector.row({
        id: 'git',
        group: 'git',
        order: 50,
        shows: subject => !subject.draft && model.factsOf(subject) !== undefined,
        render,
      }),
    )
  },
})
