"use client";

import { createContext, useContext, useState } from "react";
import { flushSync } from "react-dom";

const PendingCtx = createContext(false);

export function useFormPending() {
  return useContext(PendingCtx);
}

/**
 * Native <form> wrapper that marks itself pending on submit so child
 * PendingSubmitButton can disable + show a spinner (works for classic POST
 * navigations, not only React server actions).
 */
export function PendingForm({
  children,
  onSubmit,
  ...props
}: React.ComponentProps<"form">) {
  const [pending, setPending] = useState(false);
  return (
    <PendingCtx.Provider value={pending}>
      <form
        {...props}
        onSubmit={(e) => {
          if (pending) {
            e.preventDefault();
            return;
          }
          // Paint the pending label before the browser unloads on a classic POST.
          flushSync(() => setPending(true));
          onSubmit?.(e);
        }}
      >
        {children}
      </form>
    </PendingCtx.Provider>
  );
}
