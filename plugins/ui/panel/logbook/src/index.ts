import { botRoster, type BotRoster } from '@sand/bots/contract'
import { wire, wireHello } from '@sand/devices-contract'
import { logbookChanged } from '@sand/logbook/contract'
import { markdown } from '@sand/markdown/contract'
import { panel } from '@sand/panel/contract'
import { pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { projects, projectsChange, threadChange, threads, threadsChange } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { logbookView } from './view'

export default definePlugin({
  name: 'panel-logbook',
  description: "The side panel's Logbook tab: the dated record of finished work for the chat's project, searchable, with each entry editable",
  inject: { panel, kit, markdown, wire, threads, projects },
  apply(ctx) {
    const logbook = pulse(ctx, [wireHello])
    const known = pulse(ctx, [projectsChange], [projects])
    const threadInfo = pulse(ctx, [threadChange, threadsChange])
    const roster = sig<BotRoster | undefined>(undefined)
    ctx.watch(botRoster, found => roster.set(found))
    ctx.effect(() => ctx.wire.on(logbookChanged, logbook.bump))

    const threadProject = (session: string) => {
      threadInfo.version.get()
      return ctx.threads.get(session)?.info.project ?? undefined
    }
    const botProject = (session: string) => {
      const chosen = roster.get()?.find(session)?.projects ?? []
      return chosen.length === 1 ? chosen[0] : undefined
    }
    const homeOf = ({ owner, session }: Subject) => (owner === 'thread' ? threadProject(session) : botProject(session))
    const projectGroups = known.read(() => ctx.projects.groups())
    const projectName = (id: string) => {
      known.version.get()
      return ctx.projects.get(id)?.name
    }

    const render = (subject: () => Subject) =>
      logbookView({
        kit: ctx.kit,
        markdown: ctx.markdown,
        wire: ctx.wire,
        report: error => ctx.report(error),
        version: () => logbook.version.get(),
        home: () => homeOf(subject()),
        projects: () => projectGroups.get(),
        projectName,
      })

    ctx.effect(() =>
      ctx.panel.tab({
        id: 'logbook',
        label: 'Logbook',
        icon: 'book',
        order: 20,
        shows: () => true,
        render,
      }),
    )
  },
})
