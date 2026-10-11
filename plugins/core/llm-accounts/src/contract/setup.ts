export interface ModelSetup {
  start(): void
}

declare module 'drydock' {
  interface Services {
    modelSetup: ModelSetup
  }
}
