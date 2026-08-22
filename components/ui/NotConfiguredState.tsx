import Badge from "./Badge";
import Card from "./Card";

/**
 * Section 18 (AN2): "Nicht die lange technische Erklärung als Hauptinhalt
 * zeigen. Kompakter NotConfigured-State mit Setup-Anforderung." Ein Satz,
 * warum der Bereich nicht läuft, plus die Detail-Anforderungen hinter einem
 * Aufklapper statt einer immer sichtbaren Textwand.
 */
export default function NotConfiguredState({
  title,
  reason,
  requirements,
}: {
  title: string;
  reason: string;
  requirements: string[];
}) {
  return (
    <Card title={title} action={<Badge tone="red">Nicht eingerichtet</Badge>}>
      <p className="text-sm text-neutral-600">{reason}</p>
      <details className="mt-3">
        <summary className="cursor-pointer select-none text-xs font-medium text-phoenix-gold-dark hover:underline">
          Was fehlt, um das freizuschalten
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-neutral-500">
          {requirements.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
