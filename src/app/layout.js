import './globals.css'

export const metadata = {
  title: 'AI Data Analytics Dashboard',
  description: 'Advanced analytics dashboard with clustering, engagement metrics, and data visualization',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}