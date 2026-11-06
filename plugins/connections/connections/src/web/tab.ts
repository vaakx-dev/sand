export const blankTab = () => window.open('', '_blank')

export const showIn = (tab: Window | null, url: string) => {
  if (!tab) return
  tab.opener = null
  tab.location.replace(url)
}
