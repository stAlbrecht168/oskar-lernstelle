# Projektanweisungen für Codex

## Ziel

Oskars Lernstelle ist eine deutschsprachige Lern-App für Klasse 5 eines niedersächsischen Gymnasiums. Oskar soll möglichst sofort mit kurzen, motivierenden Übungen starten können. PDFs, Fotos und weitere Schulmaterialien werden nach Fach geordnet und automatisch in quellenbasierte KI-Lerninhalte umgewandelt.

## Architektur

- `index.html`: Hauptoberfläche, Grunddaten und Spielstand
- `study-v04.js`: Fachlevels und Quizfragen
- `auto-material-v09.js`: Materialimport, OCR und automatische KI-Generierung
- `local-folder-v10.js`: lokaler, vom Nutzer erlaubter Ordnerzugriff
- `planner-v08.js`: Tagesmission, Klausurplan und Tracking
- `journeys-v05.js`, `journey-generator-v06.js`, `connections-v07.js`: Entdeckerreisen und fachübergreifende KI-Verbindungen
- `assessment-v08.js`: Klassenarbeiten und Lernschwerpunkte
- `worker/`: Cloudflare Worker, der OpenAI-API-Aufrufe geschützt verarbeitet
- `.github/workflows/`: Tests, statische Bereitstellung, optionale Worker-Bereitstellung

## Lokale Daten und Sicherheit

- `local-data/` im geklonten Repository ist **privat**, steht in `.gitignore` und ist kein Quellcode.
- Niemals Dateien aus `local-data/`, `Originaldateien/`, Dokumente mit Schulnoten, Klarnamen oder Schulunterlagen für Debugging, Tests, Commits, Pull Requests oder Prompts lesen oder hochladen, sofern der Nutzer dies nicht ausdrücklich für genau diese Daten beauftragt.
- Verwende für Tests ausschließlich synthetische Beispieldaten.
- Auch `.dev.vars`, `.env`, Token und API-Schlüssel sind privat. Keine Zugangsdaten in Repository, Logfiles oder Chat ausgeben.
- Die Dateiablage erfolgt über einen einmalig ausgewählten lokalen Ordner via File System Access API. Keine automatische Übertragung der lokalen Originaldateien nach GitHub.
- Für KI-generierte Aufgaben werden extrahierte Quellentexte an den privaten Cloudflare Worker und dessen Modellanbieter übermittelt. Darauf in Datenschutztexten korrekt hinweisen.
- Sicherung/Änderung vorhandener lokaler Daten darf nicht ohne explizite Nutzerfreigabe destruktiv erfolgen.

## UX-Konventionen

- Überschriften in normaler Groß- und Kleinschreibung, niemals All Caps.
- Keine Em-Dashes verwenden.
- Einfache Materialbibliothek als Dialog: Fach wählen, Datei hochladen, automatische Verarbeitung mit sichtbarem Status.
- Keine manuelle Freigabepflicht vor Oskars Lernstart; KI-Inhalte klar als KI-erzeugt kennzeichnen.
- Linke Spalte ist der Hauptlernablauf; rechte Spalte enthält lediglich ergänzende Hinweise.
- Tagesmission nur einmal zeigen, Fachfortschritt nur im Lernpfad; Header zeigt XP und Lernserie.
- Bereiche durch dezente Hintergrundfarben abgrenzen, ohne jede Zeile oder jeden Inhalt mit einer eigenen Karte zu umrahmen.
- Fachübergreifende Beziehungen nur bei echten Zusammenhängen, mit Schulquellenbelegen.
- Keine Behauptungen über Inhalte externer Videos, die nicht geprüft wurden.

## Qualitätsprüfung

Nach relevanten Änderungen ausführen:

```bash
node --check study-v04.js
node --check auto-material-v09.js
node --check local-folder-v10.js
node --check journeys-v05.js
node --check journey-generator-v06.js
node --check connections-v07.js
node --test tests/*.test.mjs
cd worker && npm test
```

Vor Commits Git-Diff prüfen, die Auswirkungen auf bereits vorhandenen Lernstand berücksichtigen und keine privaten Dateien hinzufügen. Git Push, Veröffentlichung oder Änderung externer Cloudflare-Dienste nur nach Nutzerfreigabe. Tests und nicht geprüfte Pfade im Ergebnis klar unterscheiden.
