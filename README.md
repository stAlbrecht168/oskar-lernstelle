# Oskars Lernstelle

## Direkte Links

- **Lern-App:** [Oskars Lernstelle öffnen](https://stalbrecht168.github.io/oskar-lernstelle/)
- **Second Brain:** [Materialbibliothek und Wissensbasis öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#second-brain)
- **KI-Dienst einrichten:** [Anleitung für den Cloudflare Worker](worker/README.md)

Das Second Brain ist derzeit kein separater Webdienst. Die Wissensbasis und die Materialverwaltung sind in die Lern-App integriert. Beide Webadressen funktionieren, sobald GitHub Pages für dieses Repository erfolgreich veröffentlicht wurde. Persönliche Schulmaterialien verbleiben im lokalen Browser und sind nicht im öffentlichen Repository gespeichert.

Lern-App für Oskar, 5. Klasse Gymnasium in Niedersachsen. Das Interface orientiert sich an motivierenden, kleinen Duolingo-Lektionen, die Inhalte stammen aus selbst hinzugefügten Schulmaterialien.

## Materialbibliothek und Lernpfad

Die Materialbibliothek ist direkt am ausgewählten Fach auf der Startseite eingebaut. Ein gesonderter Elternbereich existiert nicht mehr. Neue Quellen als Text, Markdown, textbasiertes PDF oder Bild (lokale Texterkennung) hinzufügen und auf erkannte Fehler kontrollieren. Aus Notizen lassen sich lokal Begriff-Erklärung-Karten vorschlagen.

Die optionale KI generiert aus längeren Schultexten Wissenskarten und bis zu neun verschiedene Quizfragen: Auswahl, Richtig oder falsch und Lücken mit Auswahloptionen. Alle Vorschläge enthalten einen Quellenbeleg. Die Vorschläge erscheinen zunächst als Entwürfe und müssen geprüft werden. Erst dann werden sie in den drei Levels des zugehörigen Faches eingesetzt. Wenn ein Fach Quellen, aber noch keine freigegebenen Fragen hat, werden seine Levels gesperrt und nicht mit unpassenden Demofragen gefüllt. Fächer ohne importierten Stoff haben weiter ausdrücklich gekennzeichnete Demofragen.

Die Daten werden lokal im Browser gespeichert. Backups als JSON enthalten Material, Lernfortschritt, Wissenskarten und KI-Fragen. Übertrage die Backups nicht in öffentliche Repositories. Die GitHub Page ist öffentlich, die persönlichen Schulmaterialien nicht.

## KI-Dienst

Der Cloudflare-Worker ist vorbereitet und kann über GitHub Actions deployed werden, sobald vier private Secrets eingerichtet sind. Anleitung: [worker/README.md](worker/README.md). Die OpenAI-Nutzung ist kostenpflichtig und erfordert einen eigenen API-Schlüssel. Die GitHub-Page kann keinen geheimen OpenAI-Schlüssel sicher im Frontend speichern.

## Start und Tests

Für lokale Entwicklung:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen. Für den Worker: `cd worker && npm test`.

## Nächste Arbeiten

- Benutzerverwaltung und Synchronisierung über Geräte hinweg
- Kostenkontrolle und Rate Limiting im Backend
- automatische Auswahl von Lernvideos passend zum Material
- bessere Unterstützung gescannter PDFs und Diagramme in Aufgaben

## Fachübergreifende Entdeckerreisen, Version 0.5

- Eine erste kuratierte Geschichte zu Wasser führt über sechs Stationen und verwendet ein offiziell verlinktes Simplicissimus-Video als optionalen Einstieg. Die beispielhaften Fachfragen sind als Beispiel markiert, sobald echte Quellen vorhanden sind, haben passende freigegebene Fragen Vorrang.
- Mathe, Biologie und Erdkunde können in beliebiger Reihenfolge erkundet werden. Biologie wird ohne frei erfundenen Klausurtermin als Fach angeboten.
- Die Materialbibliothek zeigt mögliche Verbindungen über gemeinsame Themen und fachspezifische Stichwörter. Für jede Verbindung müssen Quellen aus mindestens zwei Fächern vorhanden sein. Die Textbelege werden angezeigt und sollen inhaltlich geprüft werden.
- Ein gemeinsamer Übungsmix startet erst, wenn zwei passende, freigegebene Fragen vorhanden sind. Keine unbelegten Behauptungen über Lerntransfer.
- Fortschritt und freie Abschlussreflexion werden lokal gespeichert und ab jetzt zusammen mit anderen Lernständen exportiert.
- Die Erzeugung vollständig neuer Journeys durch KI ist noch eine geplante Erweiterung. Der vorhandene Worker erstellt KI-Karten und Quizfragen aus jeweils einem Fachtext, nicht aus einem Video.

Entwurfsentscheidung: [ADR 0002](docs/adr/0002-fachuebergreifende-entdeckerreisen.md). Browser-Smoketest: `python tests/browser-journeys.py` mit installierten Paketen Playwright, BeautifulSoup und Chromium.

Die Testdatei verwendet ausschließlich erfundene Beispieldaten. Private Schulunterlagen gehören nicht ins Repository.