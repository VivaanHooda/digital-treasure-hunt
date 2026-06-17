"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { PageBackground } from "@/components/PageBackground";
import { apiSend, ClientError } from "@/lib/client";

type Member = { name: string; mobile: string; department: string };
const emptyMember = (): Member => ({ name: "", mobile: "", department: "" });

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    teamName: "",
    email: "",
    password: "",
    leaderName: "",
    leaderMobile: "",
    leaderDepartment: "",
  });
  const [members, setMembers] = useState<Member[]>([emptyMember(), emptyMember(), emptyMember()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setMember = (i: number, k: keyof Member) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMembers((ms) => ms.map((m, idx) => (idx === i ? { ...m, [k]: e.target.value } : m)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await apiSend("/api/register", "POST", { ...form, members });
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof ClientError ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2.5 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <PageBackground />
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600">
            <Users className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Your Team</h1>
          <p className="mt-1 text-gray-400">Exactly 4 members (leader + 3)</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-6 rounded-2xl border border-gray-700/50 bg-gray-800/30 p-6 shadow-2xl backdrop-blur-xl"
        >
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Team name" value={form.teamName} onChange={setField("teamName")} required />
            <input className={input} type="email" placeholder="Login email" value={form.email} onChange={setField("email")} required />
            <input className={input} type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={setField("password")} required />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-400">Team Leader</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input className={input} placeholder="Name" value={form.leaderName} onChange={setField("leaderName")} required />
              <input className={input} placeholder="Mobile" value={form.leaderMobile} onChange={setField("leaderMobile")} required />
              <input className={input} placeholder="Department" value={form.leaderDepartment} onChange={setField("leaderDepartment")} required />
            </div>
          </section>

          {members.map((m, i) => (
            <section key={i}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-400">Member {i + 1}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input className={input} placeholder="Name" value={m.name} onChange={setMember(i, "name")} required />
                <input className={input} placeholder="Mobile" value={m.mobile} onChange={setMember(i, "mobile")} required />
                <input className={input} placeholder="Department" value={m.department} onChange={setMember(i, "department")} required />
              </div>
            </section>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating team..." : "Register Team"}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have a team?{" "}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
