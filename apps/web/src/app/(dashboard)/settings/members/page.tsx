"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { createApi } from "@/lib/api";
import { useT } from "@/hooks/useT";
import { UserRoleLabel, type UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, Copy, Check } from "lucide-react";

const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 2, label: "Admin" },
  { value: 3, label: "Developer" },
  { value: 4, label: "Viewer" },
];

function roleBadgeClass(role: UserRole) {
  if (role === 1) return "bg-amber-900/40 text-amber-400";
  if (role === 2) return "bg-blue-900/40 text-blue-400";
  if (role === 3) return "bg-green-900/40 text-green-400";
  return "bg-zinc-800 text-zinc-400";
}

export default function MembersPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(3);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => api.listMembers(),
    enabled: !!token,
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.inviteMember(inviteEmail, inviteRole),
    onSuccess: (res) => {
      const link = `${window.location.origin}/invite/${res.token}`;
      setInviteLink(link);
      setInviteEmail("");
      setInviteError(null);
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: UserRole }) =>
      api.updateMemberRole(memberId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Invite panel */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">{t("members.invite")}</h2>
        <div className="flex gap-3">
          <Input
            placeholder={t("members.emailPlaceholder")}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(Number(e.target.value) as UserRole)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            {ASSIGNABLE_ROLES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!inviteEmail || inviteMutation.isPending}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t("common.invite")}
          </Button>
        </div>

        {inviteError && <p className="mt-2 text-xs text-red-400">{inviteError}</p>}

        {inviteLink && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
            <span className="flex-1 truncate text-xs text-zinc-300">{inviteLink}</span>
            <button onClick={copyLink} className="text-zinc-400 hover:text-zinc-100">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            {t("members.list")} <span className="ml-1 text-zinc-500">({members.length})</span>
          </h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-zinc-500">{t("common.loading")}</div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm text-zinc-100">{m.displayName}</p>
                  <p className="text-xs text-zinc-500">{m.email}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role badge / inline selector */}
                  {m.role === 1 ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadgeClass(m.role)}`}>
                      {UserRoleLabel[m.role]}
                    </span>
                  ) : (
                    <select
                      value={m.role}
                      disabled={updateRoleMutation.isPending}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          memberId: m.userId,
                          role: Number(e.target.value) as UserRole,
                        })
                      }
                      className={`rounded-full px-2 py-0.5 text-xs border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-600 ${roleBadgeClass(m.role)}`}
                    >
                      {ASSIGNABLE_ROLES.map((o) => (
                        <option key={o.value} value={o.value} className="bg-zinc-800 text-zinc-100">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {m.role !== 1 && (
                    <button
                      onClick={() => removeMutation.mutate(m.userId)}
                      disabled={removeMutation.isPending}
                      className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
