'use strict';
/* ── Stammdaten aus der Modulbeschreibung 01/2025 (MODULB_1.pdf) ── */

const PHASES = [
  {id:'basis', name:'Basisstudium — Online-Module (1. Semester)', desc:'Selbstorganisiertes Lernen, zeitlich flexibel. Jede LV muss einzeln positiv sein; Modulprojektarbeiten zählen 60 % der Modulnote.'},
  {id:'fach',  name:'Fachstudium — Live-Online-Module (ILV)', desc:'PeerGroups, Fixtermine. Prüfung je Modul: mündliche Abschlussprüfung 60 % + Gruppenarbeit inkl. Seminararbeit 40 %.'},
  {id:'praxis',name:'Vertiefungsprojekt (im eigenen Unternehmen)', desc:'Läuft parallel zum Fachstudium. Abschluss mit Bericht + Präsentation.'},
  {id:'abschluss',name:'Abschluss', desc:'VM2 (6-Wochen-Modul mit Vorkonzept) und danach die Masterarbeit.'}
];

/* topics: gruppiert nach LV/Themengebiet — Quelle: Lehrinhalte im Handbuch */
const MODULES = [
  {id:'BPM1', phase:'basis', name:'Academic Research Skills', ects:6, exam:'2× Multiple Choice (je 50 %)', deps:[],
   tip:'Grundlage für alle anderen Module — zuerst abschließen!',
   topics:[
     {g:'LV1 · Qualitative Forschungsmethodik (MC)', items:['Qualitative vs. quantitative Methodik','Literaturrecherche','Zitation','Methodenwahl & empirische Datenerhebung','Hypothesenbildung']},
     {g:'LV2 · Statistische Methoden (MC)', items:['Erhebung quantitativer Daten','Skalen und Skalenniveaus','Deskriptive Statistik','Induktive Statistik','Wahrscheinlichkeitstheorie und -verteilung']}
   ]},
  {id:'BPM2', phase:'basis', name:'Unternehmensführung, Strategien & Innovationen', ects:6, exam:'3× MC (40 %) + Projektarbeit (60 %)', deps:[], projektarbeit:true,
   topics:[
     {g:'LV1 · Unternehmensführung & Entrepreneurship (MC)', items:['Grundlagen der Unternehmensführung','Instrumente der Unternehmensführung','Strategie, Struktur und Kultur','Organisation','Controlling und Budgetierung']},
     {g:'LV2 · Strategisches Management (MC)', items:['Globales strategisches Management','Branchen-, Umfeld- & Wettbewerbsanalysen','Stakeholder-Analyse','Five Forces','SWOT-Analyse']},
     {g:'LV3 · Digitales Innovationsmanagement (MC)', items:['Digitale Technologien (IoT, Big Data, KI …)','Digitale Transformation','Innovationsstrategie mit neuen Technologien','Innovationskultur','Innovationskompetenz / Fail-Fast']}
   ]},
  {id:'BPM3', phase:'basis', name:'Kommunikation und Change', ects:6, exam:'2× MC (je 20 %) + Projektarbeit (60 %)', deps:[], projektarbeit:true,
   topics:[
     {g:'LV1 · Leadership & Kommunikation (MC)', items:['Führungskommunikation und -modelle','Frage- und Zuhörtechniken','Ich- und Du-Botschaften','Körpersprache','Verhandlungsführung']},
     {g:'LV2 · Kommunikation von Veränderungsprozessen (MC)', items:['Gründe & Ziele der Change-Kommunikation','Kommunikationsaspekte im 8-Stufen-Modell','Interne vs. externe Kommunikation','Management von Emotionen','Medien & Methoden, 5-Schritte-Planungsprozess']}
   ]},
  {id:'BPM4', phase:'basis', name:'Kompetenzen im Projektmanagement', ects:6, exam:'2× MC (je 20 %) + Projektarbeit (60 %)', deps:[], projektarbeit:true,
   topics:[
     {g:'LV1 · Projektdesign (MC)', items:['Projektwürdigkeitsanalyse','Projektskizze','Anforderungen & Ziele im PM','Leistungsumfang & Lieferobjekte','Projektorganisation','Balkenterminplan']},
     {g:'LV2 · Planung & Steuerung von Projekten (MC)', items:['Six Sigma, Kaizen, Lean Management','Projekt-Controlling','IT zur Projektunterstützung','Berichterstattung & Problemreport','Risikomanagement & Risikokennzahlen']}
   ]},
  {id:'BWM1', phase:'basis', name:'Digitalisierung von Geschäftsmodellen', ects:6, exam:'2× MC (je 20 %) + Projektarbeit (60 %)', deps:[], wahl:true, projektarbeit:true,
   tip:'Empfohlenes Wahlmodul — näher am IT-/Security-Profil.',
   topics:[
     {g:'LV1 · Entwicklung von Geschäftsmodellen (MC)', items:['Elemente von Geschäftsmodellen','Erfolgsfaktoren der Geschäftsmodellentwicklung','Typologie nachhaltiger Geschäftsmodelle','Business-Plan','Bewertung von Geschäftsmodellen','Pipeline- vs. Plattform-Modelle']},
     {g:'LV2 · Digitale Geschäftsmodelle (MC)', items:['Elemente digitaler Geschäftsmodelle','Vorgehensmodell für neue digitale Geschäftsmodelle','Erfolgsfaktoren digitaler Geschäftsmodelle','Reifegradmodelle der Digitalisierung','Trend- und Risikobewertung']}
   ]},
  {id:'BWM2', phase:'basis', name:'Interkulturalität & Digital Leadership', ects:6, exam:'2× MC (je 20 %) + Projektarbeit (60 %)', deps:[], wahl:true, projektarbeit:true,
   topics:[
     {g:'LV1 · Interkulturelles Management (MC)', items:['Kultur, Transkultur, Interkulturalität','Kultureinfluss auf Management & Führung','Internationale Teams & Teamprozesse','Interkulturelles Konfliktmanagement','Interkulturelle Personalarbeit (Training, Coaching)']},
     {g:'LV2 · Digital Leadership (MC)', items:['Digitalisierung & Führung','Elemente des Digital Leadership','Arbeitswelt 4.0 / New Work','Führung digitaler Teams','Digitaler Kulturwandel']}
   ]},

  {id:'VM1', phase:'fach', name:'Vorbereitungsmodul für die Fachmodule', ects:2, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 %', deps:['BPM1'],
   tip:'Hier passiert die PeerGroup-Einteilung (WBS LearnSpace 3D® / eCampus).',
   topics:[{g:'Inhalte', items:['Lernumgebung LearnSpace 3D® & eCampus','Ablauf und Struktur der Module','PeerGroup-Bildung & erste Gruppenarbeit','Werkzeuge & Methoden für Gruppenarbeiten']}],
   lit:['Theisen: Wissenschaftliches Arbeiten — Erfolgreich bei Bachelor- und Masterarbeiten','HS Burgenland Online-Bibliothek (Videos & FAQs)','Zitationssoftware: Citavi und Zotero']},
  {id:'FM1', phase:'fach', name:'Einführung Informationssicherheit & angewandte Kryptographie', ects:7, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 %', deps:['VM1'],
   topics:[{g:'Inhalte', items:['Einführung in die Informationssicherheit','Grundbegriffe und Abgrenzungen','Einordnung ins Informationsmanagement','Geschichtliche Entwicklung der InfoSec','Methoden & Algorithmen der Kryptographie','Anwendungsfälle angewandter Kryptographie']}],
   lit:['Heinrich/Riedl: Informationsmanagement — Grundlagen, Aufgaben, Methoden','Pohlmann: Cyber-Sicherheit','Sowa: Management der Informationssicherheit — Kontrolle und Optimierung','Buchmann: Einführung in die Kryptographie']},
  {id:'FM2', phase:'fach', name:'IT-Sicherheitsmanagement & Grundlagen IT-Forensik', ects:7, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 %', deps:['FM1'],
   tip:'ISO 27001, BSI 200-1, ISMS-Audit & Zertifizierung.',
   topics:[{g:'Inhalte', items:['IT-Sicherheitsmanagement & Standards (ISO 27001, BSI 200-1)','Bedrohungen und Schwachstellen','Managementkonzepte für Informationssicherheit','ISMS-Audit-Ablauf & Zertifizierung','Grundlagen der IT-Forensik','Schwachstellenanalysen: Planung & Durchführung']}],
   lit:['Heinrich/Riedl: Informationsmanagement','Krcmar: Informationsmanagement','Pohlmann: Cyber-Sicherheit','Geschonneck: Computer Forensik','Carvey: Windows Forensic Analysis']},
  {id:'FM3', phase:'fach', name:'IT-Desaster Recovery & Business Continuity Management', ects:7, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 %', deps:['FM1','FM2'],
   tip:'BSI 200-4, Notfallkonzept, Krisenmanagement.',
   topics:[{g:'Inhalte', items:['Normen & Standards zu BCM und DRP','Notfallmanagement-Prozess & Notfallkonzept','Notfallbewältigung & Krisenmanagement','Tests, Übungen & KVP des Notfallkonzepts','ISO-Normen vs. BSI-Standard 200-4']}],
   lit:['Brandes/Heller: Qualitätsmanagement in agilen IT-Projekten — quo vadis?','Tiemeyer (Hrsg.): Handbuch IT-Management','Pohlmann: Cyber-Sicherheit']},
  {id:'FM4', phase:'fach', name:'IT-Risikomanagement & Awareness', ects:7, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 %', deps:['FM1','FM2'],
   tip:'ISO 27005 / 31000, BSI 200-3, Cyber-Lagebilder.',
   topics:[{g:'Inhalte', items:['Risikomanagement-Prozess (ISO 27005, ISO 31000, BSI 200-3)','Identifikation von Risiken & IT-Risikoanalyse','Risikowahrnehmung','Entscheidung in Risikosituationen','Awareness & Bewusstseinsschaffung','Cyber-Lagebilder: Aufbau & Betrieb']}],
   lit:['Tiemeyer (Hrsg.): Handbuch IT-Management','Pohlmann: Cyber-Sicherheit','Knoll: Praxisorientiertes IT-Risikomanagement','ISO/IEC 27005:2023','ISO/IEC 31000:2018']},
  {id:'FM6', phase:'fach', name:'IT-Recht, -Governance & -Compliance', ects:7, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 %', deps:['FM2'],
   tip:'Flexibel einschiebbar — braucht nur FM2.',
   topics:[{g:'Inhalte', items:['IT-Governance-Referenzmodelle & Standards','IT-Governance vs. IT-Management vs. IT-Controlling','AGB & IT-Vertragsrecht','Recht des elektronischen Geschäftsverkehrs','Datenschutz (DSGVO)','Kosten/Nutzen von Standards']}],
   lit:['Beims/Ziegenbein: IT-Servicemanagement in der Praxis mit ITIL','Johannsen/Goeken: Referenzmodelle für IT-Governance','Krcmar: Informationsmanagement','Tiemeyer (Hrsg.): Handbuch IT-Management','Aktuelle Fachartikel zu IT-Governance, IT-Recht, IT-Compliance + Judikatur']},
  {id:'FM5', phase:'fach', name:'Technologie-Management für Sicherheits- & Risikomanagement', ects:7, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 %', deps:['FM1','FM2','FM3','FM4'],
   tip:'Als letztes Fachmodul einplanen (braucht FM1–FM4).',
   topics:[{g:'Inhalte', items:['Management von Technologien & IKT-Systemen','Technische Sicherheitsmaßnahmen','Lebenszyklus von IKT-Systemen & -Anwendungen','Anforderungsanalyse & Beschaffung','Asset- & Konfigurationsmanagement (CMDB)','Analyse von Cloud-Systemen','Berechtigungsmanagement']}],
   lit:['Hansen/Neumann: Wirtschaftsinformatik 1','Heinrich/Riedl: Informationsmanagement','Knoll: Praxisorientiertes IT-Risikomanagement','Stelzer: Technologische Kompetenz, Technologiemanagement und Technologievorausschau','Waidner/Backes/Müller-Quade: Development of Secure Software with Security by Design','Aktuelle Fachartikel zum IT-Sicherheits- und Risikomanagement']},

  {id:'VPS', phase:'praxis', name:'Vertiefungsprojektseminar', ects:3, exam:'immanenter Prüfungscharakter', deps:['BPM1'],
   tip:'Begleitendes Coaching während des gesamten Vertiefungsprojekts.',
   topics:[{g:'Inhalte', items:['Anforderungen & Ziele des Vertiefungsprojekts','Methodische Reflexion beruflicher Erfahrungen','Präsentation & Diskussion von Praxisprojekten','Analyse von Best Practices']}],
   lit:['Je nach Projekt: Literatur der Fachmodule','Theisen (2021): Wissenschaftliches Arbeiten']},
  {id:'VP', phase:'praxis', name:'Vertiefungsprojekt', ects:12, exam:'Bericht + Abschlusspräsentation', deps:['BPM1'],
   tip:'Thema im eigenen Unternehmen — z. B. Compliance-Richtlinien ausrollen, ISMS aufbauen, Risikoanalyse.'},

  {id:'VM2', phase:'abschluss', name:'Seminar zur Masterarbeit', ects:4, exam:'Gruppenarbeit 40 % + mündl. Prüfung 60 % + Vorkonzept', deps:['BPM1','VM1'],
   tip:'Fester 6-Wochen-Ablauf bis zur Vorkonzept-Abgabe.',
   topics:[{g:'Inhalte', items:['Quantitative & qualitative Forschungsmethoden','Wissenschaftlicher Schreibstil („Goldene Regeln“)','Themenfindung & Eingrenzung','Vorkonzept erstellen','Recherchedatenbanken, Citavi/Zotero']}],
   lit:['Döring/Bortz: Forschungsmethoden und Evaluation','Berekoven/Eckert/Ellenrieder: Marktforschung','Ebster/Stalzer: Wissenschaftliches Arbeiten für Wirtschafts- und Sozialwissenschaftler','Hienerth/Huber/Süßenbacher: Wissenschaftliches Arbeiten kompakt','Theisen: Wissenschaftliches Arbeiten','Karmasin/Ribing: Die Gestaltung wissenschaftlicher Arbeiten','Fachzeitschriften / Journals']},
  {id:'MA', phase:'abschluss', name:'Masterarbeit', ects:null, exam:'lt. Studien-/Prüfungsordnung', deps:['VM2'],
   tip:'ECTS werden automatisch als Rest auf 120 berechnet — bei Bedarf im Modul manuell überschreiben.'}
];
/* Gesamtumfang des Professional-MBA */
const PROGRAM_ECTS = 120;

