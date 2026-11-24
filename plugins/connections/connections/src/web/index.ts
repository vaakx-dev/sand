import { wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { connectionFlowWire, connectionsWire } from '../contract'
import { connectionsModel } from './model'
import { connectionsPage } from './page'

export default definePlugin({
  name: 'connections-web',
  description: 'Connections page in settings: connect and disconnect accounts at other services, like calendars',
  inject: { wire, kit },
  apply(ctx) {
    const model = connectionsModel(ctx.wire)
    const load = () => model.load().catch((error: unknown) => ctx.report(error))
    ctx.on(wireHello, () => void load())
    if (ctx.wire.ready()) void load()
    ctx.effect(() => ctx.wire.on(connectionsWire, value => model.state.set(value)))
    ctx.effect(() => ctx.wire.on(connectionFlowWire, model.ended))
    ctx.effect(() => model.cancel)
    ctx.watch(settings, found => found?.page({ id: 'connections', label: 'Connections', icon: 'link', group: 'accounts', order: 28, items: [{ id: 'connect', label: 'Connect an account', keywords: ['calendar', 'Google', 'Outlook', 'iCloud', 'CalDAV', 'sign in'] }], render: () => connectionsPage(ctx.kit, model) }))
  },
})
