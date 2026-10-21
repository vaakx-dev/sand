import { errorMessage } from '@sand/util'
import { createApp, share } from 'drydock'

export const startApp = (modules: Record<string, string>) => {
  share(modules)
  const ctx = createApp()
  const exit = (code = 0, afterwards?: () => Promise<void>) =>
    void ctx
      .dispose()
      .catch(error => console.error(`could not shut sand down cleanly: ${errorMessage(error)}`))
      .then(afterwards)
      .finally(() => process.exit(code))
  return { ctx, exit }
}
