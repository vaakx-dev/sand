import { mkdir, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { draftsDir, pluginsDir } from './paths'

const exists = (path: string) => stat(path).then(
  () => true,
  () => false,
)

export const installDraft = async (home: string, plugin: string) => {
  const draft = join(draftsDir(home), plugin)
  const live = join(pluginsDir(home), plugin)
  const previous = join(draftsDir(home), `.${plugin}.previous-${Date.now()}`)
  await mkdir(pluginsDir(home), { recursive: true })
  const replacing = await exists(live)
  if (replacing) await rename(live, previous)
  try {
    await rename(draft, live)
  } catch (error) {
    if (replacing) await rename(previous, live)
    throw error
  }
  return replacing ? previous : undefined
}
