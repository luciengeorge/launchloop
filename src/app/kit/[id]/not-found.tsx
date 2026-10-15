import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function KitNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">We can&apos;t find that kit</h1>
      <p className="text-muted-foreground">The link may be mistyped, or the preview has expired. Paid kits are also in your email.</p>
      <Link href="/#start" className={buttonVariants({ size: "lg" })}>
        Make a new preview
      </Link>
    </div>
  );
}
