export interface Machine {
  id: string
  name: string
  local: boolean
  online: boolean
  platform?: string
  address?: string
}

export interface Machines {
  list(): Machine[]
  get(id?: string): Machine | undefined
  add(link: string): Promise<Machine>
  remove(id: string): Promise<void>
}
