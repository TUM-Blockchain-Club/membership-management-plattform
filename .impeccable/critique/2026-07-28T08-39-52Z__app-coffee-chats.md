---
target: Coffee Chats dashboard integration
total_score: 17
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 4
timestamp: 2026-07-28T08-39-52Z
slug: app-coffee-chats
---
Method: dual-agent (A: /root/coffee_ux_review · B: /root/coffee_detector_review)

## Design Health Score

| # | Heuristik | Score | Kernproblem |
|---|---|---:|---|
| 1 | Sichtbarkeit des Systemstatus | 2 | Lokale Status-Badges existieren, aber der Wechsel in eine andere Shell zerstört die globale Orientierung. |
| 2 | Übereinstimmung mit der realen Welt | 3 | Runde, Match und Icebreaker sind verständlich; „My Profile“ und „Upload Selfie“ benennen ihre tatsächliche Bedeutung falsch. |
| 3 | Kontrolle und Freiheit | 1 | Der vorherige Dashboard-Kontext geht verloren; der einzige Rückweg führt fest nach `/profile`. |
| 4 | Konsistenz und Standards | 1 | Coffee Chats sieht wie ein Dashboard-Tab aus, verhält sich aber wie eine separate Website. |
| 5 | Fehlerprävention | 2 | Pending-Zustände sind abgesichert, aber Selfie-Upload verändert unerwartet den Meeting-Status. |
| 6 | Wiedererkennen statt Erinnern | 2 | Kein aktiver Sub-Tab; Nutzer müssen Ablauf und vorherigen Ort selbst rekonstruieren. |
| 7 | Flexibilität und Effizienz | 1 | Kein direkter, zustandsabhängiger Weg zur nächsten Aufgabe. |
| 8 | Ästhetik und Minimalismus | 2 | Saubere Komponenten, aber doppelte Navigation und gleichgewichtete Karten erzeugen unnötige Struktur. |
| 9 | Fehler erkennen und beheben | 2 | Toasts helfen lokal; manche Fehler zeigen rohe Backend-Texte und bieten keine Recovery Action. |
| 10 | Hilfe und Dokumentation | 1 | Der Monatsablauf, Sichtbarkeit der Daten und leere Zustände werden nicht ausreichend erklärt. |
| **Gesamt** |  | **17/40** | **Poor — fachlich brauchbar, aber Shell und Informationsarchitektur müssen grundlegend korrigiert werden.** |

## Design Specificity Verdict

**LLM assessment:** Das Feature hat spezifische, gute Inhalte — monatliches Matching, Coffee Spots, Icebreaker, Match-Reveal und Selfies. Die Einbindung ist aber template-artig: identische Übersichtskarten und eine kopierte App-Shell könnten genauso gut zu Billing oder Settings gehören. Der Code-Kommentar, der neue Header entspreche dem Dashboard-Header „exactly“, beschreibt das Problem: Die bestehende Shell wird kopiert statt wiederverwendet.

**Deterministic scan:** Der Impeccable-Detector meldet **0 Findings** in `app/coffee-chats`. Das ist kein Widerspruch zum Review: Der Detector erkennt lokale Code-Antipatterns, nicht den übergeordneten IA-Fehler „Website in Website“. Es gab keine False Positives.

**Visual overlays:** Browser-/Computer-Automation war in dieser Session nicht verfügbar. Deshalb existiert kein verlässliches Live-Overlay. Fallback waren Quellcode, bestehende Dashboard-Architektur und der erfolgreiche CLI-Scan.

## Overall Impression

Dein Eindruck ist korrekt: Coffee Chats ist aktuell keine Funktion des Dashboards, sondern eine zweite Mini-App mit ähnlichem Anstrich. Der größte Hebel ist nicht ein auffälligerer Back-Button, sondern das Entfernen der zweiten Shell und eine zustandsabhängige Startansicht mit genau einer nächsten Aktion.

## Was funktioniert

1. Die Domänensprache ist überwiegend menschlich und konkret: „Join Round“, Deadlines, Match, Icebreaker und „We Met!“ passen zum echten Ablauf.
2. Die Join-Round-Seite zeigt, wie es sein sollte: ein klarer Status, relevante Termine und eine dominante Aktion.
3. Der Match-Reveal enthält den eigentlichen Produktwert: Person, Interessen, Coffee Spot, Fun Fact und Gesprächsimpulse. Das ist der emotionale Höhepunkt und sollte die Hierarchie bestimmen.

## Priorisierte Probleme

### [P1] Coffee Chats tarnt sich als Dashboard-Tab, verlässt aber das Dashboard

**Warum:** Der Klick ersetzt Header, Navigation, Account-Aktionen und Footer. Der Nutzer verliert seinen erlernten Ort und muss einen versteckten Rückweg suchen.

**Fix:** Coffee Chats in `DashboardTab`, Routing und die bestehende `DashboardFrame` integrieren. Die eigene Coffee-Chat-Shell samt Header, Footer und festem Back-Link entfernen.

**Suggested command:** `$impeccable shape`

### [P1] Die Overview ist ein zweites Menü statt eines Monatsablaufs

