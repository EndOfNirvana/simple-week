import { inferAsyncReturnType } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { clerkClient } from "@clerk/express";
import { getUserByClerkId, upsertUser } from "./db";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Get the session token from the Authorization header
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.replace("Bearer ", "");

  let user = null;

  if (sessionToken) {
    try {
      // Verify the session with Clerk
      const session = await clerkClient.sessions.verifySession(
        req.headers["x-clerk-session-id"] as string,
        sessionToken
      );

      if (session) {
        const clerkUser = await clerkClient.users.getUser(session.userId);
        
        // Upsert user in our database
        await upsertUser({
          clerkId: clerkUser.id,
          name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : null,
          email: clerkUser.emailAddresses[0]?.emailAddress || null,
          imageUrl: clerkUser.imageUrl || null,
        });

        // Get the user from our database
        user = await getUserByClerkId(clerkUser.id);
      }
    } catch (error) {
      // Invalid session, user remains null
      console.error("Auth error:", error);
    }
  }

  return { req, res, user };
}

export type Context = inferAsyncReturnType<typeof createContext>;
