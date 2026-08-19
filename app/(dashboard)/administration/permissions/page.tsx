import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { PermissionsCatalog } from "@/lib/types";

export default async function PermissionsPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let catalog: PermissionsCatalog | null = null;
  let errorState: "unreachable" | "error" | null = null;

  try {
    const res = await backendFetch("/permissions/catalog", { token });
    if (!res.ok) {
      errorState = "error";
    } else {
      catalog = await safeJson<PermissionsCatalog>(res);
    }
  } catch {
    errorState = "unreachable";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Rechte</h1>
        <p className="text-sm text-neutral-400">
          Standard-Berechtigungen je Rolle. OWNER hat immer alle Rechte. Individuelle Overrides werden pro
          Mitarbeiter in der Mitarbeiterverwaltung gesetzt.
        </p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "error" && (
        <StateMessage title="Rechte-Matrix konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && catalog && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-2 font-medium">Recht</th>
                {catalog.roles.map((role) => (
                  <th key={role} className="px-4 py-2 font-medium">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {catalog.allPermissions.map((permission) => (
                <tr key={permission}>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-700">{permission}</td>
                  {catalog.roles.map((role) => {
                    const granted = role === "OWNER" || (catalog!.roleDefaults[role] ?? []).includes(permission);
                    return (
                      <td key={role} className="px-4 py-2">
                        <Badge tone={granted ? "green" : "neutral"}>{granted ? "✓" : "–"}</Badge>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
