# 🎓 MBA Studium-Tracker

Persönlicher Fortschritts-Tracker für den **MBA Informationssicherheit und IT-Risikomanagement – Professional** (Hochschule Burgenland / E-Learning Group / WBS Akademie).

**Live:** https://dfedorov12.github.io/studium/

## Funktionen

- Alle Module aus der Modulbeschreibung 01/2025 (Basisstudium, Fachmodule FM1–FM6, Vertiefungsprojekt, VM2, Masterarbeit) mit ECTS, Prüfungsformaten und Voraussetzungen
- Status je Modul (offen / laufend / bestanden), Note, Abschlussmonat, Notizen, LV-Checkboxen
- 🔒-Hinweis, solange Voraussetzungs-Module nicht bestanden sind
- ECTS-Fortschrittsbalken + ECTS-gewichteter Notenschnitt
- Wahlmodul-Auswahl (BWM1/BWM2)
- Meilenstein-Checkliste mit Zielterminen relativ zum Studienstart
- **Backup/Restore als JSON-Datei** — Stand exportieren und z. B. im Projektordner ablegen

## Datenschutz

Alle persönlichen Daten (Status, Noten, Notizen) liegen **ausschließlich im localStorage des Browsers** — nichts davon wird ins Repo oder an einen Server übertragen. Die Seite selbst enthält nur die öffentlich dokumentierte Modulstruktur.

Backups regelmäßig über den Button **„Backup (JSON)“** ziehen (Empfehlung: in den lokalen Projektordner legen). Wiederherstellen über **„Import“**.

## Studienplan

Der vollständige Ablaufplan (Semesterphasen, Abhängigkeitsgraph, Meilensteine, Literatur) liegt in [STUDIENPLAN.md](STUDIENPLAN.md).
