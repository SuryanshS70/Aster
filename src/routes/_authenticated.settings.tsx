import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/ChatShell";
import { Button } from "@/components/ui/button";
import { useLogout, useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Aster" },
      { name: "description", content: "Manage your Aster account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <ChatShell title="Settings">
      <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
        <section>
          <h2 className="font-serif text-2xl">Profile</h2>
          <div className="mt-4 rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="mt-1 font-medium">{session?.user.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user.email}</p>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl">Account</h2>
          <div className="mt-4 rounded-xl border bg-card p-5">
            <Button
              variant="outline"
              onClick={() =>
                logout.mutate(undefined, {
                  onSuccess: () => navigate({ to: "/login" }),
                })
              }
            >
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </ChatShell>
  );
}
