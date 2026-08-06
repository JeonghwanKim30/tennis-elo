"use client";

import { useActionState, useEffect, useState } from "react";
import { loginAction, type LoginState } from "./actions";
import { SignupModal } from "../signup/SignupModal";

const initialState: LoginState = {};
const TOAST_DURATION_MS = 4000;

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            이름
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 w-full rounded-xl border border-border px-4 py-2.5"
          />
        </div>
        <div>
          <label htmlFor="pin" className="block text-sm font-medium">
            PIN (휴대폰 뒷자리 4자리)
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            required
            maxLength={4}
            pattern="\d{4}"
            className="mt-1 w-full rounded-xl border border-border px-4 py-2.5"
          />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn-press lift-on-hover touch-target w-full rounded-full bg-primary py-3 font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
        >
          {pending ? "로그인 중..." : "로그인"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          아직 계정이 없으신가요? <SignupModal onSuccess={setToast} />
        </p>
      </form>

      {toast && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div className="surface-card border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm font-medium text-primary shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
