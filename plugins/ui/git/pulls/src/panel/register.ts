import { panels } from '@sand/panel/contract'
import { effect, mount } from '@vaakx-dev/vrui'
import type { PullParts } from '../parts'
import { needsAttention } from '../pull/look'
import { panelId } from './id'
import { pullPage } from './page'

const lookOf = (parts: PullParts) => {
  const links = parts.links.get()
  return {
    hidden: links.length === 0,
    attention: links.some(link => needsAttention(link.summary)),
    badge: links.length > 1 ? links.length : undefined,
  }
}

export const registerPanel = (parts: PullParts) =>
  parts.ctx.watch(panels, host => {
    if (!host) return
    const handle = host.panel({ id: panelId, title: 'PR', icon: 'pull-request', order: 27, ...lookOf(parts), render: body => mount(body, pullPage(parts)) })
    const stop = effect(() => handle.update(lookOf(parts)))
    return () => {
      stop()
      handle.dispose()
    }
  })
