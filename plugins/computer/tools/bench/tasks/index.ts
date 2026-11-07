import { desktop } from './desktop'
import { auditCount } from './local/audit-count'
import { booking } from './local/booking'
import { canvasChart } from './local/canvas-chart'
import { canvasEditor } from './local/canvas-editor'
import { combobox } from './local/combobox'
import { compareTabs } from './local/compare-tabs'
import { dashboardPopups } from './local/dashboard-popups'
import { datePicker } from './local/date-picker'
import { reference } from './local/docs'
import { filesMenu } from './local/files-menu'
import { contact } from './local/form'
import { invoiceEntry } from './local/invoice-entry'
import { popupAuth } from './local/popup-auth'
import { toastCode } from './local/toast-code'
import { gallery } from './local/gallery'
import { holdRevoke } from './local/hold-revoke'
import { kanban } from './local/kanban'
import { mail } from './local/mail'
import { news } from './local/news'
import { playlistDnd } from './local/playlist-dnd'
import { priceSlider } from './local/price-slider'
import { richText } from './local/rich-text'
import { settings } from './local/settings'
import { shapeCount } from './local/shape-count'
import { sheet } from './local/sheet'
import { shiftingList } from './local/shifting-list'
import { shop } from './local/shop'
import { storeMap } from './local/store-map'
import { supportIframe } from './local/support-iframe'
import { virtualList } from './local/virtual-list'
import type { LocalTask, Task, TaskSet } from './task'
import { account, web } from './web'

export { kinds, type Kind, type Place, type Seen, type Tab, type Task, type TaskSet, type Verdict } from './task'

const local: LocalTask[] = [
  shop,
  news,
  contact,
  reference,
  mail,
  settings,
  gallery,
  booking,
  virtualList,
  sheet,
  kanban,
  priceSlider,
  filesMenu,
  datePicker,
  combobox,
  dashboardPopups,
  storeMap,
  supportIframe,
  canvasChart,
  canvasEditor,
  richText,
  playlistDnd,
  compareTabs,
  shiftingList,
  invoiceEntry,
  auditCount,
  toastCode,
  popupAuth,
  holdRevoke,
  shapeCount,
]

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
