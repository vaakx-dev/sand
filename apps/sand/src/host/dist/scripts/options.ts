export interface ScriptOptions {
  base: string
  secret: string
  from: string
  build: string
  bun: string
}

export interface InstallScript {
  contentType: string
  render(options: ScriptOptions): string
  refuse(message: string): string
}
