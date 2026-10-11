export interface RemoteObject {
  type: string
  value?: unknown
  unserializableValue?: string
  description?: string
}

export interface ExceptionDetails {
  text: string
  url?: string
  lineNumber?: number
  exception?: RemoteObject
}
