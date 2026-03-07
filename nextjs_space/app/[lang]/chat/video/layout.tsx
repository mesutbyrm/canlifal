export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Force portrait aspect ratio container */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="relative w-full h-full max-w-[100vw] max-h-[100vh]" style={{ aspectRatio: '9/16' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
