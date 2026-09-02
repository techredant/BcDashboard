"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminPatch } from "@/lib/adminClient";
import { useStaffAuth } from "@/lib/staffAuth";
import { toast } from "sonner";

export const STAFF_ROLE_OPTIONS = [
  { value: "user", label: "Member" },
  { value: "support", label: "Support" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
] as const;

export type StaffRoleValue = (typeof STAFF_ROLE_OPTIONS)[number]["value"];

function roleLabel(role?: string | null) {
  const match = STAFF_ROLE_OPTIONS.find((o) => o.value === role);
  return match?.label || "Member";
}

type Props = {
  userId: string;
  role?: string | null;
  disabled?: boolean;
  onUpdated?: (role: string) => void;
  className?: string;
};

export function UserStaffRoleSelect({
  userId,
  role,
  disabled,
  onUpdated,
  className,
}: Props) {
  const { staff, hasPermission } = useStaffAuth();
  const [saving, setSaving] = useState(false);
  const current = role || "user";
  const canAssign = hasPermission("assign_roles");
  const isSelf = staff?.clerkId === userId;

  const options = STAFF_ROLE_OPTIONS.filter((opt) => {
    if (staff?.role === "super_admin") return true;
    return opt.value !== "super_admin";
  });

  const updateRole = async (next: string) => {
    if (!canAssign || saving || next === current) return;
    setSaving(true);
    try {
      const res = await adminPatch<{ user?: { role?: string }; changed?: boolean }>(
        `/api/admin/users/${encodeURIComponent(userId)}/role`,
        { role: next },
      );
      const updatedRole = res.user?.role || next;
      toast.success(`Access level set to ${roleLabel(updatedRole)}`);
      onUpdated?.(updatedRole);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not update access level",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canAssign) {
    return (
      <span className="text-sm capitalize text-muted-foreground">
        {roleLabel(current)}
      </span>
    );
  }

  return (
    <Select
      value={current}
      onValueChange={updateRole}
      disabled={disabled || saving || isSelf}
    >
      <SelectTrigger className={className || "w-full max-w-xs"}>
        <SelectValue placeholder="Select access level" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { roleLabel };
