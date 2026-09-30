import { docToText } from '@/lib/richText'
import { MAX_VERSIONS, versionSchema } from '@/lib/versions'
import {
  CATEGORY_STATUS,
  DEFAULT_PRIORITY_MAP,
  DEFAULT_STATUS_MAP,
  DEFAULT_TAG_SYNONYMS,
} from '@/features/jira/constants'

const KEY = /\b([A-Z][A-Z0-9_]*-\d+)\b/

/**
 * The issue key in what the user pasted: a browse link (`…/browse/MP-43512`), a board or search
 * link with `selectedIssue=MP-43512`, or a bare key (any case). `null` when there's none.
 */
export function parseJiraRef(input) {
  const text = String(input ?? '').trim()
  if (!text) return null
  let url = null
  try {
    url = new URL(text)
  } catch {
    // Not a URL: a bare key, perhaps.
  }
  if (url) {
    const selected = url.searchParams.get('selectedIssue')
    if (selected && KEY.test(selected.toUpperCase())) return selected.toUpperCase()
    const browse = url.pathname.match(/\/browse\/([A-Za-z][A-Za-z0-9_]*-\d+)/)
    if (browse) return browse[1].toUpperCase()
    return null
  }
  const bare = text.toUpperCase().match(new RegExp(`^${KEY.source}$`))
  return bare ? bare[1] : null
}

const lower = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()

/** Settings maps are stored by Jira name; look them up case-insensitively. */
const lookup = (map, name) => {
  const hit = Object.entries(map ?? {}).find(([k]) => lower(k) === lower(name))
  return hit?.[1]
}

/** Jira status → Axon status: the saved map, then the defaults, then the Jira category. */
export function mapStatus(status, statusMap) {
  if (!status) return 'todo'
  return (
    lookup(statusMap, status.name) ??
    DEFAULT_STATUS_MAP[lower(status.name)] ??
    CATEGORY_STATUS[status.category] ??
    'todo'
  )
}

/** Jira priority name → Axon priority: the saved map, then the defaults; none → `none`. */
export function mapPriority(name, priorityMap) {
  if (!name) return 'none'
  return lookup(priorityMap, name) ?? DEFAULT_PRIORITY_MAP[lower(name)] ?? 'medium'
}

/**
 * A tag's keywords: the ones saved in Settings (comma-separated) when there are any, otherwise the
 * tag's name plus the built-in synonyms for common names (Improvement: "suggestion", …).
 */
