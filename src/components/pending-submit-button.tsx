"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormPending } from "./pending-form";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Submit button for a PendingForm parent. Shows a spinner + label and disables
 * itself while the form is submitting.
 */
export function PendingSubmitButton({
  idle,
  pendingLabel = "Working…",
  children,
  disabled,
  ...props
}: Omit<ButtonProps, "type" | "children"> & {
  idle?: React.ReactNode;
  pendingLabel?: string;
  children?: React.ReactNode;
}) {
  const pending = useFormPending();
  const label = idle ?? children;
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}
