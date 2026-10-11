import type { Chrome } from '../chrome'
import type { BrowserTab, TabState, Viewport } from '../contract'
import { agentControls } from './agent'
import { createControl } from './control'
import { dispatchInput } from './input'
import { collectLogs } from './logs'
import { trackNavigation } from './navigation'
import { inspect, pick } from './pick'
import { createScreencast } from './screencast'

export interface OpenedTab {
  tab: BrowserTab
  target: string
  context: string
  follow(url: string): Promise<void>
}

const domains = ['Page', 'Runtime', 'Network', 'DOM', 'Overlay', 'Log']

const defaultViewport: Viewport = { width: 1280, height: 800, scale: 1 }

const metrics = ({ width, height, scale }: Viewport) => ({ width, height, deviceScaleFactor: scale, mobile: false })

export const openTab = async (chrome: Chrome, thread: string, changed: (state: TabState) => void): Promise<OpenedTab> => {
  const { browserContextId: context } = await chrome.browser.send<{ browserContextId: string }>('Target.createBrowserContext', { disposeOnDetach: true })
  const { id: target, cdp } = await chrome.open(context)
  let viewport = defaultViewport
  let tab: BrowserTab | undefined
  const notify = () => tab && changed(tab.state())

  for (const domain of domains) await cdp.send(`${domain}.enable`)
  await cdp.send('Emulation.setDeviceMetricsOverride', metrics(viewport))
  const navigation = await trackNavigation(cdp, notify)
  const logs = collectLogs(cdp, notify)
  const control = createControl(notify)
  const screencast = createScreencast(cdp, () => viewport)

  cdp.on<{ type: string; message: string }>('Page.javascriptDialogOpening', ({ type, message }) => {
    logs.add('info', `[${type}] ${message}`)
    cdp.fire('Page.handleJavaScriptDialog', { accept: true })
  })

  tab = {
    thread,
    state: () => ({ thread, ...navigation.state(), ...control.state(), viewport, errors: logs.errors() }),
    logs: logs.logs,
    frames: screencast.subscribe,
    closed: cdp.closed,
    async resize(next) {
      viewport = next
      await cdp.send('Emulation.setDeviceMetricsOverride', metrics(next))
      await screencast.restart()
      notify()
    },
    async input(event) {
      control.touched()
      await dispatchInput(cdp, event)
    },
    control: control.hand,
    async open(url) {
      control.touched()
      await navigation.open(url)
    },
    async history(action) {
      control.touched()
      await navigation.go(action)
    },
    inspect: point => inspect(cdp, point),
    pick: point => pick(cdp, point, navigation.state().url),
    agent: agentControls({ cdp, navigation, logs, control, viewport: () => viewport }),
  }
  return { tab, target, context, follow: navigation.open }
}
