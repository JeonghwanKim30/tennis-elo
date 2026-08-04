import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthCard title="로그인">
      <LoginForm next={next} />
    </AuthCard>
  );
}
