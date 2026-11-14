import { listen } from '@vaakx-dev/vrui'
import { sampleRate } from '../audio'

interface Recording {
  finish(): Promise<Blob>
  cancel(): void
}

const WAV_HEADER_BYTES = 44

const canRecord = () => window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof MediaRecorder === 'function'

const writeText = (view: DataView, at: number, text: string) => [...text].forEach((char, index) => view.setUint8(at + index, char.charCodeAt(0)))

const wavOf = (samples: Float32Array) => {
  const view = new DataView(new ArrayBuffer(WAV_HEADER_BYTES + samples.length * 2))
  writeText(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeText(view, 8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, index) => view.setInt16(WAV_HEADER_BYTES + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true))
  return new Blob([view.buffer], { type: 'audio/wav' })
}

const decoded = async (blob: Blob) => new OfflineAudioContext(1, 1, sampleRate).decodeAudioData(await blob.arrayBuffer())

const resampled = async (audio: AudioBuffer) => {
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * sampleRate)), sampleRate)
  const source = offline.createBufferSource()
  source.buffer = audio
  source.connect(offline.destination)
  source.start()
  return (await offline.startRendering()).getChannelData(0)
}

const speechOf = async (recorded: Blob) => wavOf(await resampled(await decoded(recorded)))

const record = async (): Promise<Recording> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
  const recorder = new MediaRecorder(stream)
  const parts: Blob[] = []
  const stopped = new Promise<Blob>(resolve => {
    listen<BlobEvent>(recorder, 'dataavailable', event => parts.push(event.data))
    listen(recorder, 'stop', () => {
      stream.getTracks().forEach(track => track.stop())
      resolve(new Blob(parts, { type: recorder.mimeType }))
    })
  })
  const stop = () => {
    if (recorder.state !== 'inactive') recorder.stop()
  }
  recorder.start()
  return {
    async finish() {
      stop()
      return speechOf(await stopped)
    },
    cancel: stop,
  }
}

export { canRecord, record, type Recording }
