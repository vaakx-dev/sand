export const pageHost = () => {
  const host = document.querySelector<HTMLMetaElement>('meta[name="sand-host"]')?.content
  if (!host) throw new Error('This page does not say which PC served it. Reload it.')
  return host
}
