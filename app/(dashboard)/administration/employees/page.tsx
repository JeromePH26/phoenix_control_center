"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import NewEmployeeModal from "@/components/NewEmployeeModal";
import type { Employee } from "@/lib/types";

type LoadState = "loading" | "loaded" | "forbidden" | "unreachable" | "error";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [showNewModal, setShowNewModal] = useState(false);
  const [disableTarget, setDisableTarget] = useState<Employee | null>(null);
  const [disableBusy, setDisableBusy] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/employees");
      if (res.status === 403) {
        setState("forbidden");
        return;
      }
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : data?.employees ?? []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDisable() {
    if (!disableTarget) return;
    setDisableBusy(true);
    setDisableError(null);
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(disableTarget.id)}/disable`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDisableError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setDisableTarget(null);
      load();
    } catch {
      setDisableError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setDisableBusy(false);
    }
  }

  const columns: Column<Employee>[] = [
    { header: "Name", cell: (e) => <span className="font-medium text-neutral-900">{e.name}</span> },
    { header: "Login", cell: (e) => e.login },
    { header: "E-Mail", cell: (e) => e.email },
    { header: "Rolle", cell: (e) => <Badge tone="gold">{e.role}</Badge> },
    { header: "Abteilung", cell: (e) => e.department || "–" },
    {
      header: "Status",
      cell: (e) =>
        e.status ? (
          <Badge tone={e.status.toLowerCase() === "active" || e.status.toLowerCase() === "aktiv" ? "green" : "neutral"}>
            {e.status}
          </Badge>
        ) : (
          "–"
        ),
    },
    { header: "Aktive Sessions", cell: (e) => e.activeSessionCount ?? "–" },
    { header: "Letzter Login", cell: (e) => e.lastLoginAt ?? "–" },
    {
      header: "",
      cell: (e) => (
        <Button
          variant="secondary"
          onClick={() => {
            setDisableTarget(e);
            setDisableError(null);
          }}
        >
          Deaktivieren
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Mitarbeiter</h1>
          <p className="text-sm text-neutral-400">Verwaltung von Mitarbeiterkonten und Rollen.</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>Neuer Mitarbeiter</Button>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "forbidden" && (
          <StateMessage
            title="Keine Berechtigung"
            description="Für dieses Konto liegt keine Berechtigung zum Anzeigen der Mitarbeiterliste vor."
          />
        )}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          />
        )}
        {state === "error" && (
          <StateMessage title="Mitarbeiter konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={employees} rowKey={(e) => e.id} emptyMessage="Keine Mitarbeiter vorhanden" />
        )}
      </Card>

      {showNewModal && (
        <NewEmployeeModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            load();
          }}
        />
      )}

      {disableTarget && (
        <ConfirmDialog
          title="Mitarbeiter deaktivieren"
          description={`"${disableTarget.name}" (${disableTarget.login}) wird deaktiviert und alle aktiven Sessions werden beendet. Dies kann nicht rückgängig gemacht werden.`}
          confirmLabel="Deaktivieren"
          busy={disableBusy}
          error={disableError}
          onConfirm={handleDisable}
          onClose={() => setDisableTarget(null)}
        />
      )}
    </div>
  );
}
