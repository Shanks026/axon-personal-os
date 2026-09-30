import { useCallback } from 'react'
import { toast } from 'sonner'
import { validateAttachmentFile } from '@/features/attachments/utils'

/**
 * Returns `accept(list)`: the files that can be attached, with a toast for each one that can't
 * (a video, an empty file, over 50 MB). Used where files are staged before a task exists.
 */
export function useAcceptFiles() {
  return useCallback((list) => {
    const ok = []
    for (const file of Array.from(list ?? [])) {
      const problem = validateAttachmentFile(file)
      if (problem) toast.error(`Can’t attach “${file.name}”`, { description: problem })
      else ok.push(file)
    }
    return ok
  }, [])
}
