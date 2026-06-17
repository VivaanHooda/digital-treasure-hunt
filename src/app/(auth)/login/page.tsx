"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { Mail, Lock, MapPin } from "lucide-react";
import { PageBackground } from "@/components/PageBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password });
    if (!res || res.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }
    const session = await getSession();
    router.push(session?.user?.role === "ADMIN" ? "/admin" : "/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <PageBackground />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
            Treasure Hunt
          </h1>
          <p className="mt-2 text-gray-400">Enter the digital realm of adventure</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-gray-700/50 bg-gray-800/30 p-8 shadow-2xl backdrop-blur-xl"
        >
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Field
            icon={<Mail className="h-5 w-5" />}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={setEmail}
          />
          <Field
            icon={<Lock className="h-5 w-5" />}
            type="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Enter the Hunt"}
          </button>

          <p className="text-center text-sm text-gray-400">
            Don&apos;t have a team?{" "}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input
        type={type}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-700/50 bg-gray-900/50 py-3.5 pl-11 pr-4 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
      />
    </div>
  );
}
