'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>
    OneSignal?: any
  }
}

export default function OneSignalProvider() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    // Check admin setting
    fetch('/api/settings/public?key=onesignal_enabled')
      .then(res => res.json())
      .then(data => {
        // Default to true if not set
        const isEnabled = data.value === null || data.value === 'true' || data.value === '1'
        setEnabled(isEnabled)
      })
      .catch(() => setEnabled(true))
  }, [])

  useEffect(() => {
    if (enabled !== true) return

    // Only initialize on production domain
    if (typeof window !== 'undefined' && !window.location.hostname.includes('canlifal.com')) return

    // Load OneSignal SDK
    if (!document.querySelector('script[src*="OneSignalSDK"]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
      script.defer = true
      document.head.appendChild(script)
    }

    // Initialize OneSignal
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      await OneSignal.init({
        appId: "33f20979-e483-49f7-a494-cd5c2a6e38da",
        safari_web_id: "web.onesignal.auto.27d2eba6-7621-43e8-b8d4-d2a9de3b8fea",
        notifyButton: {
          enable: true,
          position: "bottom-right",
          offset: {
            bottom: "140px",
            right: "12px"
          },
          size: "small",
          text: {
            "tip.state.unsubscribed": "Bildirimlere abone ol",
            "tip.state.subscribed": "Bildirimler açık",
            "tip.state.blocked": "Bildirimler engellendi",
            "message.prenotify": "Bildirimlere abone olmak için tıklayın",
            "message.action.subscribed": "Bildirimlere abone oldunuz!",
            "message.action.resubscribed": "Bildirimlere tekrar abone oldunuz!",
            "message.action.unsubscribed": "Bildirim aboneliğiniz iptal edildi.",
            "dialog.main.title": "Site Bildirimlerini Yönet",
            "dialog.main.button.subscribe": "ABONE OL",
            "dialog.main.button.unsubscribe": "ABONELİKTEN ÇIK",
            "dialog.blocked.title": "Bildirimlerin Engelini Kaldır",
            "dialog.blocked.message": "Bildirimlere izin vermek için tarayıcı ayarlarınızdan izin verin."
          }
        },
        promptOptions: {
          slidedown: {
            prompts: [{
              type: "push",
              autoPrompt: true,
              text: {
                actionMessage: "Fal yorumları ve güncellemeler için bildirimlere izin vermek ister misiniz?",
                acceptButton: "İzin Ver",
                cancelButton: "Hayır"
              },
              delay: {
                pageViews: 1,
                timeDelay: 5
              }
            }]
          }
        }
      })
    })
  }, [enabled])

  return null
}
