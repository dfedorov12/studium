# 🎓 MBA Studium-Tracker

Persönliches Studien-Cockpit für den **MBA Informationssicherheit und IT-Risikomanagement – Professional** (Hochschule Burgenland / E-Learning Group / WBS Akademie).

**Live:** https://dfedorov12.github.io/studium/

## Funktionen

- **Module & ECTS:** alle Module aus der Modulbeschreibung 01/2025 mit Prüfungsformaten, Voraussetzungen (🔒-Hinweis) und Status/Note/Abschlussmonat
- **Themenbaum:** alle Lehrinhalte pro LV als abhakbare Themen (○ offen → ◐ gelernt → ● sitzt) mit Fortschrittsbalken je Modul
- **Notizen:** Markdown-Editor mit Vorschau pro Modul
- **Material:** Skripte/PDFs pro Modul ablegen & öffnen (Drag&Drop), gespeichert im lokalen Studienordner
- **Projekte:** Modulprojektarbeiten & Vertiefungsprojekt als Workflows (Idee → … → Bewertet) mit To-dos und Deadlines — Vertiefungsprojekt mit den Bewertungskriterien aus dem Handbuch vorbefüllt
- **Lernkarten:** eigener Fragenpool pro Modul mit Leitner-Spaced-Repetition (1/3/7/14/30 Tage), „heute fällig“-Widget, **MC-Quiz-Modus** (Falschantworten → Abfrage wie in der echten Prüfung) und **Import/Export** (JSON oder CSV `frage;antwort;falsch1;falsch2…`, duplikatsicher) — fertige Prompt-Vorlage zum Generieren aus Skripten: [PROMPT.md](PROMPT.md). Bei verbundenem Studienordner direkt als `<MODUL>/lernkarten.json` sichern/laden.
- **Statistik:** Lern-Heatmap (26 Wochen, Themen/Karten/Projektschritte) + ECTS-Kurve gegen die Plan-Linie
- **Offizielle Termine:** echte Unterrichts- und Prüfungstermine des Fachstudiums (WBS-Ablaufplan, Start 29.09.2026) sind **standardmäßig eingetragen** (Start + alle 8 Fachprüfungen, fließt direkt in ICS-Export & Wochenplaner); eigene Termine bleiben beim Update erhalten, Button „📅 Offizielle Termine“ setzt sie bei Bedarf zurück
- **Vorlagen & Zitieren:** offizielle Word-Vorlage (.dotx) und APA-Zitierleitfaden als Download (Header „📎 Vorlagen“ und in jedem Projekt-Tab), dazu Formatvorgaben-Checkliste und APA7-Kurzreferenz
- **Gute wissenschaftliche Praxis:** Abgabe-Checkliste (Plagiatscheck, Vier-Augen-Prinzip, Interessenkonflikt-Deklaration, Rohdaten-Archivierung) — in den Projekt-Vorlagen vorbefüllt, per Button an jedes Projekt anhängbar, als Referenz im Vorlagen-Bereich
- **Literatur:** offizielle Literaturliste (Stand 23.09.2025 — eBooks der HBW-Bibliothek mit ISBN + Normen im WBS eCampus) global über „📚 Literatur“ und modulbezogen im Literatur-Tab (synchrones „gelesen/vorhanden“-Häkchen); dazu Handbuch-Empfehlungen pro Modul + eigene Quellen
- **Wochenplaner „Diese Woche“:** automatisch aus Meilensteinen, laufenden Modulen, fälligen Karten, Prüfungen, Abgaben und PeerGroup-Terminen (14-Tage-Blick)
- **PeerGroup-Bereich:** Kontakte, Gruppentermine (fließen in ICS + Wochenplaner) und Gruppenaufgaben — Gruppenarbeiten zählen 40 % jeder Fachmodul-Note
- **Meilensteine M1–M24** mit Zielterminen ab Studienstart + „Bin ich im Plan?“-Indikator
- **📅 ICS-Export:** Meilensteine, Prüfungstermine, Projekt-Deadlines und PeerGroup-Termine für Outlook
- **PWA:** installierbar, offline nutzbar · **Dark Mode**
- **Suche** über Module, Themen, Literatur und **Notizen-Volltext** (inkl. `notizen.md` aus dem Studienordner)

## Datenhaltung — lokaler Studienordner

Über **„📁 Ordner verbinden“** (File System Access API, Edge/Chrome) verbindet sich die Seite mit einem lokalen Ordner. Dann gilt:

```
studienordner/
├── fortschritt.json     ← Autosave des kompletten Stands (inkl. ALLER Lernkarten,
│                          Themen, Projekte, Literatur-Häkchen, PeerGroup …)
├── backups/             ← tägliche Sicherungspunkte (automatisch, letzte 10)
│   └── fortschritt-2026-06-12.json
├── BPM1/
│   ├── notizen.md       ← Markdown-Notizen (auch extern editierbar)
│   ├── lernkarten.json  ← Karten dieses Moduls (💾 → Ordner / 📂 Aus Ordner laden)
│   └── skript.pdf       ← Materialien (Drag&Drop in den Material-Tab)
└── FM2/ …
```

Der gesamte Stand liegt also im Studienordner — `fortschritt.json` ist die zentrale Datei (enthält auch alle Lernkarten). Pro Modul kommen optional `notizen.md`, `lernkarten.json` und Materialdateien dazu.

Schreibkonflikt-Schutz: Ändert ein anderes Gerät die Datei zwischenzeitlich (OneDrive-Sync), fragt die App nach, statt still zu überschreiben.

💡 Liegt der Ordner in OneDrive, synchronisiert alles automatisch auf andere Geräte.

Ohne verbundenen Ordner läuft alles im localStorage des Browsers (mit JSON-Backup/-Import als Sicherung). **Es wird nie etwas hochgeladen** — die Site ist rein statisch.

⚠️ WBS-Skripte sind urheberrechtlich geschützt: nur lokal ablegen, nie ins Repo committen.

## Studienplan

Der vollständige Ablaufplan (Semesterphasen, Abhängigkeitsgraph, Meilensteine, Literatur) liegt in [STUDIENPLAN.md](STUDIENPLAN.md).
