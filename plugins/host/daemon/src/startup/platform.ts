import type { Entry } from './entry'

export interface Platform {
  startsWhen: string
  unattended: string
  where(entry: Entry): string
  installed(entry: Entry): Promise<boolean>
  install(entry: Entry): Promise<void>
  uninstall(entry: Entry): Promise<void>
}
