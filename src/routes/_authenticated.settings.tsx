import { createFileRoute } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/ChatShell";
import { ModelSettings } from "@/components/settings/ModelSettings";
import { useSession } from "@/hooks/useAuth";

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

  return (
    <ChatShell title="Settings">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl space-y-8 p-6 pb-10">
          <section>
            <h2 className="font-serif text-2xl">Profile</h2>
            <div className="mt-4 rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="mt-1 font-medium">{session?.user.name}</p>
              <p className="text-sm text-muted-foreground">{session?.user.email}</p>
            </div>
          </section>

          <ModelSettings />
        </div>
      </div>
    </ChatShell>
  );
}
