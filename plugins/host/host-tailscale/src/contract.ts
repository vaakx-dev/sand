export interface TailscaleState {
  installed: boolean
  running: boolean
  name?: string
  ip?: string
  https: boolean
  serving: boolean
  httpsUrl?: string
  error?: string
}

export interface HostTailscale {
  state(): TailscaleState
  refresh(): Promise<TailscaleState>
  setHttps(on: boolean): Promise<TailscaleState>
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'tailscale.get': {}
    'tailscale.set': { https: boolean }
  }

  interface WireEvents {
    'tailscale.change': [state: TailscaleState]
  }
}

declare module 'drydock' {
  interface Services {
    tailscale: HostTailscale
  }

  interface Events {
    'host.tailscale': (state: TailscaleState) => void
  }
}
