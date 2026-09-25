import { common, createLowlight } from 'lowlight'

/** The one lowlight instance: highlight.js's "common" set (37 languages). */
export const lowlight = createLowlight(common)

/** Stored in the node's `language` attribute when no language is set. */
export const PLAIN_TEXT = 'plaintext'

const LABELS = {
  bash: 'Bash',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  css: 'CSS',
  diff: 'Diff',
  go: 'Go',
  graphql: 'GraphQL',
  ini: 'INI / TOML',
  java: 'Java',
  javascript: 'JavaScript',
  json: 'JSON',
  kotlin: 'Kotlin',
  less: 'Less',
  lua: 'Lua',
  makefile: 'Makefile',
  markdown: 'Markdown',
  objectivec: 'Objective-C',
  perl: 'Perl',
  php: 'PHP',
  plaintext: 'Plain text',
  python: 'Python',
  r: 'R',
  ruby: 'Ruby',
  rust: 'Rust',
  scss: 'SCSS',
  shell: 'Shell session',
  sql: 'SQL',
  swift: 'Swift',
  typescript: 'TypeScript',
  vbnet: 'VB.NET',
  wasm: 'WebAssembly',
  xml: 'HTML / XML',
  yaml: 'YAML',
}

// Variants that only make sense as aliases stay out of the picker (they still highlight).
const HIDDEN = new Set(['arduino', 'php-template', 'python-repl'])

/** Picker options: "Plain text" first, then every language by label. */
export const CODE_LANGUAGES = [
  { value: PLAIN_TEXT, label: LABELS.plaintext },
  ...lowlight
    .listLanguages()
    .filter((l) => l !== PLAIN_TEXT && !HIDDEN.has(l))
    .map((value) => ({ value, label: LABELS[value] ?? value }))
    .sort((a, b) => a.label.localeCompare(b.label)),
]
