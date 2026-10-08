import type { RemoteClient, WireEvent } from '@sand/protocol'
import type { HeadlessUI } from '../ui/service'

export const answerRelay = (client: RemoteClient, ui: HeadlessUI) =>
  client.listen((name, args) => {
    const event = { name, args } as WireEvent
    const answer = (request: Parameters<RemoteClient['call']>[0]) => void client.call(request).catch(() => {})
    switch (event.name) {
      case 'ui.notify':
        return ui.service.notify(...event.args)
      case 'ui.report':
        return ui.service.report(...event.args)
      case 'ui.open':
        if (event.args[0]) ui.opened(event.args[0].info.id)
        return
      case 'ui.pick':
        void ui.refuse(event.args[0].title)
        return answer({ type: 'ui.pick.result', pick: event.args[0].id, index: null })
      case 'ui.input':
        void ui.refuse(event.args[0].title)
        return answer({ type: 'ui.input.result', input: event.args[0].id, value: null })
    }
  })
