import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TagPill } from '@/components/shared/TagPill'
import { usePreferences, useUpdateMyProfile } from '@/features/settings/api'
import { SettingsCard } from '@/features/settings/components/SettingsCard'
import { useSpaces } from '@/features/spaces/api'
import { splitSpaces } from '@/features/spaces/utils'
import { useTags } from '@/features/tags/api'
import { tagKeywords } from '@/features/jira/utils'

/** One tag's keywords field; saves on blur or Enter. */
function KeywordRow({ tag, saved, onSave }) {
  const [value, setValue] = useState(saved ?? '')
  const commit = () => {
    const next = value
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .join(', ')
    setValue(next)
    if (next !== (saved ?? '')) onSave(next)
  }
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <div className="w-40 shrink-0">
        <TagPill tag={tag} size="md" />
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        placeholder={tagKeywords(tag, {}).join(', ')}
        aria-label={`Keywords for ${tag.name}`}
        className="text-sm"
      />
    </div>
  )
}

/**
 * Settings → Jira → Tag keywords (Feature 17): which words in a Jira ticket's title, issue type,
 * components or labels add each tag on import. Empty uses the tag's name plus built-in synonyms
 * (the placeholder); saved keywords replace them, so "VP, vendor portal" stops a bare "vendor"
 * from adding the Vendor tag. Stored in `profiles.jira_settings.tagKeywords` by tag id.
 */
export function JiraTagKeywords() {
  const { jiraSettings } = usePreferences()
  const update = useUpdateMyProfile()
  const { data: spaces = [] } = useSpaces()
  const spaceIds = splitSpaces(spaces).active.map((s) => s.id)
  const { data: tags = [], isLoading } = useTags({ spaceIds })

  const save = (tagId, keywords) => {
    const next = { ...(jiraSettings.tagKeywords ?? {}) }
    if (keywords) next[tagId] = keywords
    else delete next[tagId]
    update.mutate({ jira_settings: { ...jiraSettings, tagKeywords: next } })
  }

  return (
    <>
      <h3 className="mt-2 text-sm font-medium">Tag keywords</h3>
      <p className="-mt-1 text-sm text-muted-foreground">
        Words in a ticket’s title, issue type, components or labels that add each tag on import,
        separated by commas. Leave empty to use the tag’s name.
      </p>
      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      ) : (
        <SettingsCard>
          {tags.map((tag) => (
            <KeywordRow
              key={tag.id}
              tag={tag}
              saved={jiraSettings.tagKeywords?.[tag.id]}
              onSave={(keywords) => save(tag.id, keywords)}
            />
          ))}
        </SettingsCard>
      )}
    </>
  )
}
