import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggleButton } from '@/components/shared/ThemeToggleButton'
import { THEME_STORAGE_KEY, ThemeProvider } from '@/components/theme/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'

function renderToggle() {
  render(
    <ThemeProvider>
      <TooltipProvider>
        <ThemeToggleButton />
      </TooltipProvider>
    </ThemeProvider>,
  )
}

describe('ThemeToggleButton', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('cycles system → light → dark → system and persists the choice', async () => {
    const user = userEvent.setup()
    renderToggle()
    const button = () => screen.getByRole('button', { name: /switch theme/i })

    expect(button()).toHaveAccessibleName(/system theme/i)

    await user.click(button())
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement).toHaveClass('light')

    await user.click(button())
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')

    await user.click(button())
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('restores the stored theme on mount', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderToggle()
    expect(screen.getByRole('button', { name: /switch theme/i })).toHaveAccessibleName(
      /dark theme/i,
    )
  })
})
