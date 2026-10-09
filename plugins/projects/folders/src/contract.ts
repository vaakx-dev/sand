declare module '@sand/protocol/wire' {
  interface WireRequests {
    'fs.browse': { path: string }
    'fs.mkdir': { path: string }
  }
}
