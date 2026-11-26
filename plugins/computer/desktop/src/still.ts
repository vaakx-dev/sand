interface Stillness<Frame> {
  frame: () => Frame
  stillMs: number
  pollMs: number
  longestMs: number
}

const untilStill = async <Frame>({ frame, stillMs, pollMs, longestMs }: Stillness<Frame>) => {
  const deadline = Date.now() + longestMs
  let last = frame()
  let changedAt = Date.now()
  while (Date.now() - changedAt < stillMs && Date.now() < deadline) {
    await Bun.sleep(pollMs)
    const next = frame()
    if (next !== last) [last, changedAt] = [next, Date.now()]
  }
}

export { untilStill }
