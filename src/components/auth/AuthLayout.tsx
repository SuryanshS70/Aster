import type { ReactNode } from "react";
import { Logo } from "@/components/common/Logo";
import { AuthIllustration } from "./AuthIllustration";

type Props = {
  heading: string;
  subheading?: string;
  children: ReactNode;
};

export function AuthLayout({ heading, subheading, children }: Props) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_1fr]">
      <div className="relative flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-md py-12">
            <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              {heading}
            </h1>
            {subheading && <p className="mt-3 text-muted-foreground">{subheading}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Aster</p>
      </div>
      <AuthIllustration />
    </div>
  );
}
