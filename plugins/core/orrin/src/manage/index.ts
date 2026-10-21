import type { Orrin, OrrinManagedProject, OrrinProject, OrrinProjects, OrrinView } from '../contract'

interface Pc {
  id: string
  name: string
  me: boolean
}

const tooOld = /no request named/

const lastChange = (orrin: Orrin, project: string) =>
  orrin.call('log', { project, limit: 1 }).then(
    ({ changes }) => changes[0]?.at,
    () => undefined,
  )

const knownPcs = (orrin: Orrin) =>
  orrin.call('pcs.list', {}).then(
    ({ pcs }) => pcs,
    (): Pc[] => [],
  )

const describe = async (orrin: Orrin, project: OrrinProject, views: OrrinView[], pcs: Pc[]): Promise<OrrinManagedProject> => {
  const mine = views.filter(view => view.project === project.id && view.state === 'open')
  const user = mine.find(view => view.kind === 'user')
  const home = pcs.find(pc => pc.id === project.home_pc)
  return {
    id: project.id,
    name: project.name,
    ...(user && { folder: user.path }),
    homePc: home?.name ?? project.home_pc,
    homeHere: home?.me ?? false,
    main: project.main,
    workers: mine
      .filter(view => view.kind === 'worker')
      .map(view => ({ id: view.id, owner: view.owner, state: view.state, createdAt: view.created_at })),
    changedAt: await lastChange(orrin, project.id),
  }
}

const updateNeeded = (error: unknown) =>
  error instanceof Error && tooOld.test(error.message)
    ? new Error('This Orrin cannot remove projects yet. Update Orrin in Settings → Connections, then try again.')
    : error

export const createManage = (orrin: Orrin) => {
  const list = async (): Promise<OrrinProjects> => {
    if (!orrin.available()) return { running: false, projects: [] }
    const [{ projects }, { views }, pcs] = await Promise.all([orrin.call('projects.list', {}), orrin.call('view.list', {}), knownPcs(orrin)])
    return { running: true, projects: await Promise.all(projects.map(project => describe(orrin, project, views, pcs))) }
  }

  const unlanded = async (project: string) => {
    const { views } = await orrin.call('view.list', { project })
    const user = views.find(view => view.kind === 'user' && view.state === 'open')
    if (!user) return { files: 0 }
    const { files } = await orrin.call('changes', { project, view: user.id })
    return { files: files.length }
  }

  const remove = async (project: string, deleteFolder?: boolean) => {
    await orrin.call('projects.remove', { project, ...(deleteFolder && { delete_folder: true }) }).catch(error => {
      throw updateNeeded(error)
    })
    return list()
  }

  const drop = async (view: string) => {
    await orrin.call('view.drop', { view })
    return list()
  }

  return { list, unlanded, remove, drop }
}
