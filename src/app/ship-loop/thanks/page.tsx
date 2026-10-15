import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pre-order confirmed", robots: { index: false, follow: false } };

export default function ShipLoopThanks() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Pre-order confirmed</p>
      <h1 className="text-3xl font-semibold tracking-tight">You&apos;re a Ship Loop founding member</h1>
      <p className="text-muted-foreground">
        We&apos;ve emailed your confirmation. We&apos;ll be in touch as soon as Ship Loop is ready to connect to your repo, and your pre-order stays fully refundable until then.
      </p>
      <Link href="/#start" className={buttonVariants({ size: "lg", className: "mt-2" })}>
        Make a launch kit in the meantime
      </Link>
    </div>
  );
}
