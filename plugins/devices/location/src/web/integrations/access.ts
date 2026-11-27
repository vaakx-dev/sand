type Access = 'insecure' | 'missing' | 'unknown' | PermissionState

const access = async (): Promise<Access> => {
  if (!window.isSecureContext) return 'insecure'
  if (!('geolocation' in navigator)) return 'missing'
  return navigator.permissions.query({ name: 'geolocation' }).then(
    status => status.state,
    (): Access => 'unknown',
  )
}

export { type Access, access }