export function tagKeywords(tag, tagKeywordsSetting) {
  const custom = String(tagKeywordsSetting?.[tag.id] ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  if (custom.length) return custom
  return [tag.name, ...(DEFAULT_TAG_SYNONYMS[lower(tag.name)] ?? [])]
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whether `keyword` appears in `text` as whole words, ignoring case ("SMP" in "in SMP and VP";
 * "all portals" also matches "All-Portals"). "VP" doesn't match inside "VPN".
 */
export function mentions(text, keyword) {
  const words = lower(keyword)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(escapeRegExp)
  if (!words.length || !text) return false
  return new RegExp(`(^|[^a-z0-9])${words.join('[\\s_-]+')}(?=$|[^a-z0-9])`, 'i').test(text)
}

/**
 * Tags a Jira issue implies, by keyword (see `tagKeywords`): matched against the title, the issue
 * type, the components and the labels. Returns tag ids in the space's tag order.
 */
export function inferTags(issue, tags, tagKeywordsSetting) {
  const texts = [
    issue.summary,
    issue.issueType,
    ...(issue.components ?? []),
    ...(issue.labels ?? []),
  ]
    .filter(Boolean)
    .map(String)
  return tags
    .filter((tag) =>
      tagKeywords(tag, tagKeywordsSetting).some((k) => texts.some((t) => mentions(t, k))),
    )
    .map((t) => t.id)
}

const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

/**
 * A normalised Jira issue → task dialog values: title, rich description (`htmlToDoc`), status,
 * priority, dates, versions (fix versions), tags (keyword matches from `inferTags`, plus labels
 * matched to the space's tags by name; other labels become `newTags`, created on save), the Jira link, and `jira_key` / `jira_imported_at`.
 */
export function issueToTaskValues(issue, { tags = [], htmlToDoc, jiraSettings, now = new Date() }) {
  const byName = new Map(tags.map((t) => [lower(t.name), t]))
  const tagIds = inferTags(issue, tags, jiraSettings?.tagKeywords)
  const newTags = []
  for (const label of issue.labels ?? []) {
    const found = byName.get(lower(label))
    if (found) {
      if (!tagIds.includes(found.id)) tagIds.push(found.id)
    } else if (!newTags.some((n) => lower(n) === lower(label))) {
      newTags.push(label)
    }
  }
  let start = isoDate(issue.startDate)
  const due = isoDate(issue.duedate)
  if (start && due && start > due) start = null
  const description = issue.descriptionHtml ? htmlToDoc(issue.descriptionHtml) : null
  return {
    title: String(issue.summary ?? issue.key).slice(0, 300),
    description,
    description_text: docToText(description).slice(0, 20_000),
    status: mapStatus(issue.status, jiraSettings?.statusMap),
    priority: mapPriority(issue.priority, jiraSettings?.priorityMap),
    start_date: start,
    due_date: due,
    // Only names the version field accepts (40 characters, no commas, braces or quotes).
    versions: [
      ...new Set(
        (issue.fixVersions ?? [])
          .map((v) => versionSchema.safeParse(v))
          .filter((r) => r.success)
          .map((r) => r.data),
      ),
    ].slice(0, MAX_VERSIONS),
    tag_ids: tagIds,
    newTags,
    links: [{ url: issue.url, label: issue.key }],
    jira_key: issue.key,
    jira_imported_at: now.toISOString(),
    // Copied into Axon after the task is saved (Feature 17 Phase 4); never sent with the insert.
    jira_attachments: issue.attachments ?? [],
  }
}

/** `https://site/browse/KEY`, or null without a site. */
export function jiraIssueUrl(site, key) {
  return site && key ? `${String(site).replace(/\/+$/, '')}/browse/${key}` : null
}

const VIDEO_NAME = /\.(mp4|mov|webm|mkv|avi|m4v|wmv)$/i
const MAX_COPY_BYTES = 50 * 1024 * 1024

/** Whether a Jira attachment stays in Jira (a video, or over the free plan's 50 MB). */
export function staysInJira(attachment) {
  return (
    String(attachment?.mimeType ?? '').startsWith('video/') ||
    VIDEO_NAME.test(attachment?.filename ?? '') ||
    Number(attachment?.size) > MAX_COPY_BYTES
  )
}

/** "3 attachments will be copied after you save (1 stays in Jira: a video or over 50 MB)." */
export function attachmentNotice(attachments) {
  const list = attachments ?? []
  if (!list.length) return ''
  const kept = list.filter(staysInJira).length
  const copied = list.length - kept
  const files = (n) => `${n} ${n === 1 ? 'attachment' : 'attachments'}`
  const parts = []
  if (copied) parts.push(`${files(copied)} will be copied after you save`)
  if (kept) parts.push(`${kept} ${kept === 1 ? 'stays' : 'stay'} in Jira (video or over 50 MB)`)
  return parts.join(' · ')
}

/**
 * The description with each `jira:{id}` image swapped for its copy (`copied`: Map of Jira
 * attachment id → the attachments row). An image that wasn't copied (or stayed in Jira) becomes
 * a "[Image in Jira]" link to `issueUrl`, except ids in `keep` (failed copies a Retry may still
 * finish), which stay as they are. Returns `{ doc, changed }`.
 */
export function replaceJiraImages(doc, copied, issueUrl, keep = new Set()) {
  let changed = false
  const walk = (node) => {
    if (node?.type === 'image' && String(node.attrs?.path ?? '').startsWith('jira:')) {
      const id = node.attrs.path.slice(5)
      if (keep.has(id)) return node
      changed = true
      const row = copied.get(id)
      if (row?.path) {
        return {
          ...node,
          attrs: {
            ...node.attrs,
            path: row.path,
            width: row.width ?? null,
            height: row.height ?? null,
            alt: node.attrs.alt || row.name,
          },
        }
      }
      return {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '[Image in Jira]',
            marks: [{ type: 'link', attrs: { href: row?.external_url ?? issueUrl } }],
          },
        ],
      }
    }
    return node?.content ? { ...node, content: node.content.map(walk) } : node
  }
  const out = doc ? walk(doc) : doc
  return { doc: out, changed }
}

/** Whether a description still has `jira:{id}` image placeholders (a copy in progress). */
export function hasJiraImages(doc) {
  return !!doc && JSON.stringify(doc).includes('"path":"jira:')
}
