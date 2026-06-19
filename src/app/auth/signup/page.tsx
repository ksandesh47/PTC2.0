"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccessMessage("Account created. You can sign in now.");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-4xl tracking-widest text-[--color-clay-500]">CREATE ACCOUNT</h1>
          <p className="mt-1 text-sm text-[--color-text-muted]">Join the league portal</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-[--color-border] bg-[--color-surface] p-6" noValidate>
          {serverError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          )}
          {successMessage && (
            <p role="status" className="rounded-md bg-[--color-forest-100] px-3 py-2 text-sm text-[--color-forest-700]">{successMessage}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="firstName" className="text-sm font-semibold">First name</label>
              <input
                id="firstName"
                type="text"
                {...register("firstName")}
                className="w-full rounded-md border border-[--color-border] bg-white px-3 py-2 text-sm focus:border-[--color-clay-400] focus:outline-none focus:ring-1 focus:ring-[--color-clay-400]"
              />
              {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="lastName" className="text-sm font-semibold">Last name</label>
              <input
                id="lastName"
                type="text"
                {...register("lastName")}
                className="w-full rounded-md border border-[--color-border] bg-white px-3 py-2 text-sm focus:border-[--color-clay-400] focus:outline-none focus:ring-1 focus:ring-[--color-clay-400]"
              />
              {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-semibold">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-md border border-[--color-border] bg-white px-3 py-2 text-sm focus:border-[--color-clay-400] focus:outline-none focus:ring-1 focus:ring-[--color-clay-400]"
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-semibold">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="w-full rounded-md border border-[--color-border] bg-white px-3 py-2 text-sm focus:border-[--color-clay-400] focus:outline-none focus:ring-1 focus:ring-[--color-clay-400]"
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[--color-accent] py-2.5 text-sm font-semibold text-white hover:bg-[--color-accent-hover] disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-[--color-text-muted]">
          Already have an account? <Link href="/auth/login" className="font-semibold text-[--color-clay-600] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
