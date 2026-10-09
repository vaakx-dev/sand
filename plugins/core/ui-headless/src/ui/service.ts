import type { SessionSettings } from '@sand/model/contract'
import type { Command, NoticeLevel, UI } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Printer } from '../print/printer'

export const createHeadlessUI = (printer: Printer, cwd: string, draft: () => SessionSettings | undefined) => {
  const commands = new Map<string, Command>()
  let active: Session | undefined
  let thread: string | undefined
  let errors = 0

  const notify = (text: string, level?: NoticeLevel) => {
    if (level === 'error') errors++
    printer.notice(text, level)
  }
  const refuse = (title: string) => {
    notify(`${title} needs the web UI; nothing was chosen`, 'error')
    return Promise.resolve(undefined)
  }
  const announce = (id: string) => printer.progress(`thread ${id}`)

  const service: UI = {
    command(command) {
      commands.set(command.name, command)
      return () => {
        if (commands.get(command.name) === command) commands.delete(command.name)
      }
    },
    notify,
    report: (title, rows) => printer.report(title, rows),
    pick: title => refuse(title),
    choose: title => refuse(title),
    input: title => refuse(title),
    session: () => active,
    cwd: () => cwd,
    open(session) {
      if (session && session.id !== thread) announce(session.id)
      active = session
      thread = session?.id
    },
    attach() {},
    draft,
  }

  return {
    service,
    commands,
    async outcome(work: () => unknown) {
      const before = errors
      await work()
      return errors > before ? 1 : 0
    },
    focus(session: Session | undefined) {
      active = session
      thread = session?.id
    },
    thread: () => thread,
  }
}

export type HeadlessUI = ReturnType<typeof createHeadlessUI>
