import { useMemo } from 'react'
import { GitBranch } from 'lucide-react'
import { mergeVersions } from '@/lib/versions'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { PropertyChip } from '@/components/shared/PropertyChip'
import { VersionPicker } from '@/components/shared/VersionPicker'
import { useNoteVersions } from '@/features/notes/api'
import { useTaskVersions } from '@/features/tasks/api'

/**
 * "Version" property chip for TaskDialog: suggests the versions already used on tasks and notes
 * in the task's space, plus "Add …" for a new one (versions are free text; a task can have
 * several). The chosen versions are listed under the description, like tags. Opens on hover or click.
 */
export function VersionsChip({ spaceId, value, onChange }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  const spaceIds = useMemo(() => (spaceId ? [spaceId] : []), [spaceId])
  const { data: taskVersions = [] } = useTaskVersions({ spaceIds })
  const { data: noteVersions = [] } = useNoteVersions({ spaceIds })
  const known = useMemo(
    () => mergeVersions(taskVersions, noteVersions),
    [taskVersions, noteVersions],
  )

  return (
    <VersionPicker
      value={value}
      onChange={onChange}
      known={known}
      open={open}
      onOpenChange={setOpen}
      hoverProps={hoverProps}
      trigger={
        <PropertyChip icon={GitBranch} empty={value.length === 0} {...hoverProps}>
          {value.length ? `Version · ${value.length}` : 'Version'}
        </PropertyChip>
      }
    />
  )
}
