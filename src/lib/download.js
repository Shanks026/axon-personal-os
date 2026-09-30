/** Saves `text` as a file download (a Blob URL on a temporary link), e.g. a report's `.md`. */
export function downloadTextFile(fileName, text, type = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Follows `url` through a temporary link: a signed download URL (its `Content-Disposition` saves
 * the file without leaving the page), or with `newTab` a page elsewhere, such as a file in Jira.
 */
export function openLink(url, { newTab = false } = {}) {
  const link = document.createElement('a')
  link.href = url
  if (newTab) {
    link.target = '_blank'
    link.rel = 'noreferrer'
  }
  document.body.append(link)
  link.click()
  link.remove()
}
