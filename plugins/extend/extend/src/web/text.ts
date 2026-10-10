import type { WebState } from './match'

const ago = (at: number) => {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000))
  return seconds < 120 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`
}

const browserStatus = ({ browser }: WebState) => (browser ? `, browser ${browser.status}${browser.error ? ' with errors' : ''}` : '')

export const webLine = (state: WebState) =>
  `web ${state.id}: ${state.enabled ? 'enabled' : 'disabled'}${state.problem ? ', build failed' : ''}${browserStatus(state)}`

export const noBrowser = (states: WebState[]) =>
  states.length && !states.some(state => state.browser) ? 'No open page has reported web extension status since the server started.' : ''

const list = (label: string, items: string[] | undefined) => (items?.length ? `  ${label}: ${items.join(', ')}` : '')

export const webDetail = (state: WebState) => {
  const browser = state.browser
  return [
    `web extension: ${state.id}${state.label ? ` (${state.label})` : ''}${state.summary ? ` - ${state.summary}` : ''}`,
    `  ${state.enabled ? 'enabled' : 'disabled'}, ${state.builtin ? 'built in' : 'installed'}, ${state.bundled ? 'in the page bundle' : 'not in the page bundle'}`,
    list('roles', state.provides),
    state.problem ? `  build error:\n${state.problem.split('\n').slice(0, 8).join('\n')}` : '',
    browser ? `  browser: ${browser.status} (reported ${ago(browser.at)})` : '  browser: no report yet (no page open since the server started)',
    list('needs', browser?.inject),
    list('waiting for', browser?.missing),
    browser?.error ? `  browser error: ${browser.error}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
