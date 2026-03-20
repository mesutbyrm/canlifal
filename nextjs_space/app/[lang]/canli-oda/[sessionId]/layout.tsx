// Independent layout for live room - fullscreen, no navbar
export default function LiveRoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-[#0a0118] z-50">
      {children}
    </div>
  )
}
