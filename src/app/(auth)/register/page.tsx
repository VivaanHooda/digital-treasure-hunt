"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { apiGet, apiSend, ClientError } from "@/lib/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SweepButton } from "@/components/ui/SweepButton";
import { staggerContainer, revealVariants } from "@/lib/motion";

const departments = [
  "Computer Science & Engineering (AIML)",
  "Computer Science & Engineering",
  "Computer Science & Engineering (Data Science)",
  "Computer Science & Engineering (Cyber Security)",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Electronics & Telecommunication Engineering",
  "Mechanical Engineering",
  "Aerospace Engineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Biotechnology",
  "Industrial Engineering & Management",
];

type Member = { name: string; email: string; mobile: string; department: string };
type Errors = Record<string, string>;
const blank = (): Member => ({ name: "", email: "", mobile: "", department: "" });

const strip = (m: string) => m.replace(/^\+91\s*/, "").replace(/\D/g, "");
const validateMobile = (m: string) => /^[6-9]\d{9}$/.test(strip(m));
const formatMobile = (m: string) => {
  const c = m.replace(/\D/g, "");
  if (c.startsWith("91")) return "+91 " + c.substring(2);
  if (c.length <= 10) return "+91 " + c;
  return m;
};
const isEmail = (v: string) => /\S+@\S+\.\S+/.test(v.trim());

