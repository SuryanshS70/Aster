import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = { title: string; children: ReactNode; className?: string };

export function AuthCard({ title, children, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-6 shadow-sm sm:p-7",
        className,
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}
