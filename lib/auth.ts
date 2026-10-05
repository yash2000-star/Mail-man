import { getServerSession, NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from 'next-auth/providers/google'

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        const url =
            "https://oauth2.googleapis.com/token?" +
            new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: String(token.refreshToken ?? ""),
            })

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
        })

        const refreshedTokens = await response.json()

        if (!response.ok) {
            throw refreshedTokens
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        }
    } catch (error) {
        console.error("Refresh token error", error)

        return {
            ...token,
            error: "RefreshAccessTokenError",
        }
    }
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    // Ask for Email Reading permissions
                    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify",
                },
            },
        }),
    ],

    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
                token.accessToken = account.access_token
                token.accessTokenExpires = Date.now() + Number(account.expires_in ?? 3600) * 1000
                token.refreshToken = account.refresh_token
                return token
            }

            // Return previous token if the access token has not expired yet
            // Give a 5 minute buffer
            if (Date.now() < Number(token.accessTokenExpires ?? 0) - 5 * 60 * 1000) {
                return token
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token)
        },
        async session({ session, token }) {
            // The Google access token stays server-side (see lib/gmail.ts);
            // the browser only learns whether it needs to sign in again.
            return { ...session, error: token.error }
        }
    }
}

/**
 * The signed-in user's email, or null when there is no valid session.
 * Every API route that touches user data or AI keys calls this first.
 */
export async function getSessionEmail(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    return session?.user?.email ?? null;
}
