// Push Notification Utility Functions

export const isPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'Notification' in window && 'serviceWorker' in navigator
}

export const getPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isPushSupported()) return 'unsupported'
  
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  
  // Don't register service worker in test mode or during SSR
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Check if we're in a test/build environment
    const isTestEnv = document.querySelector('meta[name="next-test"]') !== null
    if (isTestEnv) {
      console.log('Skipping Service Worker registration in test environment')
      return null
    }
  }
  
  try {
    // Wait for the page to fully load
    if (document.readyState !== 'complete') {
      await new Promise(resolve => window.addEventListener('load', resolve, { once: true }))
    }
    
    const registration = await navigator.serviceWorker.register('/notification-sw.js', {
      scope: '/'
    })
    console.log('Service Worker registered:', registration.scope)
    return registration
  } catch (error) {
    // Silently fail - notifications will still work via Notification API
    console.log('Service Worker registration skipped:', (error as Error).message)
    return null
  }
}

export const showBrowserNotification = async (
  title: string,
  body: string,
  options?: {
    tag?: string
    url?: string
    count?: number
    icon?: string
  }
): Promise<boolean> => {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false
  
  try {
    // Try using Service Worker first for better reliability
    const registration = await navigator.serviceWorker.ready
    if (registration) {
      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag: options?.tag || 'falclub-notification',
        url: options?.url || '/',
        count: options?.count || 1
      })
      return true
    }
    
    // Fallback to regular Notification API
    const notification = new Notification(title, {
      body: options?.count && options.count > 1 ? `${body} (${options.count} yeni bildirim)` : body,
      icon: options?.icon || '/logo.png',
      tag: options?.tag || 'falclub-notification',
      renotify: true,
      silent: false
    })
    
    notification.onclick = () => {
      window.focus()
      if (options?.url) {
        window.location.href = options.url
      }
      notification.close()
    }
    
    return true
  } catch (error) {
    console.error('Error showing notification:', error)
    return false
  }
}

// Play notification sound
export const playNotificationSound = (): void => {
  if (typeof window === 'undefined') return
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    const audioContext = new AudioContextClass()
    
    // Create a more pleasant notification sound
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(freq, startTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.05)
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }
    
    const now = audioContext.currentTime
    // Two-tone notification sound
    playTone(880, now, 0.15)       // A5
    playTone(1174.66, now + 0.15, 0.2) // D6
    
  } catch (e) {
    console.log('Audio notification not supported')
  }
}
