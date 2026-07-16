import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";

type Props = { title?: string; onOpenSidebar: () => void };

export function TopBar({ title, onOpenSidebar }: Props) {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="md:hidden">
        <Logo showText={false} />
      </div>
      <h1 className="truncate text-sm font-medium">{title ?? "New chat"}</h1>
    </header>
  );
}
