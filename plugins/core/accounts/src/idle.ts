import { duration, untilAborted } from '@sand/util'
import { type LLMEvent, StreamStalled } from './contract'

export async function* watchIdle(model: string, idleMs: number, stream: (signal: AbortSignal) => AsyncIterable<LLMEvent>, signal?: AbortSignal): AsyncIterable<LLMEvent> {
  const quiet = new AbortController()
  const attempt = signal ? AbortSignal.any([signal, quiet.signal]) : quiet.signal
  const timer = setTimeout(() => quiet.abort(new StreamStalled(`${model} sent nothing for ${duration(idleMs)}, so sand stopped waiting for it`)), idleMs)
  const events = stream(attempt)[Symbol.asyncIterator]()
  try {
    for (let next = await untilAborted(events.next(), attempt); !next.done; next = await untilAborted(events.next(), attempt)) {
      yield next.value
      timer.refresh()
    }
  } catch (error) {
    throw quiet.signal.aborted ? quiet.signal.reason : error
  } finally {
    clearTimeout(timer)
    void events.return?.()?.catch(() => {})
  }
}
