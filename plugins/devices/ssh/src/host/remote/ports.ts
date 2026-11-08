const listenOn = (port: number) => {
  const listener = Bun.listen({ hostname: '127.0.0.1', port, socket: { data() {} } })
  const bound = listener.port
  listener.stop(true)
  return bound
}

export const freeLocalPort = (preferred?: number) => {
  if (preferred) {
    try {
      return listenOn(preferred)
    } catch {}
  }
  return listenOn(0)
}

export const randomRemotePort = () => 20000 + Math.floor(Math.random() * 40000)
