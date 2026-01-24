import { inferAsyncReturnType } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyToken, createClerkClient } from "@clerk/express";
import { getUserByClerkId, upsertUser } from "./db";

// Create Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Get the session token from the Authorization header
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.replace("Bearer ", "");

  let user = null;

  if (sessionToken) {
    try {
      // Verify the JWT token directly
      const verifiedToken = await verifyToken(sessionToken, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (verifiedToken && verifiedToken.sub) {
        // Get user from Clerk
        const clerkUser = await clerkClient.users.getUser(verifiedToken.sub);
        
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
