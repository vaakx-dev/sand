export interface BuildInfo {
  id: string
  time: number
}

export interface DeviceInfo {
  id: string
  name: string
  platform: string
  build?: BuildInfo
}

export interface Remote extends DeviceInfo {
  url: string
  urls: string[]
}

export interface RemoteRecord extends Remote {
  key: string
}
