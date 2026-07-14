"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, getSession, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2, MonitorSmartphone, Radio } from "lucide-react";
import { apiSend, ClientError } from "@/lib/client";
import { Input } from "@/components/ui/Input";
import { SweepButton } from "@/components/ui/SweepButton";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Panel } from "@/components/ui/Panel";
import { staggerContainer, revealVariants } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTakeover, setShowTakeover] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  // Surfaced when this device was signed out because the account opened
  // elsewhere, or arrived here after registering (auto sign-in didn't stick).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("kicked") === "1") setKicked(true);
    if (params.get("registered") === "1") setJustRegistered(true);
  }, []);

  // Already signed in? Bounce back into the app. This is what makes the Back
  // gesture safe: returning to /login while authenticated lands you in the app
  // instead of showing the sign-in screen (which read as an unwarned sign-out).
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(session?.user?.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [status, session, router]);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!formData.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Email is invalid";
    if (!formData.password) errors.password = "Password is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Performs the actual sign-in (taking over any other device).
  const doSignIn = async () => {
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email: formData.email, password: formData.password });
    if (!res || res.error) {
      setError("Credentials rejected. Access denied.");
      setLoading(false);
      return;
    }
    const session = await getSession();
    // Replace (not push) so /login is not left underneath in history — Back then
    // moves within the app rather than returning to the sign-in screen.
    router.replace(session?.user?.role === "ADMIN" ? "/admin" : "/dashboard");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setKicked(false);
    if (!validate()) return;
    setLoading(true);
    try {
      // Probe first: if the account is already active elsewhere, warn before taking over.
      const chk = await apiSend<{ valid: boolean; hasActiveSession: boolean }>(
        "/api/auth/session-check",
        "POST",
        { email: formData.email, password: formData.password },
      );
      if (!chk.valid) {
        setError("Credentials rejected. Access denied.");
        setLoading(false);
        return;
      }
      if (chk.hasActiveSession) {
        setLoading(false);
        setShowTakeover(true);
        return;
      }
      await doSignIn();
    } catch (err) {
      setError(err instanceof ClientError ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const confirmTakeover = async () => {
    setShowTakeover(false);
    await doSignIn();
  };

  // While a returning (authenticated) session resolves, show a loader instead of
  // the sign-in form so Back never flashes the "signed out" screen.
  if (status !== "unauthenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <Radio className="h-6 w-6 animate-breathe text-signal" />
          <p className="label">Establishing Uplink</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="w-full max-w-md">
        <motion.div variants={revealVariants} className="label mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-signal" /> Restricted · Clearance Required
        </motion.div>
        <motion.h1 variants={revealVariants} className="font-serif text-6xl leading-[0.95] text-ink sm:text-7xl">
          Treasure Hunt
        </motion.h1>
        <motion.p variants={revealVariants} className="mt-5 text-ink-2">
          An intelligence operation. Identify yourself to proceed.
        </motion.p>

        {/* Registered notice */}
        {justRegistered && (
          <motion.div variants={revealVariants} className="mt-6 flex items-start gap-3 border-l-2 border-signal pl-4">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
            <p className="text-sm text-ink-2">
              Enlistment filed. Sign in with your new credentials to begin the operation.
            </p>
          </motion.div>
        )}

        {/* Kicked notice */}
        {kicked && (
          <motion.div variants={revealVariants} className="mt-6 flex items-start gap-3 border-l-2 border-signal pl-4">
            <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
            <p className="text-sm text-ink-2">
              You were signed out — this account was opened on another device. Sign in again to resume here.
            </p>
          </motion.div>
        )}

        {/* Access / Enlist — registration gets equal billing in one compact row */}
        <motion.div variants={revealVariants} className="mt-8 grid grid-cols-2 gap-1 rounded-xl border border-line p-1">
          <span className="rounded-lg bg-signal py-2.5 text-center font-mono text-[0.7rem] uppercase tracking-[0.18em] text-paper">
            Access
          </span>
          <Link
            href="/register"
            className="rounded-lg py-2.5 text-center font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:bg-paper-1 hover:text-ink"
          >
            Enlist
          </Link>
        </motion.div>

        <motion.form variants={revealVariants} onSubmit={handleSubmit} className="mt-6 space-y-7">
          {error && (
            <div className="flex items-center gap-3 border-l-2 border-alert pl-4">
              <span className="h-1.5 w-1.5 rounded-full bg-alert" />
              <p className="text-sm text-alert">{error}</p>
            </div>
          )}
          <Input
            label="Operative Email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
          />
          <Input
            label="Passphrase"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={formErrors.password}
          />

          <SweepButton type="submit" loading={loading}>
            {loading ? "Authenticating" : "Request Clearance"}
          </SweepButton>
        </motion.form>

        <motion.div variants={revealVariants} className="mt-10">
          <Panel label="Operational Briefing">
            <ul className="space-y-2.5">
              {[
                "Field units register with their full roster",
                "60-second cooldown between position checks",
                "Two-hour operational window",
                "Positions confirmed on-site by coordinate",
                "One active device per operative",
              ].map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-2">
                  <span className="data text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </motion.div>

        <motion.div variants={revealVariants} className="mt-10 flex items-center justify-center gap-10 opacity-60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logos/RVSmall.png" alt="RV Logo" className="h-14 w-auto" />
          <div className="h-12 w-px bg-line-strong" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logos/CCWhite.png" alt="CC Logo" className="h-16 w-auto" />
        </motion.div>
      </motion.div>

      {/* Single-device takeover */}
      <Sheet open={showTakeover} onClose={() => setShowTakeover(false)} draggable={false}>
        <div className="pb-2">
          <div className="label mb-3 flex items-center gap-2 !text-signal">
            <MonitorSmartphone className="h-3.5 w-3.5" /> Single-Device Policy
          </div>
          <h2 className="font-serif text-3xl text-ink">Active on another device</h2>
          <p className="mt-4 text-ink-2">
            This account is already signed in elsewhere. Only one device may be active at a time —
            continuing will sign that device out and take over here.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button size="lg" className="w-full" noMagnet disabled={loading} onClick={confirmTakeover}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log out other device & continue"}
            </Button>
            <Button variant="ghost" size="lg" className="w-full" noMagnet onClick={() => setShowTakeover(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
