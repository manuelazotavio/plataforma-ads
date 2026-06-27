'use client'

import { useEffect, useState } from 'react'

const DEFAULT_BOTTOM_OFFSET = 80
const DESKTOP_BOTTOM_OFFSET = 24
const FOOTER_GAP = 12

export function useMobileFooterOffset() {
  const [bottomOffset, setBottomOffset] = useState(DEFAULT_BOTTOM_OFFSET)

  useEffect(() => {
    const footer = document.querySelector('[data-floating-actions-boundary]')
    if (!footer) return

    const updateOffset = (visibleFooterHeight = 0) => {
      if (window.innerWidth >= 768) {
        setBottomOffset(Math.max(DESKTOP_BOTTOM_OFFSET, Math.ceil(visibleFooterHeight) + FOOTER_GAP))
        return
      }

      setBottomOffset(Math.max(DEFAULT_BOTTOM_OFFSET, Math.ceil(visibleFooterHeight) + FOOTER_GAP))
    }

    const observer = new IntersectionObserver(([entry]) => {
      updateOffset(entry.isIntersecting ? entry.intersectionRect.height : 0)
    })

    const handleResize = () => {
      const footerRect = footer.getBoundingClientRect()
      const visibleHeight = Math.max(0, window.innerHeight - Math.max(footerRect.top, 0))
      updateOffset(Math.min(footerRect.height, visibleHeight))
    }

    observer.observe(footer)
    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return bottomOffset
}
