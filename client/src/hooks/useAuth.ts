import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";

export function useAuth() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut, openSignIn } = useClerk();
  const { getToken } = useClerkAuth();
  
  // Get user data from our database
  const { data: dbUser, isLoading: isDbLoading } = trpc.authentication.me.useQuery(undefined, {
    enabled: isSignedIn,
  });

  return {
    user: dbUser || (isSignedIn && clerkUser ? {
      id: 0, // Will be set from DB
      clerkId: clerkUser.id,
      name: clerkUser.fullName,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      imageUrl: clerkUser.imageUrl,
    } : null),
    loading: !isLoaded || isDbLoading,
    isAuthenticated: isSignedIn,
    error: null,
    login: () => openSignIn(),
    logout: () => signOut(),
    getToken,
  };
}
