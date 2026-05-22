import type { Metadata } from "next"
import { Toaster } from "sonner"
import Sidebar from "@/components/layout/Sidebar"
import Providers from "@/components/Providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI CoE Portal",
  description: "AI Center of Excellence — activity tracker and knowledge graph",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen overflow-hidden bg-gray-950 text-gray-100 flex">
        <Providers>
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            {children}
          </div>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: { background: "#111827", border: "1px solid #1f2937", color: "#f9fafb" },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
