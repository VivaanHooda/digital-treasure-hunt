"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { Mail, Lock, MapPin, Trophy, Zap, Target, Clock, Users, Smartphone } from "lucide-react";
import Particles from "@/components/Particles";

const stats = [
  { icon: Target, label: "20 Pictures", color: "text-cyan-400" },
  { icon: Zap, label: "20 Riddles", color: "text-purple-400" },
  { icon: Clock, label: "2 Hours", color: "text-green-400" },
  { icon: Users, label: "4 Members", color: "text-yellow-400" },
];

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => setIsVisible(true), []);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!formData.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Email is invalid";
    if (!formData.password) errors.password = "Password is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      email: formData.email,
      password: formData.password,
    });
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
    <div className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <Particles particleColors={["#01b2fe"]} particleCount={700} particleSpread={10} speed={0.2} particleBaseSize={100} alphaParticles={false} disableRotation={false} pixelRatio={1} />
      </div>

      <div className={`max-w-sm sm:max-w-md w-full transition-all duration-1000 transform flex-grow flex flex-col justify-center ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/25 mb-3 sm:mb-4">
              <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 animate-pulse" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 bg-cyan-500/20 rounded-full blur-xl -z-10 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 sm:mb-3">
            Treasure Hunt
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">Enter the digital realm of adventure</p>
        </div>

        {/* Single-device notice */}
        <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 mb-6 sm:mb-8">
          <div className="flex items-start">
            <Smartphone className="text-orange-400 mr-3 mt-0.5 flex-shrink-0 w-5 h-5" />
            <div>
              <p className="text-orange-300 font-medium text-sm mb-1">Single Device Login</p>
              <p className="text-orange-400 text-sm">
                Only <strong>1 device is allowed to login at a time</strong>. Logging in from another device signs out the first.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`bg-gray-800/30 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group hover:scale-105 ${isVisible ? "animate-slideInUp" : ""}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color} group-hover:scale-110 transition-transform`} />
                <span className="text-white text-xs sm:text-sm font-medium">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-4 sm:mb-6 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" />
                <span className="text-sm sm:text-base">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 hover:border-gray-600/50 text-sm sm:text-base min-h-[48px] sm:min-h-[56px]"
                    placeholder="Enter your email address"
                  />
                </div>
                {formErrors.email && <p className="text-red-400 text-xs sm:text-sm mt-2">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 hover:border-gray-600/50 text-sm sm:text-base min-h-[48px] sm:min-h-[56px]"
                    placeholder="Enter your password"
                  />
                </div>
                {formErrors.password && <p className="text-red-400 text-xs sm:text-sm mt-2">{formErrors.password}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-xl relative overflow-hidden group text-sm sm:text-base min-h-[48px] sm:min-h-[56px] btn-cyber"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                  Authenticating...
                </span>
              ) : (
                <span className="relative z-10">Enter the Hunt</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/register" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm sm:text-base inline-block py-2">
                Don&apos;t have a team? <span className="text-cyan-400 ml-1">Create one</span>
              </Link>
            </div>
          </form>
        </div>

        {/* Bottom logos */}
        <div className={`mt-6 sm:mt-8 flex items-center justify-center space-x-8 sm:space-x-12 transition-all duration-1000 delay-500 transform ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logos/RVSmall.png" alt="RV Logo" className="h-16 sm:h-20 w-auto opacity-70 hover:opacity-100 transition-opacity" />
          <div className="w-px h-16 sm:h-20 bg-gray-600/50" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logos/CCWhite.png" alt="CC Logo" className="h-20 sm:h-24 w-auto opacity-70 hover:opacity-100 transition-opacity" />
        </div>

        {/* Game rules */}
        <div className="mt-6 sm:mt-8 bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
            <Trophy className="text-yellow-400 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Game Rules
          </h3>
          <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-300">
            {["Teams of exactly 4 members only", "1-minute cooldown between guesses", "2-hour time limit for entire game", "Visit locations physically to verify"].map((rule, index) => (
              <li key={index} className="flex items-start group">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <span className="leading-relaxed">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
