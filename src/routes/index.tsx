import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { data, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;
    navigate({ to: data ? "/chat" : "/login", replace: true });
  }, [data, isLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner className="h-6 w-6" />
    </div>
  );
}
