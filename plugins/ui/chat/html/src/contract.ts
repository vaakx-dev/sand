import type { Session, WireSession } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface HtmlRenderEntry {
  id: string
  title: string
  height?: number
}

export interface Artifact {
  title: string
  path: string
}

export interface LoadedPage {
  html: string
  missing: string[]
}

export interface HtmlPages {
  columnWidth: number
  maxHeight: number
  load(path: string, cwd: string): Promise<LoadedPage>
}

export const htmlPages = service<HtmlPages>('htmlPages')

export const artifactSaved = event<(session: Session, artifact: Artifact) => void>('artifact.saved')

export const htmlPage = request('html.page', { input: z.object({ session: z.string(), render: z.string() }), output: type<string>(), place: 'thread' })

export const artifactSavedWire = wireEvent<[session: WireSession, artifact: Artifact]>('artifact.saved')
