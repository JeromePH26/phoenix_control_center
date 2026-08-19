import Card from "@/components/ui/Card";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";

export default async function DataQualityPage() {
  let coverage: Record<string, unknown> | null = null;
  let errorState: "unreachable" | "error" | null = null;

  try {
    const res = await legacyBackendFetch("/football/data-coverage");
    if (!res.ok) {
      errorState = "error";
    } else {
      coverage = await safeJson<Record<string, unknown>>(res);
    }
  } catch {
    errorState = "unreachable";
  }

  const sections = coverage ? Object.entries(coverage) : [];
  const hasNestedSections = sections.some(
    ([, v]) => v !== null && typeof v === "object" && !Array.isArray(v)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Datenqualität</h1>
        <p className="text-sm text-neutral-400">Abdeckungs- und Whitelist-Report des Football-Datenbestands.</p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
        />
      )}
      {errorState === "error" && (
        <StateMessage
          title="Datenqualität konnte nicht geladen werden"
          description="Ein unerwarteter Fehler ist aufgetreten."
        />
      )}

      {!errorState &&
        (coverage && hasNestedSections ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map(([key, value]) => (
              <Card key={key} title={key}>
                {value !== null && typeof value === "object" && !Array.isArray(value) ? (
                  <KeyValueList data={value as Record<string, unknown>} />
                ) : (
                  <p className="text-sm text-neutral-900">{JSON.stringify(value)}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card title="Datenabdeckung">
            <KeyValueList data={coverage} />
          </Card>
        ))}
    </div>
  );
}
