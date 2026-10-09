const opener = (url: string) => {
  if (process.env.BROWSER) return [process.env.BROWSER, url]
  if (process.platform === 'win32') return ['rundll32', 'url.dll,FileProtocolHandler', url]
  return [process.platform === 'darwin' ? 'open' : 'xdg-open', url]
}

export const openBrowser = (url: string) => {
  try {
    Bun.spawn(opener(url), { stdio: ['ignore', 'ignore', 'ignore'], detached: true, windowsHide: true }).unref()
  } catch {}
}
