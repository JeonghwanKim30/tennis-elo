import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">회원가입</h1>
      <SignupForm />
    </main>
  );
}
