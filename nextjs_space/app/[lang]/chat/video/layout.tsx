export default function VideoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {children}
    </div>
  )
}
