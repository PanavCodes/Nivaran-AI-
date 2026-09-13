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

  // Serialize allowedRoles to avoid infinite loop from array literal reference changes
  const rolesKey = allowedRoles.slice().sort().join(",");

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      setUser(null);
      setIsAuthorized(false);
      setIsLoading(false);
      toast.error(`Please sign in to access the ${portalName}`);
      router.replace("/login");
      return;
    }

    setUser((prev) => (prev?.id === storedUser.id && prev?.role === storedUser.role ? prev : storedUser));

    const rolesList = rolesKey ? (rolesKey.split(",") as Role[]) : [];
    if (rolesList.includes(storedUser.role)) {
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
  }, [rolesKey, portalName, customMessage, redirectToHomeOnFail, router]);

  const destinationPath = user ? homeForRole(user.role) : "/login";
  const destinationLabel = user
    ? user.role === "STUDENT"
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
