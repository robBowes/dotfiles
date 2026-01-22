export function relativeTime(date: Date | string): string {
  const now = Date.now()
  const then = typeof date === 'string' ? new Date(date).getTime() : date.getTime()
  const diffMs = now - then

  if (diffMs < 0) {
    // Future dates
    const absDiff = Math.abs(diffMs)
    if (absDiff < 60 * 60 * 1000) {
      const mins = Math.round(absDiff / (60 * 1000))
      return `in ${mins} min${mins === 1 ? '' : 's'}`
    }
    if (absDiff < 24 * 60 * 60 * 1000) {
      const hrs = Math.round(absDiff / (60 * 60 * 1000))
      return `in ${hrs} hr${hrs === 1 ? '' : 's'}`
    }
    if (absDiff < 30 * 24 * 60 * 60 * 1000) {
      const days = Math.round(absDiff / (24 * 60 * 60 * 1000))
      return `in ${days} day${days === 1 ? '' : 's'}`
    }
    return new Date(then).toLocaleDateString()
  }

  // Past dates
  if (diffMs < 60 * 60 * 1000) {
    const mins = Math.round(diffMs / (60 * 1000))
    return mins === 0 ? 'just now' : `${mins} min${mins === 1 ? '' : 's'} ago`
  }
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hrs = Math.round(diffMs / (60 * 60 * 1000))
    return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  }
  if (diffMs < 30 * 24 * 60 * 60 * 1000) {
    const days = Math.round(diffMs / (24 * 60 * 60 * 1000))
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  return new Date(then).toLocaleDateString()
}
