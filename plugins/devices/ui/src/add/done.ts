export interface AddDone {
  title: string
  text: string
  again?: boolean
}

export type AddView = 'list' | 'phone' | 'install' | 'link' | AddDone
