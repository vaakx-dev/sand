import { desktop } from './desktop'
import { reference } from './local/docs'
import { contact } from './local/form'
import { gallery } from './local/gallery'
import { mail } from './local/mail'
import { news } from './local/news'
import { settings } from './local/settings'
import { shop } from './local/shop'
import type { LocalTask, Task, TaskSet } from './task'
import { account, web } from './web'

export type { Place, Seen, Tab, Task, TaskSet, Verdict } from './task'

const local: LocalTask[] = [shop, news, contact, reference, mail, settings, gallery]

export const tasks: Task[] = [...local, ...web, ...account, ...desktop]

export const computerOf: Record<TaskSet, string> = { browser: 'browser', desktop: 'desktop' }

export const promptOf = (task: Task, site: string) => `Use the computer tools on the computer "${computerOf[task.set]}" for this task.

${task.prompt(site)}

Work only through that computer. Stay read-only: never post, buy, send messages, sign in, change account or app settings, or send a form unless the task says to. When you are done, end with a short reply.`

export const serveSite = () => {
  const byId = new Map(local.map(task => [task.id, task]))
  return Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(request) {
      const url = new URL(request.url)
      const [, id = '', ...rest] = url.pathname.split('/')
      const html = byId.get(id)?.page(`/${rest.join('/')}`, url.searchParams)
      return html ? new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }) : new Response('Not found', { status: 404 })
    },
  })
}