export default function RegisterPage() {
  const router = useRouter();
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const [form, setForm] = useState({
    teamName: "", email: "", password: "", confirmPassword: "",
    teamLeaderName: "", teamLeaderMobile: "", teamLeaderDepartment: "",
    teamMembers: [] as Member[],
  });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load the admin-configured team-size range and seed the minimum member slots.
  useEffect(() => {
    apiGet<{ minTeamSize: number; maxTeamSize: number }>("/api/register")
      .then((r) => {
        const min = Math.max(1, r.minTeamSize);
        const max = Math.max(min, r.maxTeamSize);
        setRange({ min, max });
        setForm((f) => ({ ...f, teamMembers: Array.from({ length: min - 1 }, blank) }));
      })
      .catch(() => {
        setRange({ min: 4, max: 4 });
        setForm((f) => ({ ...f, teamMembers: [blank(), blank(), blank()] }));
      });
  }, []);

  const minMembers = (range?.min ?? 1) - 1;
  const maxMembers = (range?.max ?? 4) - 1;
  const fixed = range ? range.min === range.max : false;
  const total = 1 + form.teamMembers.length;

  const updateMember = (index: number, field: keyof Member, value: string) =>
    setForm((f) => ({
      ...f,
      teamMembers: f.teamMembers.map((m, i) =>
        i === index ? { ...m, [field]: field === "mobile" ? formatMobile(value) : value } : m,
      ),
    }));
  const addMember = () =>
    setForm((f) => (f.teamMembers.length < maxMembers ? { ...f, teamMembers: [...f.teamMembers, blank()] } : f));
  const removeMember = (index: number) =>
    setForm((f) => (f.teamMembers.length > minMembers ? { ...f, teamMembers: f.teamMembers.filter((_, i) => i !== index) } : f));

  const validate = () => {
    const e: Errors = {};
    if (!form.teamName) e.teamName = "Unit designation is required";
    if (!form.email) e.email = "Email is required";
    else if (!isEmail(form.email)) e.email = "Email is invalid";
    if (!form.password) e.password = "Passphrase is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passphrases do not match";
    if (!form.teamLeaderName) e.teamLeaderName = "Lead operative name is required";
    if (!form.teamLeaderMobile) e.teamLeaderMobile = "Contact number is required";
    else if (!validateMobile(form.teamLeaderMobile)) e.teamLeaderMobile = "Enter a valid Indian mobile number";
    if (!form.teamLeaderDepartment) e.teamLeaderDepartment = "Division is required";

    form.teamMembers.forEach((m, i) => {
      if (!m.name.trim()) e[`m${i}name`] = "Required";
      if (!m.email.trim()) e[`m${i}email`] = "Required";
      else if (!isEmail(m.email)) e[`m${i}email`] = "Invalid email";
      if (!m.mobile.trim()) e[`m${i}mobile`] = "Required";
      else if (!validateMobile(m.mobile)) e[`m${i}mobile`] = "Invalid number";
      if (!m.department.trim()) e[`m${i}dept`] = "Required";
    });

    const emails = [form.email, ...form.teamMembers.map((m) => m.email)].map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (emails.some((x, i) => emails.indexOf(x) !== i)) e.team = "Email addresses must be unique across the team.";
    const mobiles = [strip(form.teamLeaderMobile), ...form.teamMembers.map((m) => strip(m.mobile))].filter(Boolean);
    if (mobiles.some((x, i) => mobiles.indexOf(x) !== i)) e.team = "Mobile numbers must be unique across the team.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await apiSend("/api/register", "POST", {
        email: form.email,
        password: form.password,
        teamName: form.teamName,
        leaderName: form.teamLeaderName,
        leaderMobile: strip(form.teamLeaderMobile),
        leaderDepartment: form.teamLeaderDepartment,
        members: form.teamMembers.map((m) => ({ name: m.name, email: m.email, mobile: strip(m.mobile), department: m.department })),
      });
      const res = await signIn("credentials", { redirect: false, email: form.email, password: form.password });
      router.push(res && !res.error ? "/dashboard" : "/login?registered=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientError ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="w-full max-w-2xl">
        <motion.div variants={revealVariants} className="label mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-signal" /> Enlistment · New Field Unit
        </motion.div>
        <motion.h1 variants={revealVariants} className="font-serif text-5xl leading-[0.95] text-ink sm:text-7xl">
          Assemble Your Unit
        </motion.h1>
        <motion.p variants={revealVariants} className="mt-5 max-w-lg text-ink-2">
          {range
            ? range.min === range.max
              ? `Teams of exactly ${range.min}. Register the field unit to receive clearance.`
              : `Teams of ${range.min}–${range.max} operatives. Register the field unit to receive clearance.`
            : "Register the field unit to receive clearance."}
        </motion.p>

        <motion.form variants={revealVariants} onSubmit={handleSubmit} className="mt-10 space-y-10">
          {error && (
            <div className="flex items-center gap-3 border-l-2 border-alert pl-4">
              <span className="h-1.5 w-1.5 rounded-full bg-alert" />
              <p className="text-sm text-alert">{error}</p>
            </div>
          )}

          {/* Unit */}
          <section className="space-y-2">
            <div className="label">01 · Unit Designation</div>
            <Input label="Unit Name" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} error={errors.teamName} />
          </section>

          {/* Lead */}
          <section className="space-y-2">
            <div className="label mb-4">02 · Lead Operative</div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
              <Input label="Full Name" value={form.teamLeaderName} onChange={(e) => setForm({ ...form, teamLeaderName: e.target.value })} error={errors.teamLeaderName} />
              <Input label="Contact" type="tel" value={form.teamLeaderMobile} onChange={(e) => setForm({ ...form, teamLeaderMobile: formatMobile(e.target.value) })} error={errors.teamLeaderMobile} />
              <Select label="Division" value={form.teamLeaderDepartment} onChange={(v) => setForm({ ...form, teamLeaderDepartment: v })} options={departments} error={errors.teamLeaderDepartment} />
              <Input label="Passphrase" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
              <Input label="Confirm Passphrase" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} error={errors.confirmPassword} />
            </div>
          </section>

          {/* Operatives — dynamic roster bounded by the configured range */}
          {range && maxMembers > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="label">03 · Operatives</div>
                <span className="data text-xs text-ink-3">
                  Team size {total} · {fixed ? `exactly ${range.min}` : `${range.min}–${range.max}`}
                </span>
              </div>

              <div className="space-y-7">
                {form.teamMembers.map((member, index) => (
                  <div key={index} className="relative border-l border-line pl-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="label">Operative {String(index + 2).padStart(2, "0")}</div>
                      {!fixed && form.teamMembers.length > minMembers && (
                        <button type="button" onClick={() => removeMember(index)} className="flex items-center gap-1 text-ink-3 transition-colors hover:text-alert">
                          <X className="h-3.5 w-3.5" /> <span className="label">Remove</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                      <Input label="Full Name" value={member.name} onChange={(e) => updateMember(index, "name", e.target.value)} error={errors[`m${index}name`]} />
                      <Input label="Email" type="email" value={member.email} onChange={(e) => updateMember(index, "email", e.target.value)} error={errors[`m${index}email`]} />
                      <Input label="Contact" type="tel" value={member.mobile} onChange={(e) => updateMember(index, "mobile", e.target.value)} error={errors[`m${index}mobile`]} />
                      <Select label="Division" value={member.department} onChange={(v) => updateMember(index, "department", v)} options={departments} error={errors[`m${index}dept`]} />
                    </div>
                  </div>
                ))}
              </div>

              {!fixed && form.teamMembers.length < maxMembers && (
                <button
                  type="button"
                  onClick={addMember}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-2 transition-colors hover:border-signal hover:text-signal"
                >
                  <Plus className="h-4 w-4" /> Add operative ({form.teamMembers.length + 1} of {maxMembers})
                </button>
              )}

              {errors.team && <p className="text-sm text-alert">{errors.team}</p>}
            </section>
          )}

          {range && maxMembers === 0 && (
            <section className="border-l border-line pl-4">
              <div className="label mb-1">03 · Operatives</div>
              <p className="text-sm text-ink-2">Solo operation — the lead operative runs this unit alone.</p>
            </section>
          )}

          <SweepButton type="submit" loading={submitting}>
            {submitting ? "Filing Enlistment" : "Register Field Unit"}
          </SweepButton>

          <p className="label text-center !text-ink-3">
            Already enlisted?{" "}
            <Link href="/login" className="!text-signal transition-opacity hover:opacity-80">Request clearance</Link>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
