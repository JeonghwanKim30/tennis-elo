import { AuthCard } from "@/components/AuthCard";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <AuthCard title="회원가입">
      <SignupForm />
    </AuthCard>
  );
}