const MILESTONES = [
  {m:'M1–2',  mm:2,  t:'BPM1 abgeschlossen (beide MC-Prüfungen)', mods:['BPM1']},
  {m:'M6',   mm:6,  t:'Basisstudium komplett (alle Modulprojektarbeiten abgegeben)', mods:['BPM2','BPM3','BPM4','BWM1','BWM2']},
  {m:'M7',   mm:7,  t:'VM1 absolviert, PeerGroup gebildet', mods:['VM1']},
  {m:'M8',   mm:8,  t:'Vertiefungsprojekt-Thema mit Arbeitgeber abgestimmt', mods:['VP']},
  {m:'M10',  mm:10, t:'FM1 bestanden', mods:['FM1']},
  {m:'M12',  mm:12, t:'FM2 bestanden, VPS gestartet', mods:['FM2','VPS']},
  {m:'M16',  mm:16, t:'FM3 + FM4 bestanden', mods:['FM3','FM4']},
  {m:'M18',  mm:18, t:'FM5 + FM6 bestanden — alle Fachmodule fertig', mods:['FM5','FM6']},
  {m:'M20',  mm:20, t:'Vertiefungsprojekt: Bericht + Präsentation abgegeben', mods:['VP']},
  {m:'M21',  mm:21, t:'VM2 inkl. Masterarbeits-Vorkonzept', mods:['VM2']},
  {m:'M24',  mm:24, t:'Masterarbeit eingereicht', mods:['MA']}
];
const PLAN_MONTHS = 24;

