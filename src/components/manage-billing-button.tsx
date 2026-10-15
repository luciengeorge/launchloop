"use client";

import { PendingForm } from "./pending-form";
import { PendingSubmitButton } from "./pending-submit-button";

/** Posts to the Stripe (or mock) billing portal with a pending state. */
export function ManageBillingButton() {
  return (
    <PendingForm method="post" action="/api/billing/portal">
      <PendingSubmitButton idle="Manage billing" pendingLabel="Working…" size="lg" data-testid="manage-billing" />
    </PendingForm>
  );
}
