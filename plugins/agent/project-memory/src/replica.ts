import type { Memory } from '@sand/memory/contract'
import { keyedSerial } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  type Exchanged,
  type FileRef,
  type FileVersions,
  fileVersions,
  memoryFile,
  noteFile,
  noteOfFile,
  projectId,
  projectMemorySpace,
  type ProjectVersions,
  type Revision,
  type Version,
} from './contract'

interface ReplicaOptions {
  memory: Memory
  root: string
}

interface Recorded {
  versions: FileVersions
  texts: Map<string, string>
  edited: string[]
}

const VERSIONS_FILE = 'versions.json'

const hashOf = (text: string) => Bun.hash(text).toString(36)

const EMPTY_HASH = hashOf('')

const newer = (version: Version | undefined, than: Version | undefined) =>
  version !== undefined && (than === undefined || version.at > than.at || (version.at === than.at && version.hash > than.hash))

const versionOf = ({ at, text }: Revision): Version => ({ at, hash: hashOf(text) })

const createReplica = ({ memory, root }: ReplicaOptions) => {
  const serial = keyedSerial()
  const folder = (project: string) => join(root, project)
  const versionsPath = (project: string) => join(folder(project), VERSIONS_FILE)
  const refOf = (project: string) => ({ space: projectMemorySpace, id: project })

  const saved = async (project: string): Promise<FileVersions> => {
    const file = Bun.file(versionsPath(project))
    return (await file.exists()) ? fileVersions().parse(await file.json()) : {}
  }

  const save = async (project: string, versions: FileVersions) => {
    await mkdir(folder(project), { recursive: true })
    await writeAtomic(versionsPath(project), JSON.stringify(versions))
  }

  const textsOf = async (project: string) => {
    const ref = refOf(project)
    const [text, notes] = await Promise.all([memory.read(ref), memory.notes(ref)])
    return new Map([[memoryFile, text], ...notes.map(note => [noteFile(note.name), note.text] as const)])
  }

  const firstSeen = async (project: string, file: string) => Math.floor((await stat(join(folder(project), file))).mtimeMs)

  const record = async (project: string, at = Date.now()): Promise<Recorded> => {
    const [known, texts] = await Promise.all([saved(project), textsOf(project)])
    const hashes = new Map([...new Set([...Object.keys(known), ...texts.keys()])].map(file => [file, hashOf(texts.get(file) ?? '')]))
    const edited = [...hashes].filter(([file, hash]) => (known[file]?.hash ?? EMPTY_HASH) !== hash).map(([file]) => file)
    const stamp = async (file: string) => {
      const before = known[file]
      return before ? Math.max(at, before.at + 1) : firstSeen(project, file)
    }
    const stamped = await Promise.all(edited.map(async file => [file, { at: await stamp(file), hash: hashes.get(file) ?? EMPTY_HASH }] as const))
    const versions = { ...known, ...Object.fromEntries(stamped) }
    if (edited.length) await save(project, versions)
    return { versions, texts, edited }
  }

  const recorded = (project: string, at?: number) => serial(project, () => record(project, at))

  const revisionOf = (project: string, { versions, texts }: Recorded, file: string): Revision => ({
    project,
    file,
    at: versions[file]?.at ?? 0,
    text: texts.get(file) ?? '',
  })

  const projects = async () => {
    if (!existsSync(root)) return []
    const entries = await readdir(root, { withFileTypes: true })
    return entries.filter(entry => entry.isDirectory() && projectId().safeParse(entry.name).success).map(entry => entry.name)
  }

  const snapshot = async () => new Map(await Promise.all((await projects()).map(async project => [project, await recorded(project)] as const)))

  const versionsIn = (found: Map<string, Recorded>): ProjectVersions => Object.fromEntries([...found].map(([project, { versions }]) => [project, versions]))

  const revisions = async (refs: FileRef[]) => {
    const byProject = [...Map.groupBy(refs, ref => ref.project)]
    const found = await Promise.all(byProject.map(async ([project, group]) => {
      const current = await recorded(project)
      return group.map(({ file }) => revisionOf(project, current, file))
    }))
    return found.flat()
  }

  const write = (project: string, { file, text }: Revision) => {
    const name = noteOfFile(file)
    return name === undefined ? memory.write(refOf(project), text) : memory.writeNote(refOf(project), { name, text })
  }

  const take = (project: string, offered: Revision[]) =>
    serial(project, async () => {
      const { versions } = await record(project)
      const accepted = offered.filter(revision => newer(versionOf(revision), versions[revision.file]))
      if (!accepted.length) return
      await save(project, { ...versions, ...Object.fromEntries(accepted.map(revision => [revision.file, versionOf(revision)])) })
      for (const revision of accepted) await write(project, revision)
    })

  return {
    async edits(project: string, at: number) {
      const current = await recorded(project, at)
      return current.edited.map(file => revisionOf(project, current, file))
    },
    versions: async () => versionsIn(await snapshot()),
    async exchange(theirs: ProjectVersions): Promise<Exchanged> {
      const found = await snapshot()
      const ours = versionsIn(found)
      const files = [...new Set([...found.keys(), ...Object.keys(theirs)])].flatMap(project =>
        [...new Set([...Object.keys(ours[project] ?? {}), ...Object.keys(theirs[project] ?? {})])].map(file => ({ project, file })),
      )
      const newerHere = files.flatMap(({ project, file }) => {
        const current = found.get(project)
        return current && newer(current.versions[file], theirs[project]?.[file]) ? [revisionOf(project, current, file)] : []
      })
      const wanted = files.filter(({ project, file }) => newer(theirs[project]?.[file], ours[project]?.[file]))
      return { revisions: newerHere, wanted }
    },
    revisions,
    async take(offered: Revision[]) {
      await Promise.all([...Map.groupBy(offered, revision => revision.project)].map(([project, group]) => take(project, group)))
    },
  }
}

type Replica = ReturnType<typeof createReplica>

export { createReplica, type Replica }
