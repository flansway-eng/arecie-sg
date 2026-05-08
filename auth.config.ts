import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith("/api/auth")
      if (isAuthPage) return true
      if (isLoggedIn) return true
      return false
    },
  },
} satisfies NextAuthConfig
