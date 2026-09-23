import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { Splash } from '@/components/shared/Splash'
import NotFoundPage from '@/features/system/pages/NotFoundPage'
import RouteErrorPage from '@/features/system/pages/RouteErrorPage'
import {
  PublicOnly,
  RequireAuth,
  RootRedirect,
  SpaceBoundary,
  TodosRedirect,
} from '@/routes/guards'

/** Lazy route whose module default-exports the page component. */
const page = (importer) => ({
  lazy: () => importer().then((m) => ({ Component: m.default })),
  errorElement: <RouteErrorPage />,
})

// Route tree: .claude/rules/routing.md. Build URLs with @/lib/paths, never by hand.
export const routes = [
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <Splash />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: 'login', ...page(() => import('@/features/auth/pages/LoginPage')) },
          { path: 'signup', ...page(() => import('@/features/auth/pages/SignupPage')) },
          {
            path: 'forgot-password',
            ...page(() => import('@/features/auth/pages/ForgotPasswordPage')),
          },
        ],
      },
      {
        path: 'reset-password',
        ...page(() => import('@/features/auth/pages/ResetPasswordPage')),
      },
      { path: 'auth/callback', ...page(() => import('@/features/auth/pages/AuthCallbackPage')) },
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <RootRedirect /> },
          { path: 'spaces', ...page(() => import('@/features/spaces/pages/SpacesPage')) },
          {
            path: 'settings/:section?',
            ...page(() => import('@/features/settings/pages/SettingsPage')),
          },
          {
            path: 's/:spaceSlug',
            element: <SpaceBoundary />,
            errorElement: <RouteErrorPage />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              {
                path: 'dashboard',
                ...page(() => import('@/features/dashboard/pages/DashboardPage')),
              },
              { path: 'inbox', ...page(() => import('@/features/inbox/pages/InboxPage')) },
              { path: 'tasks', ...page(() => import('@/features/tasks/pages/TasksPage')) },
              {
                path: 'tasks/:taskId',
                ...page(() => import('@/features/tasks/pages/TaskDetailPage')),
              },
              { path: 'todos', element: <TodosRedirect /> },
              { path: 'notes', ...page(() => import('@/features/notes/pages/NotesPage')) },
              {
                path: 'notes/:noteId',
                ...page(() => import('@/features/notes/pages/NoteEditorPage')),
              },
              { path: 'journal', ...page(() => import('@/features/journal/pages/JournalPage')) },
              {
                path: 'journal/:date',
                ...page(() => import('@/features/journal/pages/JournalPage')),
              },
              {
                path: 'calendar',
                ...page(() => import('@/features/calendar/pages/CalendarPage')),
              },
              { path: 'reports', ...page(() => import('@/features/reports/pages/ReportsPage')) },
              {
                path: 'reports/:reportId',
                ...page(() => import('@/features/reports/pages/ReportPage')),
              },
              { path: 'trash', ...page(() => import('@/features/trash/pages/TrashPage')) },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
