"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { PhoenixUser } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const PAGE_SIZE = 50;

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  PENDING_EMAIL_VERIFICATION: "E-Mail-Bestätigung ausstehend",
  ACTIVE: "Aktiv",
  SUSPENDED: "Gesperrt",
  PERMANENTLY_SUSPENDED: "Dauerhaft gesperrt",
  DELETION_PENDING: "Löschung beantragt",
  DELETED: "Gelöscht",
};
function statusLabel(status: string): string {
  return ACCOUNT_STATUS_LABEL[status] ?? status;
}
function statusTone(status: string): "gold" | "neutral" | "green" | "red" {
  if (status === "ACTIVE") return "green";
  if (status === "SUSPENDED" || status === "PERMANENTLY_SUSPENDED") return "red";
  if (status === "PENDING_EMAIL_VERIFICATION" || status === "DELETION_PENDING") return "gold";
  return "neutral";
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  USER: "Nutzer",
  EMPLOYEE: "Mitarbeiter",
  OWNER: "Inhaber",
};
function typeLabel(type: string): string {
  return ACCOUNT_TYPE_LABEL[type] ?? type;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

function BoolSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Alle</option>
        <option value="true">Ja</option>
        <option value="false">Nein</option>
      </select>
    </div>
  );
}

export default function UsersAccountsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const accountStatus = searchParams.get("accountStatus") ?? "";
  const hasPremium = searchParams.get("hasPremium") ?? "";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;

  const [users, setUsers] = useState<PhoenixUser[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (accountStatus) qs.set("accountStatus", accountStatus);
    if (hasPremium) qs.set("hasPremium", hasPremium);
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(offset));

    try {
      const res = await fetch(`/api/users?${qs.toString()}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (res.status === 403) {
        setState("error");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setCount(typeof data?.total === "number" ? data.total : null);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [search, accountStatus, hasPremium, offset]);

  useEffect(() => {
    load();
  }, [load]);

  function updateParam(key: string, value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    qs.delete("offset");
    router.replace(`/users/accounts${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function goToOffset(next: number) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next > 0) qs.set("offset", String(next));
    else qs.delete("offset");
    router.replace(`/users/accounts${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const columns: Column<PhoenixUser>[] = [
    { header: "PHÖNIX ID", cell: (u) => <span className="font-mono text-xs text-neutral-500">{u.phoenix_user_id}</span> },
    {
      header: "Nutzer",
      cell: (u) => (
        <span className="font-medium text-neutral-900">{u.display_name || u.username || u.email}</span>
      ),
    },
    { header: "E-Mail", cell: (u) => u.email },
    { header: "Typ", cell: (u) => typeLabel(u.account_type) },
    {
      header: "Status",
      cell: (u) => <Badge tone={statusTone(u.account_status)}>{statusLabel(u.account_status)}</Badge>,
    },
    {
      header: "Premium",
      cell: (u) => <Badge tone={u.has_premium ? "green" : "neutral"}>{u.has_premium ? "Ja" : "Nein"}</Badge>,
    },
    {
      header: "Sperre",
      cell: (u) => (u.has_active_ban ? <Badge tone="red">Aktiv gesperrt</Badge> : "–"),
    },
    { header: "Registriert", cell: (u) => formatDateTime(u.created_at) },
    { header: "Zuletzt aktiv", cell: (u) => formatDateTime(u.last_active_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Nutzerkonten
          <InfoTooltip text="Echte PHÖNIX-Nutzerkonten (E-Mail/Google-Registrierung) - nicht zu verwechseln mit den anonymen Geräte-Installationen unter 'Geräte'." />
        </h1>
        <p className="text-sm text-neutral-400">Profile, Premium, Sperren und Sessions je Nutzer.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="search" className="mb-1 block text-xs font-medium text-neutral-600">
            Suche (E-Mail, Username, PHÖNIX-ID)
          </label>
          <input
            id="search"
            defaultValue={search}
            className={`${inputClass} w-64`}
            onBlur={(e) => updateParam("search", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <div>
          <label htmlFor="accountStatus" className="mb-1 block text-xs font-medium text-neutral-600">
            Status
          </label>
          <select
            id="accountStatus"
            value={accountStatus}
            className={inputClass}
            onChange={(e) => updateParam("accountStatus", e.target.value)}
          >
            <option value="">Alle</option>
            {Object.entries(ACCOUNT_STATUS_LABEL).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <BoolSelect id="hasPremium" label="Premium" value={hasPremium} onChange={(v) => updateParam("hasPremium", v)} />
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          />
        )}
        {state === "error" && (
          <StateMessage title="Nutzer konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <>
            <DataTable
              columns={columns}
              rows={users}
              rowKey={(u) => String(u.id)}
              emptyMessage="Keine Nutzer gefunden"
              onRowClick={(u) => router.push(`/users/accounts/${u.id}`)}
            />
            {users.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {count != null ? `${offset + 1}–${offset + users.length} von ${count}` : `${users.length} Einträge`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={offset === 0}
                    onClick={() => goToOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Zurück
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={users.length < PAGE_SIZE}
                    onClick={() => goToOffset(offset + PAGE_SIZE)}
                  >
                    Weiter
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
