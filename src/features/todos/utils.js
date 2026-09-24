/**
 * Buckets todos into the Todos-page groups (design: Todos.dc.html). Open todos are grouped by
 * `due_date` compared to `today` as plain 'yyyy-MM-dd' strings, so the boundary sits exactly at
 * local midnight with no timezone maths. `done` is newest-first; the others keep list order.
 */
export function groupTodos(todos, today) {
  const groups = { overdue: [], today: [], upcoming: [], someday: [], done: [] }
  for (const todo of todos) {
    if (todo.is_done) {
      groups.done.push(todo)
      continue
    }
    if (!todo.due_date) groups.someday.push(todo)
    else if (todo.due_date < today) groups.overdue.push(todo)
    else if (todo.due_date === today) groups.today.push(todo)
    else groups.upcoming.push(todo)
  }
  for (const key of ['overdue', 'today', 'upcoming', 'someday']) {
    groups[key].sort((a, b) => a.position - b.position)
  }
  groups.done.sort((a, b) => new Date(b.done_at) - new Date(a.done_at))
  return groups
}
