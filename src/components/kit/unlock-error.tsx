"use client";

import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { checkoutRecovery, type CheckoutFailure, type CheckoutRecovery } from "@/lib/unlock-checkout";

export interface ErrorAction {
  label: string;
  /** A button, or (`href`) a link. */
  onClick?: () => void;
  href?: string;
  testId?: string;
}

interface ActionableErrorProps {
  message: string;
  /** At least one: an error on the paywall is never a dead end. */
  actions: [ErrorAction, ...ErrorAction[]];
  className?: string;
  /** The message's size: the panel's main errors are text-sm, the save-preview form's text-xs. */
  size?: "sm" | "xs";
  testId?: string;
  code?: string;
  /** The message's id, for the button that failed to point at with aria-describedby once focus is back on it. */
  messageId?: string;
}

/**
 * An error with what to do about it, right next to the message. role="alert" announces it as it appears; the button
 * that failed also describes itself with the message (messageId), so it's read again when focus lands there.
 */
export function ActionableError({ message, actions, className, size = "sm", testId, code, messageId }: ActionableErrorProps) {
  return (
    <div role="alert" className={cn("mt-3", className)} data-testid={testId} data-code={code}>
      <p id={messageId} className={cn("text-destructive", size === "sm" ? "text-sm" : "text-xs")}>
        {message}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((action) =>
          action.href ? (
            // cva only concatenates, so the base's border-transparent stays beside outline's border-border and hides it; cn() drops it.
            <a key={action.label} href={action.href} className={cn(buttonVariants({ variant: "outline" }))} data-testid={action.testId}>
              {action.label}
            </a>
          ) : (
            <Button key={action.label} type="button" variant="outline" onClick={action.onClick} data-testid={action.testId}>
              {action.label}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}

/** The save-preview email field, on the panel whenever a signed-out visitor could unlock. */
export const SAVE_PREVIEW_FIELD_ID = "save-email";

const EMAIL_US_HREF = `mailto:${SITE.email}?subject=${encodeURIComponent("Payment link for my launch kit")}`;

function focusSavePreview() {
  const field = document.getElementById(SAVE_PREVIEW_FIELD_ID);
  field?.scrollIntoView({ block: "center", behavior: "smooth" });
  field?.focus({ preventScroll: true });
}

function recoveryAction(recovery: CheckoutRecovery, onRetry: () => void): ErrorAction {
  switch (recovery) {
    case "retry":
      return { label: "Try again", onClick: onRetry, testId: "checkout-retry" };
    case "save":
      return { label: "Email me a link instead", onClick: focusSavePreview, testId: "checkout-save-instead" };
    case "new_preview":
      return { label: "Make a new preview", href: "/#start", testId: "checkout-new-preview" };
    case "email_us":
      return { label: "Email us for a payment link", href: EMAIL_US_HREF, testId: "checkout-email-us" };
    default: {
      const unhandled: never = recovery;
      throw new Error(`Unhandled checkout recovery: ${String(unhandled)}`);
    }
  }
}

/** A failed checkout from one unlock button, with "Try again" (which runs the same checkout) and/or another way on. */
export function CheckoutError({
  failure,
  isLoggedIn,
  onRetry,
  className,
  messageId,
}: {
  failure: CheckoutFailure;
  isLoggedIn: boolean;
  onRetry: () => void;
  className?: string;
  messageId?: string;
}) {
  const [first, ...rest] = checkoutRecovery(failure.code, isLoggedIn);
  return (
    <ActionableError
      message={failure.message}
      actions={[recoveryAction(first, onRetry), ...rest.map((r) => recoveryAction(r, onRetry))]}
      className={className}
      testId="checkout-error"
      code={failure.code}
      messageId={messageId}
    />
  );
}
