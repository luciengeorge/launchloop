import { Check, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getKit } from "@/lib/kits";

export const metadata: Metadata = { title: "Payment received", robots: { index: false, follow: false } };

/** Where a signed-out buyer lands after paying: the kit is theirs once they log in with the email they paid with. */
export default function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <GuestSuccess searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GuestSuccess({ searchParams }: Pick<PageProps<"/checkout/success">, "searchParams">) {
  const query = await searchParams;
  const kitId = typeof query.kit === "string" ? query.kit : undefined;
  const sessionRef = typeof query.session_id === "string" ? query.session_id : undefined;
  const kit = kitId ? await getKit(kitId) : null;
  if (!kit) notFound();
  if (!kit.paid) redirect(`/kit/${kit.id}`);
  // The return route recorded this session on the kit just before redirecting here, with the email Stripe collected.
  const email = sessionRef && kit.paymentRef === sessionRef ? kit.email : undefined;

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm" data-testid="guest-success">
      <div>
        <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-primary">
          <Check className="size-3.5" aria-hidden="true" /> Payment received
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your {kit.brief.name} launch kit is ready</h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="guest-success-login">
          {email ? (
            <>
              Log in with <span className="font-medium text-foreground">{email}</span>, the email you paid with, to open it from My kits.
            </>
          ) : (
            "Log in with the email you paid with to open it from My kits."
          )}{" "}
          We&apos;ll email you a magic link. No password needed.
        </p>
      </div>
      <LoginForm next={`/account/kits/${kit.id}`} email={email} />
      {email ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />A copy with the ZIP is on its way to {email} too.
        </p>
      ) : null}
      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Can&apos;t wait?{" "}
        <Link href={`/kit/${kit.id}`} className="font-medium text-foreground underline underline-offset-4">
          Open the kit now with its private link
        </Link>
        .
      </p>
    </div>
  );
}
