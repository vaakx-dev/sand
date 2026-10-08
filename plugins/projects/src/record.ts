export interface ProjectRecord {
  path: string
  name?: string
  added: number
  link?: string
  hidden?: boolean
  saved?: boolean
}

export const isSaved = (record: ProjectRecord) => record.saved !== false
