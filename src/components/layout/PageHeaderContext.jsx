import { createContext, useContext, useEffect, useState } from 'react'

const StateContext = createContext(null)
const SetContext = createContext(null)

/** Holds what the current page wants in the shell's header. The setter context never changes. */
export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState({ title: '', actions: null, parent: null })
  return (
    <SetContext.Provider value={setHeader}>
      <StateContext.Provider value={header}>{children}</StateContext.Provider>
    </SetContext.Provider>
  )
}

/**
 * Pages call this to set the header title and actions (Feature 03 routing rule). `parent`
 * (`{ label, to }`) adds a crumb between the space and the title, for detail pages
 * (space › Notes › title). Only the header re-renders when it changes; the page never
 * subscribes to the state.
 */
export function usePageHeader({ title, actions = null, parent = null }) {
  const setHeader = useContext(SetContext)
  if (!setHeader) throw new Error('usePageHeader must be used inside the app shell')
  const parentLabel = parent?.label
  const parentTo = parent?.to

  useEffect(() => {
    setHeader({
      title,
      actions,
      parent: parentLabel ? { label: parentLabel, to: parentTo } : null,
    })
  }, [setHeader, title, actions, parentLabel, parentTo])

  useEffect(() => () => setHeader({ title: '', actions: null, parent: null }), [setHeader])
}

export function usePageHeaderState() {
  return useContext(StateContext)
}
