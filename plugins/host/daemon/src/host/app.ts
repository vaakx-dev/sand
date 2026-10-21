import { appMain, appRoot } from '@sand/util/boot'
import type { HostApp } from '../contract'

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
