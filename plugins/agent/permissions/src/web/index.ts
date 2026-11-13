import { botRoster } from '@sand/bots/contract'
import { waitLines } from '@sand/chat/contract'
import { inspector } from '@sand/inspector/contract'
import { pcs, wire, wireHello } from '@sand/devices-contract'
import { needs } from '@sand/needs-you/contract'
import { owned } from '@sand/reactive'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type Mode, type PermissionSettings, permissionDeadline, permissionModeSet, permissionRuleRemove, permissionSettings, settingsWire } from '../contract'
import { createModeState, modeRow, type Place } from './mode'
import { createModel } from './model'
import { permissionLine } from './line'
import { permissionNeeds } from './needs'
import { permissionsPage } from './page'

export default definePlugin({
  name: 'permissions-web',
  description: "Permission questions in Needs you, the thread's permission mode in its details card, and the Permissions settings page with bots' modes, the question deadline, saved rules and recent decisions",
  inject: { wire, pcs, kit },
  apply(ctx) {
    const { kit } = ctx
    const report = (error: unknown) => ctx.report(error)
    const model = owned(ctx, () => createModel(ctx, ctx))
    ctx.watch(needs, found => found?.source(permissionNeeds(ctx, kit, model)))
    ctx.watch(waitLines, found => found?.add(permissionLine(kit, model)))

    ctx.watch(inspector, found =>
      found?.row({
        id: 'permissions',
        group: 'place',
        order: 30,
        shows: subject => !subject.draft,
        render: subject => {
          const place = (): Place => ({ conversation: { owner: subject().owner, id: subject().session }, pc: subject().device })
          const control = createModeState(ctx.wire, place, report)
          return modeRow(kit, control)
        },
      }),
    )

    const saved = sig<PermissionSettings | undefined>(undefined)
    const keep = (call: Promise<PermissionSettings>) => void call.then(value => saved.set(value), report)
    const load = () => keep(ctx.wire.call(permissionSettings, {}))
    ctx.on(wireHello, load)
    if (ctx.wire.ready()) load()
    ctx.effect(() => ctx.wire.on(settingsWire, value => saved.set(value)))
    const page = {
      kit,
      settings: saved,
      bots: () => ctx.get(botRoster)?.list() ?? [],
      setBot: (bot: string, mode: Mode) => void ctx.wire.call(permissionModeSet, { owner: 'bot', id: bot, mode }).catch(report),
      setDeadline: (minutes: number) => keep(ctx.wire.call(permissionDeadline, { minutes })),
      removeRule: (id: string) => keep(ctx.wire.call(permissionRuleRemove, { id })),
    }
    ctx.watch(settings, found => found?.page({ id: 'permissions', label: 'Permissions', icon: 'shield', group: 'agents', order: 24, render: () => permissionsPage(page) }))
  },
})
