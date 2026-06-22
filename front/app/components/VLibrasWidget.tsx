'use client'

import Script from 'next/script'

type VLibrasWindow = Window & {
  VLibras?: {
    Widget: new (rootPath: string) => unknown
  }
}

type WindowLoadHandler = (this: Window, event: Event) => unknown

export default function VLibrasWidget() {
  const initialize = () => {
    const browserWindow = window as VLibrasWindow
    if (!browserWindow.VLibras?.Widget) return

    const previousOnload = window.onload
    window.onload = null
    new browserWindow.VLibras.Widget('https://www.vlibras.gov.br/app')
    const initializeWidget = Reflect.get(window, 'onload') as WindowLoadHandler | null
    window.onload = previousOnload

    if (!initializeWidget) return
    if (document.readyState === 'complete') {
      initializeWidget.call(window, new Event('load'))
    } else {
      window.addEventListener('load', initializeWidget, { once: true })
    }
  }

  return (
    <>
      <div {...{ vw: 'true' }} className="enabled">
        <div {...{ 'vw-access-button': 'true' }} className="active" />
        <div {...{ 'vw-plugin-wrapper': 'true' }}>
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>
      <Script
        src="https://www.vlibras.gov.br/app/vlibras-plugin.js"
        strategy="afterInteractive"
        onLoad={initialize}
      />
    </>
  )
}