**Warum:** Fünf Subnav-Ziele plus vier fast identische Karten ergeben zehn Entscheidungen. Profile, Signup und Match sind aber keine gleichwertigen Produkte, sondern aufeinanderfolgende Zustände.

**Fix:** Eine „Current Round“-Ansicht mit Runde, Fortschritt und genau einer primären Next Action. Preferences und Gallery bleiben sekundär; Admin erscheint nur berechtigten Nutzern.

**Suggested command:** `$impeccable distill`

### [P1] „Upload Selfie“ schließt gleichzeitig das Meeting ab

**Warum:** Der sichtbare Text verspricht einen Upload, die Mutation markiert das Paar zusätzlich als `met`. Das ist eine unerwartete, aktuell nicht rückgängig machbare Statusänderung.

**Fix:** Upload/Dateiauswahl und „Meeting als abgeschlossen markieren“ semantisch und technisch trennen. Abschluss explizit bestätigen und optional Selfie, Rating und Highlight gemeinsam absenden.

**Suggested command:** `$impeccable harden`

### [P1] Preferences-Setup ist überladen und widersprüchlich

**Warum:** Die Übersicht sagt „Required“, das Formular „all fields optional“. Gleichzeitig erscheinen 20 Interessen, die komplette „kenne ich bereits“-Liste und mehrere Textfelder vor einem Save-Button ganz unten.

**Fix:** Echte Mindestanforderung definieren, zuerst 3–5 Interessen abfragen, optionale Details progressiv aufklappen und „kenne ich bereits“ kompakt durchsuchbar machen. Save/Continue auf langen mobilen Screens erreichbar halten.

**Suggested command:** `$impeccable onboard`

### [P2] Sekundärnavigation zeigt weder Ort noch Rolle

**Warum:** Alle Items sehen gleich aus, es fehlt `aria-current`, die horizontale Mobile-Navigation kann Ziele verstecken und `/admin` ist trotz Berechtigung nicht auffindbar.

**Fix:** Sekundärnavigation auf `Current Round`, `Preferences`, `Gallery` reduzieren; aktiven Zustand programmatisch und visuell zeigen. Admin nur rollenbasiert ergänzen. „My Profile“ in „Matching preferences“ umbenennen.

**Suggested command:** `$impeccable clarify`

## Persona Red Flags

**First-Timer:** Klickt auf einen vermeintlichen Tab und landet in einer neuen Shell. Danach konkurrieren Subnav und Karten um die Frage „Was mache ich zuerst?“. „My Profile“ meint zusätzlich zwei verschiedene Profile.

**Accessibility User:** Kein `aria-current`, Interessen ohne `aria-pressed`, fünf gleich benannte Icon-Star-Buttons und Gallery-Metadaten nur auf Hover. Standort, Auswahlzustand und Inhalte sind für Screenreader/Tastatur unzureichend.

**Mobile User:** Zwei Zeilen Sticky Header plus versteckte horizontale Navigation verbrauchen Platz. Das Preferences-Formular ist lang, Touch Targets sind teilweise klein, Save ist nur unten und Gallery-Informationen hängen an Hover.

## Empfohlene Zielarchitektur

```text
Bestehender DashboardHeader (bleibt immer sichtbar)
└── Coffee Chats [aktiver globaler Dashboard-Tab]
    ├── Titel: Coffee Chats · August 2026
    ├── lokale Tabs: Current Round | Preferences | Gallery | Admin*
    └── Current Round
        ├── kompakter Fortschritt: Preferences → Joined → Matched → Met
        ├── genau eine Primary Action aus dem aktuellen Zustand
        ├── Status/Deadline als Kontext
        └── sekundärer Link zu History/Gallery

* Admin nur bei Berechtigung
```

Die Default-Ansicht entscheidet anhand der bereits vorhandenen Zustände:

1. Preferences fehlen → **Set matching preferences**
2. Runde offen, nicht angemeldet → **Join August round**
3. Angemeldet, Pairing ausstehend → Bestätigung plus Pairing-Datum, keine künstliche Aktion
4. Match vorhanden → Match-Person und Icebreaker werden Hauptinhalt
5. Treffen erfolgt → expliziter Abschluss, Recap/Selfie und nächster Rundentermin

## Minor Observations

- `profileIsSetup` wird nur aus vorhandenen Interessen abgeleitet; Completion sollte als klare fachliche Regel modelliert sein.
- Plain `<a>` aus dem Dashboard erzwingt einen vollständigen Dokumentwechsel und verstärkt den Bruch.
- Ein eigener Coffee-Chat-Footer verstärkt unnötig den Eindruck einer separaten Website.
- Lokale Loading-Platzhalter sollten das bestehende `Skeleton` verwenden.
- Backend-Fehler sollten in verständliche Meldungen mit konkreter Recovery Action übersetzt werden.

## Questions to Consider

1. Wenn Coffee Chats ein monatliches Ritual ist: Warum zeigt die erste Seite vier Produkte statt „Das ist dein nächster Schritt im August“?
2. Welche Daten braucht das Matching wirklich zwingend, bevor ein Mitglied teilnehmen kann?
3. Braucht ein integriertes Dashboard-Feature überhaupt jemals einen „Back to Dashboard“-Button?
