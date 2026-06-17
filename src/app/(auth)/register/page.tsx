"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Users, Mail, Lock, User, Phone, Trophy, Zap, Target, Clock, UserPlus, Eye, EyeOff, AlertTriangle, GraduationCap } from "lucide-react";
import Particles from "@/components/Particles";
import { apiSend, ClientError } from "@/lib/client";

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

const stats = [
  { icon: Target, label: "20 Pictures", color: "text-cyan-400" },
  { icon: Zap, label: "20 Riddles", color: "text-purple-400" },
  { icon: Clock, label: "2 Hours", color: "text-green-400" },
  { icon: Users, label: "4 Members", color: "text-yellow-400" },
];

type Member = { name: string; mobile: string; department: string };
type Errors = Record<string, string>;

const strip = (m: string) => m.replace(/^\+91\s*/, "").replace(/\D/g, "");
const validateMobile = (m: string) => /^[6-9]\d{9}$/.test(strip(m));
const formatMobile = (m: string) => {
  const c = m.replace(/\D/g, "");
  if (c.startsWith("91")) return "+91 " + c.substring(2);
  if (c.length <= 10) return "+91 " + c;
  return m;
};

const inputCls =
  "w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 hover:border-gray-600/50 text-sm sm:text-base min-h-[48px] sm:min-h-[56px]";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    teamName: "", email: "", password: "", confirmPassword: "",
    teamLeaderName: "", teamLeaderMobile: "", teamLeaderDepartment: "",
    teamMembers: [
      { name: "", mobile: "", department: "" },
      { name: "", mobile: "", department: "" },
      { name: "", mobile: "", department: "" },
    ] as Member[],
  });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => setIsVisible(true), []);

  const updateMember = (index: number, field: keyof Member, value: string) =>
    setForm((f) => ({
      ...f,
      teamMembers: f.teamMembers.map((m, i) =>
        i === index ? { ...m, [field]: field === "mobile" ? formatMobile(value) : value } : m,
      ),
    }));

  const validate = () => {
    const e: Errors = {};
    if (!form.teamName) e.teamName = "Team name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email is invalid";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.teamLeaderName) e.teamLeaderName = "Team leader name is required";
    if (!form.teamLeaderMobile) e.teamLeaderMobile = "Team leader mobile number is required";
    else if (!validateMobile(form.teamLeaderMobile)) e.teamLeaderMobile = "Enter a valid Indian mobile number";
    if (!form.teamLeaderDepartment) e.teamLeaderDepartment = "Team leader department is required";

    const valid = form.teamMembers.filter((m) => m.name.trim() && m.mobile.trim() && m.department.trim());
    if (valid.length !== 3) e.teamMembers = "All 3 team members are required (4 total including leader)";

    const all = [strip(form.teamLeaderMobile), ...valid.map((m) => strip(m.mobile))].filter(Boolean);
    if (all.some((n, i) => all.indexOf(n) !== i)) e.teamMembers = "Mobile numbers must be unique (including leader)";

    form.teamMembers.forEach((m, i) => {
      if (m.mobile.trim() && !validateMobile(m.mobile)) e[`member${i}Mobile`] = `Member ${i + 2}: Invalid mobile number`;
    });

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
        members: form.teamMembers.map((m) => ({ name: m.name, mobile: strip(m.mobile), department: m.department })),
      });
      // Auto sign-in, then to dashboard.
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
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <Particles particleColors={["#01b2fe"]} particleCount={700} particleSpread={10} speed={0.2} particleBaseSize={100} alphaParticles={false} disableRotation={false} pixelRatio={1} />
      </div>

      <div className={`max-w-sm sm:max-w-2xl lg:max-w-4xl w-full transition-all duration-1000 transform ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/25 mb-3 sm:mb-4">
              <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 sm:mb-3">Join the Hunt</h1>
          <p className="text-gray-400 text-base sm:text-lg">Register your team for the ultimate adventure</p>
        </div>

        {/* Notice */}
        <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 mb-6 sm:mb-8">
          <div className="flex items-start">
            <AlertTriangle className="text-orange-400 mr-3 mt-0.5 flex-shrink-0 w-5 h-5" />
            <div>
              <p className="text-orange-300 font-medium text-sm mb-1">Important Notice</p>
              <p className="text-orange-400 text-sm">Only <strong>1 device is allowed to login at a time</strong>. Logging in elsewhere signs out the previous session.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`bg-gray-800/30 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group hover:scale-105 ${isVisible ? "animate-slideInUp" : ""}`} style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color} group-hover:scale-110 transition-transform`} />
                <span className="text-white text-xs sm:text-sm font-medium">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-4 sm:p-6 lg:p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-4 sm:mb-6">
              <div className="flex items-center"><div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" /><span className="text-sm sm:text-base">{error}</span></div>
            </div>
          )}

          <div className="space-y-6 sm:space-y-8">
            {/* Team Information */}
            <div className="space-y-4 sm:space-y-6">
              <SectionHeader grad="from-yellow-500 to-orange-600" icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} title="Team Information" />
              <Field label="Team Name" icon={<Users className="fieldicon" />} error={errors.teamName}>
                <input type="text" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} className={inputCls} placeholder="Enter your team name" />
              </Field>
            </div>

            {/* Team Leader */}
            <div className="space-y-4 sm:space-y-6">
              <SectionHeader grad="from-purple-500 to-pink-600" icon={<User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} title="Team Leader Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Field label="Team Leader Email" icon={<Mail className="fieldicon" />} error={errors.email}>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="team.leader@email.com" />
                </Field>
                <Field label="Full Name" icon={<User className="fieldicon" />} error={errors.teamLeaderName}>
                  <input type="text" value={form.teamLeaderName} onChange={(e) => setForm({ ...form, teamLeaderName: e.target.value })} className={inputCls} placeholder="Enter your full name" />
                </Field>
                <Field label="Mobile Number" icon={<Phone className="fieldicon" />} error={errors.teamLeaderMobile}>
                  <input type="tel" value={form.teamLeaderMobile} onChange={(e) => setForm({ ...form, teamLeaderMobile: formatMobile(e.target.value) })} className={inputCls} placeholder="+91 9876543210" />
                </Field>
                <Field label="Department" icon={<GraduationCap className="fieldicon" />} error={errors.teamLeaderDepartment}>
                  <select value={form.teamLeaderDepartment} onChange={(e) => setForm({ ...form, teamLeaderDepartment: e.target.value })} className={inputCls}>
                    <option value="" className="bg-gray-800">Select Department</option>
                    {departments.map((d) => <option key={d} value={d} className="bg-gray-800">{d}</option>)}
                  </select>
                </Field>
                <Field label="Password" icon={<Lock className="fieldicon" />} error={errors.password}>
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls + " pr-10"} placeholder="Minimum 8 characters" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 p-1">
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </Field>
                <Field label="Confirm Password" icon={<Lock className="fieldicon" />} error={errors.confirmPassword}>
                  <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className={inputCls + " pr-10"} placeholder="Confirm your password" />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 p-1">
                    {showConfirm ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </Field>
              </div>
            </div>

            {/* Members */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <SectionHeader grad="from-green-500 to-teal-600" icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} title="Team Members (3 Required)" />
                <div className="text-sm text-gray-400 bg-gray-700/30 px-3 py-1 rounded-full">Total: 4 members (including leader)</div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {form.teamMembers.map((member, index) => (
                  <div key={index} className="p-3 sm:p-4 bg-gray-900/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs sm:text-sm font-medium text-gray-400">Member {index + 2}</span>
                      <span className="text-xs text-green-400">Required</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      <MemberField icon={<User className="memicon" />}>
                        <input type="text" value={member.name} onChange={(e) => updateMember(index, "name", e.target.value)} className="w-full pl-10 pr-3 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm min-h-[44px]" placeholder="Full name" />
                      </MemberField>
                      <MemberField icon={<Phone className="memicon" />} error={errors[`member${index}Mobile`]}>
                        <input type="tel" value={member.mobile} onChange={(e) => updateMember(index, "mobile", e.target.value)} className="w-full pl-10 pr-3 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm min-h-[44px]" placeholder="+91 9876543210" />
                      </MemberField>
                      <MemberField icon={<GraduationCap className="memicon" />}>
                        <select value={member.department} onChange={(e) => updateMember(index, "department", e.target.value)} className="w-full pl-10 pr-3 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:border-cyan-400 text-sm min-h-[44px]">
                          <option value="" className="bg-gray-800">Select Department</option>
                          {departments.map((d) => <option key={d} value={d} className="bg-gray-800">{d}</option>)}
                        </select>
                      </MemberField>
                    </div>
                  </div>
                ))}
              </div>
              {errors.teamMembers && <p className="text-red-400 text-xs sm:text-sm">{errors.teamMembers}</p>}
            </div>

            <button type="submit" disabled={submitting} className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 shadow-lg shadow-cyan-500/25 btn-cyber min-h-[48px] sm:min-h-[56px]">
              {submitting ? (
                <span className="flex items-center justify-center"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />Creating Your Team...</span>
              ) : (
                <span className="relative z-10">Register Team &amp; Join Hunt</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm sm:text-base inline-block py-2">
                Already have a team? <span className="text-cyan-400 ml-1">Sign in here</span>
              </Link>
            </div>
          </div>
        </form>

        {/* Guidelines */}
        <div className="mt-6 sm:mt-8 bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
            <Trophy className="text-yellow-400 mr-2 w-4 h-4 sm:w-5 sm:h-5" /> Team Guidelines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {["Team must have exactly 4 members (including leader)", "One team leader manages the account", "All members need unique mobile numbers", "Team leader receives all communications", "Physical presence required for verification", "Only 1 device login allowed at a time"].map((rule, index) => (
              <div key={index} className="flex items-start group">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <span className="text-gray-300 text-xs sm:text-sm leading-relaxed">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ grad, icon, title }: { grad: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center space-x-2 sm:space-x-3">
      <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${grad} shadow-lg`}>{icon}</div>
      <h3 className="text-lg sm:text-xl font-semibold text-white">{title}</h3>
    </div>
  );
}

function Field({ label, icon, error, children }: { label: string; icon: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative group">
        <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 [&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5 group-focus-within:text-cyan-400">{icon}</span>
        {children}
      </div>
      {error && <p className="text-red-400 text-xs sm:text-sm mt-2">{error}</p>}
    </div>
  );
}

function MemberField({ icon, error, children }: { icon: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 [&_svg]:w-4 [&_svg]:h-4 group-focus-within:text-cyan-400">{icon}</span>
        {children}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
