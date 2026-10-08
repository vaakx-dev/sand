export const treeSizes = (listing: string) => {
  const records = listing.split('\0').filter(Boolean)
  const bytes = records.reduce((sum, record) => sum + (Number(record.slice(0, record.indexOf('\t')).trim().split(/\s+/)[3]) || 0), 0)
  return { files: records.length, bytes }
}
