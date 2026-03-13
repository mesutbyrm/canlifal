export default function ChatRoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0118]">
      {children}
    </div>
  )
}
