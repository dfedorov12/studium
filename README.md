# 🎓 MBA Studium-Tracker

Persönliches Studien-Cockpit für den **MBA Informationssicherheit und IT-Risikomanagement – Professional** (Hochschule Burgenland / E-Learning Group / WBS Akademie).

**Live:** https://dfedorov12.github.io/studium/

## Funktionen

- **Module & ECTS:** alle Module aus der Modulbeschreibung 01/2025 mit Prüfungsformaten, Voraussetzungen (🔒-Hinweis) und Status/Note/Abschlussmonat
- **Themenbaum:** alle Lehrinhalte pro LV als abhakbare Themen (○ offen → ◐ gelernt → ● sitzt) mit Fortschrittsbalken je Modul
- **Notizen:** Markdown-Editor mit Vorschau pro Modul
- **Material:** Skripte/PDFs pro Modul ablegen & öffnen (Drag&Drop), gespeichert im lokalen Studienordner
- **Projekte:** Modulprojektarbeiten & Vertiefungsprojekt als Workflows (Idee → … → Bewertet) mit To-dos und Deadlines — Vertiefungsprojekt mit den Bewertungskriterien aus dem Handbuch vorbefüllt
- **Lernkarten:** eigener Fragenpool pro Modul mit Leitner-Spaced-Repetition (1/3/7/14/30 Tage), „heute fällig“-Widget, **MC-Quiz-Modus** (Falschantworten → Abfrage wie in der echten Prüfung) und **Import/Export** (JSON oder CSV `frage;antwort;falsch1;falsch2…` — z. B. KI-generierte Fragenpools einspielen)
- **Literatur:** Empfehlungen aus dem Handbuch pro Fachmodul vorbefüllt („gelesen“-Checkliste) + eigene Quellen
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
├── fortschritt.json     ← Autosave des kompletten Stands
├── BPM1/
│   ├── notizen.md       ← Markdown-Notizen (auch extern editierbar)
│   └── skript.pdf       ← Materialien (Drag&Drop in den Material-Tab)
└── FM2/ …
```

💡 Liegt der Ordner in OneDrive, synchronisiert alles automatisch auf andere Geräte.

Ohne verbundenen Ordner läuft alles im localStorage des Browsers (mit JSON-Backup/-Import als Sicherung). **Es wird nie etwas hochgeladen** — die Site ist rein statisch.

⚠️ WBS-Skripte sind urheberrechtlich geschützt: nur lokal ablegen, nie ins Repo committen.

## Studienplan

Der vollständige Ablaufplan (Semesterphasen, Abhängigkeitsgraph, Meilensteine, Literatur) liegt in [STUDIENPLAN.md](STUDIENPLAN.md).
