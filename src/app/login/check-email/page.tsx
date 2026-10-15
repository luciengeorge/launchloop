import type { Metadata } from "next";
import { EnvelopeAnimation } from "@/components/envelope-animation";

export const metadata: Metadata = { title: "Check your email", robots: { index: false, follow: false } };

export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <EnvelopeAnimation className="mx-auto mb-6 h-24 w-auto" />
      <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
      <p className="mt-3 text-muted-foreground" role="status">
        If that address is valid, a login link is on its way. It works once and expires in 15 minutes.
      </p>
    </div>
  );
}
