const opener = () => process.env.BROWSER || (process.platform === 'darwin' ? 'open' : 'xdg-open')

export const openBrowser = (url: string) => {
  try {
    Bun.spawn([opener(), url], { stdio: ['ignore', 'ignore', 'ignore'], detached: true }).unref()
  } catch {}
}
