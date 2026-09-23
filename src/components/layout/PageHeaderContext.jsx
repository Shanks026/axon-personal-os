import { createContext, useContext, useEffect, useState } from 'react'

const StateContext = createContext(null)
const SetContext = createContext(null)

/** Holds what the current page wants in the shell's header. The setter context never changes. */
export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState({ title: '', actions: null })
  return (
    <SetContext.Provider value={setHeader}>
      <StateContext.Provider value={header}>{children}</StateContext.Provider>
    </SetContext.Provider>
  )
}

/**
 * Pages call this to set the header title and actions (Feature 03 routing rule).
 * Only the header re-renders when it changes; the page never subscribes to the state.
 */
export function usePageHeader({ title, actions = null }) {
  const setHeader = useContext(SetContext)
  if (!setHeader) throw new Error('usePageHeader must be used inside the app shell')

  useEffect(() => {
    setHeader({ title, actions })
  }, [setHeader, title, actions])

  useEffect(() => () => setHeader({ title: '', actions: null }), [setHeader])
}

export function usePageHeaderState() {
  return useContext(StateContext)
}
