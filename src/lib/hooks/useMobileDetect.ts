import { useState, useEffect } from 'react'

interface MobileDetectState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  isStandalone: boolean
  isIOS: boolean
  isAndroid: boolean
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
}

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

function getDeviceInfo(): MobileDetectState {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      isStandalone: false,
      isIOS: false,
      isAndroid: false,
      screenWidth: 1024,
      screenHeight: 768,
      orientation: 'landscape',
    }
  }

  const ua = navigator.userAgent
  const width = window.innerWidth
  const height = window.innerHeight

  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/.test(ua)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error - iOS Safari specific property
    window.navigator.standalone === true

  const isMobile = width < MOBILE_BREAKPOINT
  const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
  const isDesktop = width >= TABLET_BREAKPOINT

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isStandalone,
    isIOS,
    isAndroid,
    screenWidth: width,
    screenHeight: height,
    orientation: width > height ? 'landscape' : 'portrait',
  }
}

export function useMobileDetect(): MobileDetectState {
  const [state, setState] = useState<MobileDetectState>(getDeviceInfo)

  useEffect(() => {
    const handleResize = () => {
      setState(getDeviceInfo())
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    // Initial check
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return state
}
