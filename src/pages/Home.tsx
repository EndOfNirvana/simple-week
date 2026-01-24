import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { WeeklyView } from '../components/WeeklyView';
import { Button } from "../components/ui/button";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">简周</h1>
          <p className="text-muted-foreground">SimpleWeek - 简单高效的周计划工具</p>
        </div>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <Button variant="default">登录</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline">注册</Button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* User button in top right corner */}
      <div className="fixed top-4 right-4 z-50">
        <UserButton afterSignOutUrl="/" />
      </div>
      <WeeklyView />
    </div>
  );
}
