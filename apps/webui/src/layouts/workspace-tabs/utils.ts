import type { Location } from 'react-router'

export function getActivePath(location: Location) {
  return location.pathname
}
