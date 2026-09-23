export const GLOBAL_SLUG = 'global'

function withQuery(path, params) {
  if (!params) return path
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  return search ? `${path}?${search}` : path
}

function spacePaths(slug) {
  const root = `/s/${slug}`
  return {
    root: () => root,
    dashboard: () => `${root}/dashboard`,
    inbox: () => `${root}/inbox`,
    tasks: (params) => withQuery(`${root}/tasks`, params),
    task: (id) => `${root}/tasks/${id}`,
    // Todos live inside the Tasks & Todos module (design delta G1).
    todos: (params) => withQuery(`${root}/tasks`, { tab: 'todos', ...params }),
    notes: (params) => withQuery(`${root}/notes`, params),
    note: (id) => `${root}/notes/${id}`,
    journal: (date) => (date ? `${root}/journal/${date}` : `${root}/journal`),
    calendar: (params) => withQuery(`${root}/calendar`, params),
    reports: () => `${root}/reports`,
    report: (id) => `${root}/reports/${id}`,
    trash: () => `${root}/trash`,
  }
}

export const paths = {
  home: () => '/',
  login: () => '/login',
  signup: () => '/signup',
  forgotPassword: () => '/forgot-password',
  resetPassword: () => '/reset-password',
  authCallback: () => '/auth/callback',
  spaces: () => '/spaces',
  settings: (section) => (section ? `/settings/${section}` : '/settings'),
  space: spacePaths,
}
