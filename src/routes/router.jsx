import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import AuthCallbackPage from '@/features/auth/pages/AuthCallbackPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import LoginPage from '@/features/auth/pages/LoginPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import SignupPage from '@/features/auth/pages/SignupPage'
import CalendarPage from '@/features/calendar/pages/CalendarPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import InboxPage from '@/features/inbox/pages/InboxPage'
import JournalPage from '@/features/journal/pages/JournalPage'
import NoteEditorPage from '@/features/notes/pages/NoteEditorPage'
import NotesPage from '@/features/notes/pages/NotesPage'
import ReportPage from '@/features/reports/pages/ReportPage'
import ReportsPage from '@/features/reports/pages/ReportsPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import SpacesPage from '@/features/spaces/pages/SpacesPage'
import NotFoundPage from '@/features/system/pages/NotFoundPage'
import RouteErrorPage from '@/features/system/pages/RouteErrorPage'
import TaskDetailPage from '@/features/tasks/pages/TaskDetailPage'
import TasksPage from '@/features/tasks/pages/TasksPage'
import TrashPage from '@/features/trash/pages/TrashPage'
import {
  PublicOnly,
  RequireAuth,
  RootRedirect,
  SpaceBoundary,
  TodosRedirect,
} from '@/routes/guards'

// Route tree: .claude/rules/routing.md. Build URLs with @/lib/paths, never by hand.
// Pages are imported eagerly (like Tercero): lazy chunks made the old screen linger, or a
// half-rendered one flash, while the next page's code loaded.
export const routes = [
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'signup', element: <SignupPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            // One persistent frame for every signed-in screen; the sidebar shows inside spaces.
            element: <AppShell />,
            errorElement: <RouteErrorPage />,
            children: [
              { index: true, element: <RootRedirect /> },
              { path: 'spaces', element: <SpacesPage /> },
              { path: 'settings/:section?', element: <SettingsPage /> },
              {
                path: 's/:spaceSlug',
                element: <SpaceBoundary />,
                children: [
                  { index: true, element: <Navigate to="dashboard" replace /> },
                  { path: 'dashboard', element: <DashboardPage /> },
                  { path: 'inbox', element: <InboxPage /> },
                  { path: 'tasks', element: <TasksPage /> },
                  { path: 'tasks/:taskId', element: <TaskDetailPage /> },
                  { path: 'todos', element: <TodosRedirect /> },
                  { path: 'notes', element: <NotesPage /> },
                  { path: 'notes/:noteId', element: <NoteEditorPage /> },
                  { path: 'journal', element: <JournalPage /> },
                  { path: 'journal/:date', element: <JournalPage /> },
                  { path: 'calendar', element: <CalendarPage /> },
                  { path: 'reports', element: <ReportsPage /> },
                  { path: 'reports/:reportId', element: <ReportPage /> },
                  { path: 'trash', element: <TrashPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
