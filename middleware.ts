import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const publicPrefixes = ["/login", "/setup", "/api/auth", "/api/setup"]
  const isPublic = publicPrefixes.some((p) => nextUrl.pathname.startsWith(p))

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", nextUrl)
    url.searchParams.set("from", nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", nextUrl))
  }

  // Admin-only routes
  const adminRoutes = ["/settings", "/api/settings", "/api/audit"]
  const isAdminRoute = adminRoutes.some((p) => nextUrl.pathname.startsWith(p))
  if (isAdminRoute && isLoggedIn && session?.user) {
    const role = (session.user as { role?: string }).role
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", nextUrl))
    }
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
