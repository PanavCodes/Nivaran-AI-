"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus } from "lucide-react";

import { homeForRole, register, type Role } from "@/lib/auth";
import { sound } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { CampBotChat } from "@/components/chat/CampBotChat";

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "STUDENT", label: "Student", desc: "Report issues, track progress" },
  { value: "FACULTY", label: "Faculty", desc: "Department reports & escalations" },
  { value: "TECHNICIAN", label: "Technician", desc: "Task Force queue & dual-proof closure" },
  { value: "ADMIN", label: "Administrator", desc: "Mission Control & dispatch" },
];

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "STUDENT" as Role,
    department: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    sound.playClick();
    setBusy(true);
    try {
      const user = await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        department: form.department || undefined,
      });
      sound.playSuccess();
      toast.success(`Account created — Welcome to Nivaran AI, ${user.full_name}!`);
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#58a6ff]";

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <Navbar />

      <main className="radar-canvas flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        <div className="radar-sweep opacity-30 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md my-8"
        >
          <Card className="border-[#30363d] bg-[#161b22]/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Account</h1>
                  <p className="mt-1 text-xs text-[#8b949e]">
                    Join your campus problem intelligence network
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/30">
                  <UserPlus size={20} />
                </div>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                    Full Name
                  </label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className={field}
                    placeholder="Aarav Sharma"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                    University Email
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={field}
                    placeholder="aarav@campus.edu"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[#8b949e]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#8b949e] hover:text-[#58a6ff] transition flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={field}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                      Role
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                      className={field}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                      Department
                    </label>
                    <input
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className={field}
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-[#0d1117] p-2.5 text-[11px] text-[#8b949e] border border-[#21262d]">
                  <span className="text-white font-medium">Selected Role: </span>
                  {ROLES.find((r) => r.value === form.role)?.desc}
                </div>

                <Button type="submit" disabled={busy} className="w-full py-2.5 font-bold">
                  {busy ? "Creating Account…" : "Create Account"}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
                <span>Already registered?</span>
                <Link href="/login" className="font-semibold text-[#58a6ff] hover:underline">
                  Sign In →
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <CampBotChat />
    </div>
  );
}
