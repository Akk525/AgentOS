import { useState, useEffect } from 'react'

const KEY = 'agentos.onboarded'

export function useFirstRun(): { isFirstRun: boolean; completeOnboarding: () => void } {
  const [isFirstRun, setIsFirstRun] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(KEY)
    if (!seen) setIsFirstRun(true)
  }, [])

  function completeOnboarding() {
    localStorage.setItem(KEY, '1')
    setIsFirstRun(false)
  }

  return { isFirstRun, completeOnboarding }
}
