"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { homeForRole, register, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ROLES: { value: Role; label: string }[] = [
  { value: "STUDENT", label: "Student" },
  { value: "FACULTY", label: "Faculty" },
  { value: "TECHNICIAN", label: "Technician" },
  { value: "ADMIN", label: "Administrator" },
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
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        department: form.department || undefined,
      });
      toast.success("Account created — welcome to Nivaran");
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent";

  return (
    <main className="radar-canvas flex min-h-screen items-center justify-center p-6">
      <div className="radar-sweep opacity-30" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-white">Create account</h1>
            <p className="mt-1 text-sm text-[#8b949e]">Join your campus intelligence network</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Full name</label>
                <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={field} placeholder="Aarav Sharma" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} placeholder="you@campus.edu" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Password</label>
                <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={field} placeholder="Min 6 characters" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={field}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Department</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={field} placeholder="Optional" />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Creating…" : "Create Account"}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-[#8b949e]">
              Already registered?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
