"use client";

import { api, clearToken, getToken, setToken } from "./api";

export type Role = "STUDENT" | "FACULTY" | "TECHNICIAN" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  department?: string | null;
  avatar_url?: string | null;
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("nivaran_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function storeUser(user: SessionUser) {
  localStorage.setItem("nivaran_user", JSON.stringify(user));
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
    case "FACULTY":
      return "/admin";
    case "TECHNICIAN":
      return "/technician";
    default:
      return "/report";
  }
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const token = await api.post<{ access_token: string; role: Role; full_name: string }>(
    "/api/v1/auth/login",
    { email, password },
  );
  setToken(token.access_token);
  const me = await api.get<SessionUser>("/api/v1/auth/me");
  storeUser(me);
  return me;
}

export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  department?: string;
}): Promise<SessionUser> {
  const token = await api.post<{ access_token: string }>("/api/v1/auth/register", data);
  setToken(token.access_token);
  const me = await api.get<SessionUser>("/api/v1/auth/me");
  storeUser(me);
  return me;
}

export const DEMO_ACCOUNTS = {
  ADMIN: { email: "admin@nivaran.edu", password: "Admin@123", label: "Admin (Mission Control)" },
  TECHNICIAN: { email: "tech.maintenance@nivaran.edu", password: "Tech@123", label: "Technician (Task Force)" },
  STUDENT: { email: "student1@nivaran.edu", password: "Student@123", label: "Student (Radar Intake)" },
  FACULTY: { email: "faculty@nivaran.edu", password: "Faculty@123", label: "Faculty (Campus Rep)" },
} as const;

export async function quickLoginAs(role: keyof typeof DEMO_ACCOUNTS): Promise<SessionUser> {
  const creds = DEMO_ACCOUNTS[role];
  return login(creds.email, creds.password);
}

export function logout() {
  clearToken();
  window.location.href = "/login";
}

export function requireAuth(): SessionUser | null {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) {
    window.location.href = "/login";
    return null;
  }
  return user;
}

