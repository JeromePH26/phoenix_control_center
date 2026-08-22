import Badge from "./Badge";

/**
 * Section 21 (AN2): "Solange die App die Funktionen nicht ausliest, als
 * 'Vorbereitet / noch nicht in App aktiv' kennzeichnen." Ein sichtbares
 * Badge direkt neben der Überschrift statt nur eines Untertitels, der
 * leicht übersehen wird.
 */
export default function PreparedBadge() {
  return <Badge tone="neutral">Vorbereitet – noch nicht in App aktiv</Badge>;
}
