import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist. Paste your repo to see a free LaunchLoop preview instead.",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="text-muted-foreground">But your launch kit could. Paste your repo and see a free preview.</p>
      <Link href="/#start" className={buttonVariants({ size: "lg" })}>
        Get my free preview
      </Link>
    </div>
  );
}
