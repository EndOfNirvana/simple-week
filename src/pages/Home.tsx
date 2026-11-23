import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { WeeklyView } from '../components/WeeklyView';
import { Button } from "../components/ui/button";
import { CalendarDays } from "lucide-react";

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
      <main className="week-login grid min-h-dvh place-items-center bg-background p-5 text-foreground">
        <section className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground"><CalendarDays aria-hidden="true" className="size-6" /></span>
          <h1 className="mt-5 text-3xl font-bold">简周</h1>
          <p className="mt-2 text-sm text-muted-foreground">安排每周计划，记录每周总结。</p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <SignInButton mode="modal">
              <Button>登录</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="outline">注册</Button>
            </SignUpButton>
          </div>
        </section>
      </main>
    );
  }

  return <WeeklyView accountMenu={<UserButton afterSignOutUrl="/" />} />;
}
