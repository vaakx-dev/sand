const linuxReaders = [
  ['wl-paste', '--type', 'image/png'],
  ['xclip', '-selection', 'clipboard', '-t', 'image/png', '-o'],
]

export const clipboardImage = async (): Promise<Uint8Array | undefined> => {
  const image = Bun.Image.fromClipboard()
  if (image) return image.png().bytes()
  for (const command of linuxReaders) {
    if (!Bun.which(command[0]!)) continue
    const result = Bun.spawnSync(command)
    if (result.exitCode === 0 && result.stdout.length) return new Uint8Array(result.stdout)
  }
}
