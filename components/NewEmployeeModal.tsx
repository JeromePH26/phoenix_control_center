"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { EMPLOYEE_ROLES, EmployeeRole } from "@/lib/types";

export default function NewEmployeeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<EmployeeRole>("SUPPORT");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          login,
          email,
          password,
          role,
          department: department || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler beim Anlegen (Status ${res.status}).`);
        return;
      }

      onCreated();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
  const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

  return (
    <Modal title="Neuer Mitarbeiter" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className={labelClass}>Name</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="login" className={labelClass}>Login</label>
            <input id="login" required value={login} onChange={(e) => setLogin(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>E-Mail</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Passwort</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="role" className={labelClass}>Rolle</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as EmployeeRole)}
              className={inputClass}
            >
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="department" className={labelClass}>Abteilung (optional)</label>
            <input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Wird angelegt…" : "Mitarbeiter anlegen"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
