# Oskars Lernstelle

## Direkte Links

- **Lern-App:** [Oskars Lernstelle öffnen](https://stalbrecht168.github.io/oskar-lernstelle/)
- **Second Brain:** [Materialbibliothek und Wissensbasis öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#second-brain)
- **Second-Brain-Konzept:** [Zielbild und Anforderungen](docs/second-brain-konzept.md)
- **Lernplan:** [14-Tage-Lernplan öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#lernplan)
- **Lerntracking:** [Lernübersicht öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#tracking)
- **KI-Dienst einrichten:** [Anleitung für den Cloudflare Worker](worker/README.md)

Das Second Brain ist derzeit kein separater Webdienst. Die Wissensbasis und die Materialverwaltung sind in die Lern-App integriert. Beide Webadressen funktionieren, sobald GitHub Pages für dieses Repository erfolgreich veröffentlicht wurde. Persönliche Schulmaterialien verbleiben im lokalen Browser und sind nicht im öffentlichen Repository gespeichert.

Lern-App für Oskar, 5. Klasse Gymnasium in Niedersachsen. Das Interface orientiert sich an motivierenden, kleinen Duolingo-Lektionen, die Inhalte stammen aus selbst hinzugefügten Schulmaterialien.

## Sofort lernen und offene Lernfläche

Die Lernstelle verlangt **keine manuelle Aufgabenfreigabe**, bevor Oskar beginnen kann. Neue, anhand des Schultexts belegte KI-Fragen und Wissenskarten werden nach dem Upload direkt in den Fachlevels verwendet und bleiben als KI-generiert erkennbar. Bereits vorhandene, anhand der Originalquelle validierbare KI-Entwürfe werden ebenfalls aktiviert. Manuelle Entwürfe ohne Beleg bleiben unangetastet. KI-generierte Inhalte können Fehler enthalten und dürfen bei Bedarf im erweiterten Materialdialog kontrolliert werden.

Sind für ein Fach noch keine KI-Fragen verfügbar, kann Oskar trotzdem sofort mit **deutlich gekennzeichnetem Beispieltraining** starten. Diese Fragen werden nicht als Inhalte aus seinem eigenen Heft dargestellt. Wenn passende KI-Aufgaben eintreffen, stellt der Lernpfad auf die schulstoffbasierten Levels um.

Der Entdeckerbereich zeigt nur die Entdeckerreise mit Video, Stationen und weiteren Reisen. Die frühere Zwischenüberschrift „Fächer verbinden“, die eigenständige Bridge-Liste und der nicht mehr passende BBC-Tunnels-Hinweis wurden entfernt. Die fachübergreifende KI-Verknüpfung bleibt als Hintergrundfunktion erhalten und kann das Vorbefüllen neuer Reisen unterstützen.

Die Oberfläche ist taskorientiert und offen gestaltet: **linke Hauptspalte** mit großzügigen Abständen, Lernpfad und illustrierten Entdeckungsstationen statt überall weißen Karten mit Umrandung. Die schmalere rechte Spalte zeigt zurückhaltend Termine, Fortschritt und ergänzende Videos. Modale Dialoge bleiben als klar abgegrenzte Flächen bestehen.

Automatische Prüfung: `node --test tests/ux-primary-mission.test.mjs tests/ux-frictionless-lessons.test.mjs`.

## Eine Tagesmission als zentraler Lernfokus

Die Startseite verwendet nur noch **eine zentrale Missionskarte**. Sie verbindet die nächste Klassenarbeit mit dem automatisch berechneten Tagesplan. Darin stehen das heutige Fach, die konkrete Lernphase, die geplante Dauer, der Status und die Information zur anstehenden Klassenarbeit. Der primäre Button **Tagesmission starten** führt immer durch den Tagesplan. **Lernplan & Tracking** bleibt als sekundäre Aktion in derselben Karte erreichbar.

Es gibt keine zweite Karte „Deine Tagesmission“ mehr. Die **linke Spalte** ist der Lernbereich mit Hauptmission, Lernpfad und Entdeckerreisen. Die schmalere **rechte Spalte** enthält nur ergänzende Informationen wie Klassenarbeitstermine, Fortschritt und Erklärvideos. Fehlertraining und Arbeitsblatt-Druck liegen als sekundäre Lernaktionen in der linken Spalte. Auf schmalen Bildschirmen stehen die Zusatzinformationen unter dem Lernbereich.

Regressionsprüfung: `node --test tests/ux-primary-mission.test.mjs`.

## Klausurbezogener Tagesplan und Lerntracking (Version 0.8)

Die Startseite zeigt **Deine Tagesmission** direkt unter der großen Lernmission. Der Lernplan öffnet sich als Dialog, damit die Oberfläche übersichtlich bleibt.

- **Täglich automatisch planen:** pro Tag eine kurze Hauptmission von ca. 10–15 Minuten, abhängig vom nächsten hinterlegten Klausurtermin. Bei mehreren anstehenden Arbeiten wird das nähere Datum priorisiert. Die App bietet Grundlagen, Anwenden, Fehlertraining und einen kurzen Wissenscheck am Vortag an. Der Plan wird beim Öffnen neu aus den aktuellen Terminen berechnet.
- **Termine bearbeiten:** im Dialog unter **Klausurtermine**. Die vorhandenen Beispieltermine sind vorbelegt und müssen anhand des echten Schulplans geprüft werden. Biologie hat derzeit noch kein Datum. Ein leeres Feld ist zulässig.
- **Erledigung zuverlässig erfassen:** Eine Einheit zählt erst, wenn das Quiz bis zum Ergebnis abgeschlossen wurde (nicht beim Öffnen oder Klicken auf eine Antwort). Im Bereich **Lerntracking** gibt es 14 Tage Rückblick, die Zahl tatsächlicher Lerntage, die aktuelle Serie, absolvierte Lerneinheiten und den Prozentsatz richtiger Antworten aus freigegebenem Schulstoff. Ältere Lerntage bleiben sichtbar, enthalten aber keine rückwirkend erfundenen Einzelwerte.
- **Echte Inhalte statt Platzhalter:** Sobald Material eines Faches hochgeladen ist, sollen die KI-Vorschläge fachlich geprüft und freigegeben werden. Gibt es dann noch keine freigegebenen Aufgaben, wird die Tagesmission bewusst nicht mit unpassenden Demoaufgaben gefüllt.
- **Datenschutz und Grenzen:** Tracking und Termine liegen im lokalen Browser. Auf einem anderen Gerät fehlt der Stand, solange er nicht mit einem privaten JSON-Backup übertragen wird. Es gibt keine automatische Elternbenachrichtigung, Synchronisierung, serverseitige Anwesenheitskontrolle oder Garantie, dass Oskar tatsächlich aufmerksam lernt. Kurzes gemeinsames Feedback nach dem Training bleibt sinnvoll.

**Beispiel ab 28. Oktober 2026**, auf Grundlage der bislang eingetragenen Termine: Musik (02.11.) hat zunächst Priorität, am 28./29.10. Aufgaben anwenden, am 30./31.10. die Sicherheit prüfen und Fehler wiederholen, am 01.11. einen kurzen Wissenscheck. Anschließend rückt Kunst (05.11.) stärker in den Fokus. Bei geänderten Terminen werden die Aufgaben neu verteilt. Für eine echte Klausurvorbereitung müssen die zu prüfenden Themen als Schulmaterial hinterlegt sein.

## Klassenarbeiten und Lernschwerpunkte

Im Materialdialog unter **Noten & Arbeiten** kannst du Noten, korrigierte Arbeiten (Foto, PDF oder Text), Lehrerhinweise und Übungsthemen erfassen. Das Material bleibt lokal gespeichert und wird beim privaten JSON-Backup mitgesichert.

Die optionale KI-Auswertung erfordert eine ausdrückliche Bestätigung. Entferne vor dem Senden Namen und persönliche Angaben. Vorschläge ohne belegte Fehler werden nicht übernommen; andere Vorschläge müssen geprüft und freigegeben werden. Eine Note allein begründet keine fachliche Schwäche.

Der persönliche Lernplan priorisiert bestätigte Fehler und kommende Klassenarbeiten. Der offizielle niedersächsische Lehrplan wird nicht geändert.

## Schulmaterial automatisch in Lernaufgaben umwandeln (Version 0.9)

Die Materialbibliothek ist ein kompakter Dialog. Im normalen Ablauf sind nur zwei Eingaben sichtbar:

1. **Schulfach auswählen.**
2. **PDF, Foto oder Textdatei hochladen.**

Anschließend wird die Datei ohne weiteren Speichern-Button lokal eingelesen und als Quelle gesichert. Die App zeigt die Schritte **Lesen, gespeichert, KI-Analyse, Übungen bereit** oder einen verständlichen Fehler an. Dateien, die in einer älteren Version nur ausgelesen, aber nicht gespeichert wurden, müssen erneut hochgeladen werden.

Für Bilddateien wird die Texterkennung im Browser ausgeführt. Wenn ein PDF ausschließlich aus Scans besteht, versucht die App eine Texterkennung der ersten fünf Seiten. Textbasierte PDFs werden bis zur 15. Seite gelesen. Pro Datei gilt eine Grenze von 12 MB.

Der vorhandene Cloudflare-KI-Worker generiert automatisch belegte Wissenskarten und Übungsfragen aus dem extrahierten Text. Die generierten Inhalte sind sofort in Oskars Fachlevels nutzbar, ohne zusätzliche manuelle Freigabe. Sie werden dabei ausdrücklich als **KI-erstellt** und nicht als von einer Person kontrolliert gekennzeichnet. Eine gelegentliche Stichprobenprüfung ist sinnvoll.

Die Worker-URL ist bereits voreingestellt: `https://oskar-lernstelle-ai.sha-2d1.workers.dev`. Für den Aufruf benötigt die App weiterhin den privaten Zugriffscode des bereits eingerichteten Workers. Er wird bei Bedarf unter **Weitere Einstellungen und Korrekturen** eingegeben und nur für die aktuelle Browser-Sitzung gespeichert. Ohne Zugriffscode bleibt die hochgeladene Quelle gespeichert und als **KI-Verbindung fehlt** sichtbar. Nach dem Verbinden werden auch zuvor gespeicherte Materialien ohne KI-Aufgaben automatisch verarbeitet.

Die Originaldateien werden nicht in GitHub abgelegt. Der ausgelesene Text, Lernstand und erzeugte Fragen liegen im lokalen Speicher des verwendeten Browsers. Bei einem Fehler meldet die App, ob die Datei übernommen wurde und lediglich die KI-Erzeugung fehlgeschlagen ist.

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

Entwurfsentscheidung: [ADR 0002](docs/adr/0002-fachuebergreifende-entdeckerreisen.md). Browser-Smoketest: `python tests/browser-journeys.py` mit installierten Paketen Playwright, BeautifulSoup und Chromium. Lernplan-Smoketest: `python tests/browser-planner.py` (gleiche Voraussetzungen).

Die Testdatei verwendet ausschließlich erfundene Beispieldaten. Private Schulunterlagen gehören nicht ins Repository.
## Visuelle Entdeckerreisen, Version 0.7

Die Wasserreise bietet jetzt große Bilder, bildhafte Stationen und zwei Video-Vorschauen: „Das üble Geschäft mit Wasser“ (Simplicissimus) und eine englische NASA-Animation zum Wasserkreislauf. Ein Video wird erst nach einem bewussten Klick auf „Video abspielen“ über YouTube eingebettet; der Video-Stopp kann weiterhin übersprungen werden. Das Simplicissimus-Video bitte vorher gemeinsam auf Altersangemessenheit prüfen.

Auch freigegebene KI-Reisen zeigen ein Titelbild und Stationsbilder, die automatisch aus einem kleinen, lizenzierten Bildkatalog passend zum Thema beziehungsweise Fach ausgewählt werden. Die Bilder illustrieren den Lernstoff, belegen aber keine inhaltlichen Aussagen. Quellen und Lizenzen sind direkt am Bild verlinkt. Die Bilder benötigen eine Internetverbindung; bei Verbindungsproblemen bleibt eine farbige Fallbackfläche bestehen.

**Technik:** `journey-media-v07.js` muss neben `index.html`, `journeys-v05.js` und `journey-generator-v06.js` veröffentlicht werden. Die GitHub-Pages-Action übernimmt das. Details: [ADR 0004](docs/adr/0004-visuelle-entdeckerreisen.md). Browser-Test: `python tests/browser-journeys.py`.
