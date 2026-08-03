"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          이름
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded border px-3 py-2"
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
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-green-600 py-2 text-white disabled:opacity-50"
      >
        {pending ? "로그인 중..." : "로그인"}
      </button>
      <p className="text-center text-sm text-gray-500">
        계정이 없나요?{" "}
        <Link href="/signup" className="text-green-600 underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
