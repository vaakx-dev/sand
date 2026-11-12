import { botRoute } from '@sand/bots/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { Parts } from './parts'

const leave = ({ ctx }: Parts, id: string) => {
  const route = ctx.shell.current()
  if (route.kind === botRoute && route.id === id) ctx.shell.land({ forget: { kind: botRoute, id } })
}

export const deleteAction = (parts: Parts, id: string, name: string): MenuAction => ({
  id: 'delete',
  label: 'Delete',
  icon: 'trash',
  danger: true,
  confirm: `Delete ${name}, its chat, plan and memory?`,
  run: async () => {
    await parts.store.remove(id)
    leave(parts, id)
  },
})
