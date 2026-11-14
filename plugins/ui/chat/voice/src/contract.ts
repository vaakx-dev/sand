import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const destinations = ['off', 'local', 'cloud'] as const

export type Destination = (typeof destinations)[number]

export type Local =
  | { status: 'missing'; bytes: number }
  | { status: 'unsupported'; message: string }
  | { status: 'installing' }
  | { status: 'downloading'; done: number; total: number }
  | { status: 'checking' }
  | { status: 'ready'; device?: string }
  | { status: 'failed'; message: string }

export interface VoiceState {
  destination: Destination
  local: Local
  model: string
  openai?: { url: string }
}

export interface Transcript {
  text: string
}

export const localModel = { name: 'Parakeet TDT 0.6B v2', language: 'English' }

export const maxRecordingMs = 5 * 60_000

export const defaultCloudModel = 'gpt-4o-mini-transcribe'

const cloudChoice = () => z.object({ destination: z.literal('cloud'), model: z.string().trim().min(1) })

const choice = () => z.discriminatedUnion('destination', [z.object({ destination: z.literal('off') }), z.object({ destination: z.literal('local') }), cloudChoice()])

export type Choice = z.output<ReturnType<typeof choice>>

export const voiceState = request('voice.state', { input: () => z.object({}), output: type<VoiceState>() })

export const voiceUse = request('voice.use', { input: choice, output: type<VoiceState>() })

export const voiceWarm = request('voice.warm', { input: () => z.object({}), output: type<void>() })

export const voiceTranscribe = request('voice.transcribe', {
  input: () => z.object({ transfer: z.string().min(1), size: z.number().int().positive(), chunks: z.number().int().positive() }),
  output: type<Transcript>(),
})

export const voiceChanged = wireEvent<VoiceState>('voice.changed')

export const helloVoice = helloField<VoiceState>('voice')
