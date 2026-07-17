import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getAllowedAuthRedirect } from "@/services/auth/redirects";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;
    if (!data) {
      navigate({
        to: "/login",
        search: { redirect: getAllowedAuthRedirect(pathname) },
        replace: true,
      });
    }
  }, [data, isLoading, navigate, pathname]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-6 w-6" />
      </div>
    );
  }

  return <Outlet />;
}
