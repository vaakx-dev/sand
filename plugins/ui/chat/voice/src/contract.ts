import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const cloudServices = ['openai', 'groq', 'other'] as const

export type CloudService = (typeof cloudServices)[number]

export interface ServiceInfo {
  label: string
  url: string
  model: string
}

export const services: Record<CloudService, ServiceInfo> = {
  openai: { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini-transcribe' },
  groq: { label: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'whisper-large-v3-turbo' },
  other: { label: 'Other', url: '', model: '' },
}

export const destinations = ['off', 'local', 'cloud'] as const

export type Destination = (typeof destinations)[number]

export interface Cloud {
  service: CloudService
  url: string
  model: string
}

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
  cloud?: Cloud
  keys: CloudService[]
}

export interface Transcript {
  text: string
}

export const localModel = { name: 'Parakeet TDT 0.6B v2', language: 'English' }

export const maxRecordingMs = 5 * 60_000

const cloudChoice = () =>
  z.object({
    destination: z.literal('cloud'),
    service: z.enum(cloudServices),
    url: z.string().trim().url(),
    model: z.string().trim().min(1),
    key: z.string().trim().min(1).optional(),
  })

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
