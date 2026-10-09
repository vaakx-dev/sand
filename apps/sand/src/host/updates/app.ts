import type { HostApp } from '@sand/protocol'
import { appRoot } from '../dist/root'
import { appMain } from '../dist/layout'

export const createHostApp = (main: string): HostApp => {
  let root = appRoot(main)
  return {
    root: () => root,
    main: () => appMain(root),
    use: next => {
      root = next
    },
  }
}
