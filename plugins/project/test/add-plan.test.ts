import { expect, test } from 'bun:test'
import type { ProjectEntry, ProjectGroup, Projects } from '@sand/web-client/contract'
import type { FolderListing, ProjectFolder } from '../src/contract'
import { folderForm } from '../src/web/add/folder/form'
import { plan } from '../src/web/add/folder/plan'

const studio = { id: 'studio', name: 'Studio' }

const entry = (device: string, path: string): ProjectEntry => ({ project: 'harbor', name: 'harbor', path, device, added: 1, updated: 1 })

const harbor = (devices: string[]): ProjectGroup => ({ id: 'harbor', name: 'harbor', hidden: false, updated: 1, locations: devices.map(device => entry(device, `/home/u/${device}/harbor`)) })

const fakeProjects = (group: ProjectGroup) => {
  const calls: string[] = []
  const projects: Pick<Projects, 'place' | 'browse' | 'inspect' | 'get' | 'add' | 'mkdir'> = {
    place: device => ({ device, home: '/home/u', sep: '/', root: '/home/u/code' }),
    browse: async (path): Promise<FolderListing> => ({ path, exists: true, folders: path === '/home/u/code' ? ['harbor-checkout'] : [] }),
    inspect: async (path): Promise<ProjectFolder> => ({ path, name: 'harbor-checkout', remote: 'git@example.com:harbor.git', matches: [group.id] }),
    get: id => (id === group.id ? group : undefined),
    add: async (path, device, project) => {
      calls.push(`add ${path} on ${device}${project ? ` as ${project}` : ''}`)
      return entry(device, path)
    },
    mkdir: async (path, device) => {
      calls.push(`mkdir ${path} on ${device}`)
    },
  }
  return { projects, calls }
}

const planned = async (group: ProjectGroup, path: string) => {
  const { projects, calls } = fakeProjects(group)
  const form = folderForm(projects, studio)
  form.path.set(path)
  for (let round = 0; round < 3; round++) {
    plan(projects, form)
    await Bun.sleep(0)
  }
  const result = plan(projects, form)
  await result.run?.()
  return { result, calls }
}

test('a folder with the same git remote as a project that has no copy on this PC is added as its copy', async () => {
  const { result, calls } = await planned(harbor(['desk']), '/home/u/code/harbor-checkout')
  expect(result.label).toBe('Add as a copy')
  expect(calls).toEqual(['add /home/u/code/harbor-checkout on studio as harbor'])
})

test('a folder with the same git remote as a project already on this PC stays its own project unless the user picks the copy', async () => {
  const { result, calls } = await planned(harbor(['desk', 'studio']), '/home/u/code/harbor-checkout')
  expect(result.label).toBe('Add project')
  expect(calls).toEqual(['add /home/u/code/harbor-checkout on studio'])
})

test('a folder that does not exist yet is created, then added', async () => {
  const { result, calls } = await planned(harbor(['desk']), '/home/u/code/fresh-idea')
  expect(result.label).toBe('Create folder and add')
  expect(calls).toEqual(['mkdir /home/u/code/fresh-idea on studio', 'add /home/u/code/fresh-idea on studio'])
})
