"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-medium">가입 신청이 접수되었습니다.</p>
        <p className="text-sm text-gray-500">
          관리자 승인 후 로그인할 수 있습니다. 승인까지 시간이 걸릴 수 있습니다.
        </p>
        <Link href="/login" className="inline-block text-primary underline">
          로그인 페이지로 이동
        </Link>
      </div>
    );
  }

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
          maxLength={50}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium">
          휴대폰 번호
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="01012345678"
          className="mt-1 w-full rounded border px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          PIN 번호는 휴대폰 번호의 뒷자리 4자리로 자동 설정됩니다.
        </p>
      </div>
      <div>
        <span className="block text-sm font-medium">성별</span>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="gender" value="MALE" required defaultChecked />
            남
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="gender" value="FEMALE" required />
            여
          </label>
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-primary hover:bg-primary-hover py-2 text-white disabled:opacity-50"
      >
        {pending ? "제출 중..." : "가입 신청"}
      </button>
      <p className="text-center text-sm text-gray-500">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-primary underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
