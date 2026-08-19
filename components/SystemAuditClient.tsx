"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { SystemAuditReport } from "@/lib/types";

type LoadState = "idle" | "loading" | "loaded" | "unreachable" | "error";

export default function SystemAuditClient() {
  const [report, setReport] = useState<SystemAuditReport | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [copied, setCopied] = useState(false);

  async function runAudit() {
    setState("loading");
    setCopied(false);
    try {
      const res = await fetch("/api/system-audit");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setReport(data);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the text is still visible below to copy manually.
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          System Audit
          <InfoTooltip text="Ein Knopfdruck-Gesundheitscheck des ganzen Systems: prüft auf Probleme und zeigt sie als Liste an." />
        </h1>
        <p className="text-sm text-neutral-400">
          On-Demand-Bericht (wird auf Knopfdruck neu erstellt) aus echten Kennzahlen — kein automatisch geplanter,
          monatlicher Job.
        </p>
      </div>

      <Card>
        <Button onClick={runAudit} disabled={state === "loading"}>
          {state === "loading" ? "Wird erstellt…" : "Audit jetzt ausführen"}
        </Button>
      </Card>

      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Audit konnte nicht erstellt werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && report && (
        <>
          <Card
            title="Ergebnis"
            action={
              <div className="flex gap-1.5">
                <Badge tone={report.criticalCount > 0 ? "red" : "green"}>{report.criticalCount} Critical (schwerwiegend)</Badge>
                <Badge tone={report.warningCount > 0 ? "gold" : "green"}>{report.warningCount} Warnings (Hinweise)</Badge>
              </div>
            }
          >
            <p className="text-xs text-neutral-400">Erstellt: {report.generatedAt}</p>
            {Object.entries(report.sections).map(([section, lines]) => (
              <div key={section} className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{section}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-neutral-700">
                  {lines.map((line, i) => (
                    <li key={i}>• {line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>

          <Card title="Textbericht" action={<Button variant="secondary" onClick={copyReport}>{copied ? "Kopiert!" : "Bericht kopieren"}</Button>}>
            <pre className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700">
              {report.reportText}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}