/* Vorbefüllte Projekte je Modul */
const DEFAULT_PROJECTS = {
  VP: {title:'Vertiefungsprojekt (Bericht + Präsentation)', todos:[
    'Thema mit Arbeitgeber & Betreuer:in abstimmen',
    'Analyse der Ausgangslage / Problemstellung beschreiben',
    'Konkrete Maßnahmen & Umsetzungsschritte entwickeln',
    'Praxisrelevanz der Ergebnisse herausarbeiten',
    'Theorie ↔ Praxis kritisch reflektieren',
    'Regelmäßige Abstimmung mit Betreuer:in dokumentieren',
    'Seminararbeit (Bericht) schreiben',
    'Abschlusspräsentation vorbereiten'
  ]},
  MA: {title:'Masterarbeit', todos:[
    'Thema finden & eingrenzen (Coaching in VM2 nutzen)',
    'Vorkonzept erstellen & abgeben',
    'Forschungsmethode festlegen (qualitativ/quantitativ)',
    'Literaturrecherche (Citavi/Zotero von Anfang an)',
    'Gliederung mit Betreuer:in abstimmen',
    'Rohfassung schreiben',
    'Überarbeitung & Lektorat',
    'Abgabe + Abschlussprüfung/Defensio'
  ]}
};
const STATI = [
  {k:'offen', label:'○ offen', cls:'s0'},
  {k:'laufend', label:'● laufend', cls:'s1'},
  {k:'bestanden', label:'✓ bestanden', cls:'s2'}
];
const PROJ_STATI = ['Idee','Recherche','Umsetzung','Review','Abgegeben','Bewertet'];
const TOPIC_STATI = [
  {label:'○', title:'offen', cls:'t0'},
  {label:'◐', title:'gelernt', cls:'t1'},
  {label:'●', title:'sitzt', cls:'t2'}
];
const MONTHS_DE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
/* Leitner-Intervalle in Tagen je Box (Index 0 ungenutzt) */
const LEITNER = [0, 1, 3, 7, 14, 30];
