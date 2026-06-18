# 🃏 Lernkarten-Generator — Prompt-Vorlage

Mit dieser Vorlage machst du aus einem WBS-Skript in ~2 Minuten einen importierbaren Fragenpool:

1. Claude (Desktop-App oder claude.ai) öffnen, **Skript-PDF anhängen** (bleibt lokal/in deinem Account — nicht öffentlich teilen, Urheberrecht!)
2. Prompt unten einfügen, `<MODUL>` anpassen
3. Antwort als `lernkarten_<MODUL>.json` speichern
4. Im Tracker: Modul öffnen → Tab **Lernkarten** → **⬆ Import**

---

## Prompt (kopieren ab hier)

```
Du bist Prüfungscoach für den MBA „Informationssicherheit und IT-Risikomanagement“
(Hochschule Burgenland / WBS). Erstelle aus dem angehängten Skript Lernkarten für
das Modul <MODUL> zur Vorbereitung auf eine Multiple-Choice-Prüfung.

Regeln:
- 20–30 Karten, Deutsch, gesamtes Skript abdecken (alle Kapitel/Themenblöcke).
- Eine Karte = ein prüfbarer Fakt oder Zusammenhang. Verständnisfragen vor reinen
  Definitionsfragen, aber zentrale Definitionen und Normen-Nummern (ISO/BSI)
  unbedingt aufnehmen.
- "a" ist die richtige Antwort: kurz und präzise (max. 1–2 Sätze).
- "choices" sind exakt 3 falsche Antworten: plausibel, fachlich nah dran,
  gleiche Länge und gleicher Stil wie die richtige Antwort. Keine Scherzantworten,
  kein "Alle Antworten sind richtig", keine Verneinungs-Tricks.
- Zahlen/Normen in Falschantworten: realistische Verwechsler verwenden
  (z. B. ISO 27001 ↔ 27005 ↔ 31000, BSI 200-1 ↔ 200-3 ↔ 200-4).
- Keine Fragen, die nur mit Seitenzahlen/Abbildungsnummern beantwortbar sind.

Gib NUR rohes JSON aus (kein Markdown, keine Code-Fences, kein Begleittext),
exakt in diesem Format:

[
  {"q": "Frage?", "a": "Richtige Antwort", "choices": ["Falsch 1", "Falsch 2", "Falsch 3"]}
]
```

---

## Varianten

**Mehrfachauswahl** („Alle zutreffenden auswählen", mehrere richtige Antworten): statt `"a"` ein Array `"correct"` mit allen richtigen Antworten verwenden, `"choices"` bleibt die Liste der falschen. Format: `[{"q": "…", "correct": ["Richtig 1", "Richtig 2"], "choices": ["Falsch 1", "Falsch 2"]}]`. Im Lern-Modus erscheinen dann Auswahlfelder; nur die exakt richtige Auswahl gilt als bestanden. Tipp für den Prompt: „Etwa 30 % der Fragen als Mehrfachauswahl mit 2–3 richtigen Antworten gestalten."

**Klassische Karten ohne MC** (Frage → Antwort aufdecken): im Prompt `"choices"` weglassen lassen — Format dann `[{"q": "…", "a": "…"}]`.

**CSV statt JSON** (z. B. zum Nachbearbeiten in Excel): Format `frage;antwort;falsch1;falsch2;falsch3` — eine Karte pro Zeile, Semikolon-getrennt, keine Kopfzeile nötig. Der Import erkennt beides automatisch.

**Nachschärfen:** Nach dem ersten Durchlauf lohnt ein Folge-Prompt wie
„Erstelle 10 weitere Karten nur zu <Unterthema>, schwieriger, mit Transferfragen.“

## Tipp zur Menge

Lieber pro Skript-Kapitel einen Import mit 20–30 Karten als einen Riesen-Pool auf einmal — das Leitner-System (1/3/7/14/30 Tage) verteilt die Wiederholungen dann von selbst, ohne dass an einem Tag 100 Karten fällig werden.
