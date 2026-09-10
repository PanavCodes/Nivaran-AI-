"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, homeForRole, type Role, type SessionUser } from "@/lib/auth";
import { getToken } from "@/lib/api";
import { toast } from "sonner";

interface RoleGuardOptions {
  allowedRoles: Role[];
  portalName?: string;
  customMessage?: string;
  redirectToHomeOnFail?: boolean;
}

export function useRoleGuard({
  allowedRoles,
  portalName = "Portal",
  customMessage,
  redirectToHomeOnFail = false,
}: RoleGuardOptions) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      setIsAuthorized(false);
      setIsLoading(false);
      toast.error(`Please sign in to access the ${portalName}`);
      router.replace("/login");
      return;
    }

    setUser(storedUser);

    if (allowedRoles.includes(storedUser.role)) {
      setIsAuthorized(true);
      setIsLoading(false);
    } else {
      setIsAuthorized(false);
      setIsLoading(false);

      const roleDisplay = storedUser.role.charAt(0) + storedUser.role.slice(1).toLowerCase();
      const msg =
        customMessage ||
        `Access Denied: ${roleDisplay} accounts are not authorized to view the ${portalName}.`;

      toast.error(msg);

      if (redirectToHomeOnFail) {
        const destination = homeForRole(storedUser.role);
        router.replace(destination);
      }
    }
  }, [allowedRoles, portalName, customMessage, redirectToHomeOnFail, router]);

  const destinationPath = user ? homeForRole(user.role) : "/login";
  const destinationLabel = user
    ? user.role === "STUDENT" || user.role === "FACULTY"
      ? "Return to Student Portal"
      : user.role === "TECHNICIAN"
      ? "Return to Work Orders"
      : "Return to Admin Console"
    : "Sign In";

  return {
    user,
    isAuthorized,
    isLoading,
    destinationPath,
    destinationLabel,
  };
}
