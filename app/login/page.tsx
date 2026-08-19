import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-lg font-bold text-phoenix-gold">
            P
          </span>
          <h1 className="text-lg font-semibold text-neutral-900">
            PHÖNIX <span className="text-phoenix-gold">CONTROL CENTER</span>
          </h1>
          <p className="text-sm text-neutral-400">Internes Administrationsportal</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
