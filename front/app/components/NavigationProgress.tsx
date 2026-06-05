'use client'

import { AppProgressBar } from 'next-nprogress-bar'

export default function NavigationProgress() {
  return (
    <AppProgressBar
      height="3px"
      color="#2F9E41"
      options={{ showSpinner: false }}
      shallowRouting
    />
  )
}
