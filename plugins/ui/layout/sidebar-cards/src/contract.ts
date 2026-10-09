import type { Nav } from '@sand/dom'

declare module 'drydock' {
  interface Services {
    nav: Nav
  }
}
