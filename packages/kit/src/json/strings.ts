export const uniqueStrings = (list: unknown, most: number) =>
  Array.isArray(list) ? [...new Set(list.filter((item): item is string => typeof item === 'string'))].slice(0, most) : []
