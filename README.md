# Oskars Lernstelle

## Direkte Links

- **Lern-App:** [Oskars Lernstelle öffnen](https://stalbrecht168.github.io/oskar-lernstelle/)
- **Second Brain:** [Materialbibliothek und Wissensbasis öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#second-brain)
- **Lernplan:** [14-Tage-Lernplan öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#lernplan)
- **Lerntracking:** [Lernübersicht öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#tracking)
- **KI-Dienst einrichten:** [Anleitung für den Cloudflare Worker](worker/README.md)

Das Second Brain ist derzeit kein separater Webdienst. Die Wissensbasis und die Materialverwaltung sind in die Lern-App integriert. Beide Webadressen funktionieren, sobald GitHub Pages für dieses Repository erfolgreich veröffentlicht wurde. Persönliche Schulmaterialien verbleiben im lokalen Browser und sind nicht im öffentlichen Repository gespeichert.

Lern-App für Oskar, 5. Klasse Gymnasium in Niedersachsen. Das Interface orientiert sich an motivierenden, kleinen Duolingo-Lektionen, die Inhalte stammen aus selbst hinzugefügten Schulmaterialien.

## Klausurbezogener Tagesplan und Lerntracking (Version 0.8)

Die Startseite zeigt **Deine Tagesmission** direkt unter der großen Lernmission. Der Lernplan öffnet sich als Dialog, damit die Oberfläche übersichtlich bleibt.

- **Täglich automatisch planen:** pro Tag eine kurze Hauptmission von ca. 10–15 Minuten, abhängig vom nächsten hinterlegten Klausurtermin. Bei mehreren anstehenden Arbeiten wird das nähere Datum priorisiert. Die App bietet Grundlagen, Anwenden, Fehlertraining und einen kurzen Wissenscheck am Vortag an. Der Plan wird beim Öffnen neu aus den aktuellen Terminen berechnet.
- **Termine bearbeiten:** im Dialog unter **Klausurtermine**. Die vorhandenen Beispieltermine sind vorbelegt und müssen anhand des echten Schulplans geprüft werden. Biologie hat derzeit noch kein Datum. Ein leeres Feld ist zulässig.
- **Erledigung zuverlässig erfassen:** Eine Einheit zählt erst, wenn das Quiz bis zum Ergebnis abgeschlossen wurde (nicht beim Öffnen oder Klicken auf eine Antwort). Im Bereich **Lerntracking** gibt es 14 Tage Rückblick, die Zahl tatsächlicher Lerntage, die aktuelle Serie, absolvierte Lerneinheiten und den Prozentsatz richtiger Antworten aus freigegebenem Schulstoff. Ältere Lerntage bleiben sichtbar, enthalten aber keine rückwirkend erfundenen Einzelwerte.
- **Echte Inhalte statt Platzhalter:** Sobald Material eines Faches hochgeladen ist, sollen die KI-Vorschläge fachlich geprüft und freigegeben werden. Gibt es dann noch keine freigegebenen Aufgaben, wird die Tagesmission bewusst nicht mit unpassenden Demoaufgaben gefüllt.
- **Datenschutz und Grenzen:** Tracking und Termine liegen im lokalen Browser. Auf einem anderen Gerät fehlt der Stand, solange er nicht mit einem privaten JSON-Backup übertragen wird. Es gibt keine automatische Elternbenachrichtigung, Synchronisierung, serverseitige Anwesenheitskontrolle oder Garantie, dass Oskar tatsächlich aufmerksam lernt. Kurzes gemeinsames Feedback nach dem Training bleibt sinnvoll.

**Beispiel ab 28. Oktober 2026**, auf Grundlage der bislang eingetragenen Termine: Musik (02.11.) hat zunächst Priorität, am 28./29.10. Aufgaben anwenden, am 30./31.10. die Sicherheit prüfen und Fehler wiederholen, am 01.11. einen kurzen Wissenscheck. Anschließend rückt Kunst (05.11.) stärker in den Fokus. Bei geänderten Terminen werden die Aufgaben neu verteilt. Für eine echte Klausurvorbereitung müssen die zu prüfenden Themen als Schulmaterial hinterlegt sein.

## Materialbibliothek und Lernpfad

Die Materialbibliothek öffnet sich als Dialog über die Navigation auf Desktop und Smartphone. Der Lernpfad bleibt ohne zusätzliche Material-Verwaltungsflächen. Ein gesonderter Elternbereich existiert nicht mehr. Neue Quellen als Text, Markdown, textbasiertes PDF oder Bild (lokale Texterkennung) hinzufügen und auf erkannte Fehler kontrollieren. Aus Notizen lassen sich lokal Begriff-Erklärung-Karten vorschlagen.

Die optionale KI generiert aus längeren Schultexten Wissenskarten und bis zu neun verschiedene Quizfragen: Auswahl, Richtig oder falsch und Lücken mit Auswahloptionen. Alle Vorschläge enthalten einen Quellenbeleg. Die Vorschläge erscheinen zunächst als Entwürfe und müssen geprüft werden. Erst dann werden sie in den drei Levels des zugehörigen Faches eingesetzt. Wenn ein Fach Quellen, aber noch keine freigegebenen Fragen hat, werden seine Levels gesperrt und nicht mit unpassenden Demofragen gefüllt. Fächer ohne importierten Stoff haben weiter ausdrücklich gekennzeichnete Demofragen.

Die Daten werden lokal im Browser gespeichert. Backups als JSON enthalten Material, Lernfortschritt, Wissenskarten und KI-Fragen. Übertrage die Backups nicht in öffentliche Repositories. Die GitHub Page ist öffentlich, die persönlichen Schulmaterialien nicht.

## Automatische fachübergreifende KI-Verbindungen

Sobald mindestens zwei längere Quellen aus unterschiedlichen Fächern gespeichert sind und das private KI-Gateway verbunden ist, analysiert die App sie automatisch. Ein manueller Button zur Themensuche ist nicht nötig. Die Analyse startet nach einer kurzen Verzögerung, damit beim Hochladen mehrerer Dateien nicht für jede Datei sofort ein API-Aufruf erfolgt.

Die KI sucht nach **fachlichen Lerntransfers** statt nach vorgegebenen Stichwörtern. Jede vorgeschlagene Verbindung nennt einen gemeinsamen Gedanken, erklärt den konkreten Nutzen der Kombination und stellt eine offene Entdeckerfrage. Die Originalzitate aus mindestens zwei verschiedenen Schulquellen werden im Worker und im Browser auf Übereinstimmung geprüft. Die Ergebnisse bleiben als **KI-Vorschläge** gekennzeichnet und sollten fachlich geprüft werden. Es ist ausdrücklich möglich, dass keine Verbindung gefunden wird.

Für eine Analyse werden bis zu vier zuletzt relevante Quellen berücksichtigt, jeweils mit bis zu 3.500 Zeichen. Die KI-Vorschläge werden pro Quellenstand im Browser zwischengespeichert. Werden Materialien ergänzt, entfernt oder per Backup ausgetauscht, wird die Analyse aktualisiert. Der Zugriffscode für den KI-Dienst wird nicht dauerhaft gespeichert und muss nach einem Neuladen der Seite erneut eingegeben werden. Die Schultexte werden erst mit eingerichteter, authentifizierter KI-Verbindung an den Worker übermittelt. OpenAI-Nutzung kann Kosten verursachen.

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
- Seit Version 0.6 kann der Worker zusätzlich belegbasierte, fachübergreifende Reisen aus zwei bis vier Schulquellen vorschlagen. Ein Erwachsener prüft und gibt sie frei. Video-Inhalte werden nicht als Quellenbeleg für Aufgaben verwendet.

Entwurfsentscheidung: [ADR 0002](docs/adr/0002-fachuebergreifende-entdeckerreisen.md). Browser-Smoketest: `python tests/browser-journeys.py` mit installierten Paketen Playwright, BeautifulSoup und Chromium.

Die Testdatei verwendet ausschließlich erfundene Beispieldaten. Private Schulunterlagen gehören nicht ins Repository.
## Visuelle Entdeckerreisen, Version 0.7

Die Wasserreise bietet jetzt große Bilder, bildhafte Stationen und zwei Video-Vorschauen: „Das üble Geschäft mit Wasser“ (Simplicissimus) und eine englische NASA-Animation zum Wasserkreislauf. Ein Video wird erst nach einem bewussten Klick auf „Video abspielen“ über YouTube eingebettet; der Video-Stopp kann weiterhin übersprungen werden. Das Simplicissimus-Video bitte vorher gemeinsam auf Altersangemessenheit prüfen.

Auch freigegebene KI-Reisen zeigen ein Titelbild und Stationsbilder, die automatisch aus einem kleinen, lizenzierten Bildkatalog passend zum Thema beziehungsweise Fach ausgewählt werden. Die Bilder illustrieren den Lernstoff, belegen aber keine inhaltlichen Aussagen. Quellen und Lizenzen sind direkt am Bild verlinkt. Die Bilder benötigen eine Internetverbindung; bei Verbindungsproblemen bleibt eine farbige Fallbackfläche bestehen.

**Technik:** `journey-media-v07.js` muss neben `index.html`, `journeys-v05.js` und `journey-generator-v06.js` veröffentlicht werden. Die GitHub-Pages-Action übernimmt das. Details: [ADR 0004](docs/adr/0004-visuelle-entdeckerreisen.md). Browser-Test: `python tests/browser-journeys.py`.
