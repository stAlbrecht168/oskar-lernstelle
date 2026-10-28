# ADR 0002: Fachübergreifende Entdeckerreisen

Status: Prototyp implementiert, KI-basierte Journey-Erzeugung aus mehreren Quellen noch ausstehend

Datum: 28.10.2026

## Problem

Eine reine Fächerliste und isolierte Levels verschenken Lerntransfer. Oskar soll zum Beispiel Bruchrechnung in einer realen Biologie- oder Erdkundefrage anwenden und erklären können, was ein zweites Fach zum selben Problem beiträgt. Video-Essays wie die von Simplicissimus können Interesse wecken, sind aber nicht automatisch für eine fünfte Klasse geeignet oder deckungsgleich mit dem Unterrichtsstoff.

## Referenz

Der BBC-Prototyp Tunnels von Amplify verband kuratierte historische Medien in einer explorierbaren thematischen Zeitleiste. Die Lernstelle übernimmt das Prinzip *Thema entdecken, Stationen wählen, Medien erkunden, Wissen übertragen*. Es werden weder Design noch Archivmaterial kopiert.

Quelle: BBC Research and Education Space, Learning Technologies Awards, Seite 15; https://2016.semantics.cc/sites/2016.semantics.cc/files/files/Award%20Submission%20to%20ELDC%20FINAL.pdf

## Entscheidung

1. Die Schulfächer bleiben die zuverlässige Quelle für Prüfungslernen. Zusätzliche Entdeckerreisen sind ein klar gekennzeichneter Lernmodus.
2. Eine fachübergreifende Verbindung braucht **mindestens zwei reale Quellen aus unterschiedlichen Fächern**. Der Prototyp prüft ein gemeinsames Thema und fachspezifische Begriffe, zeigt beide Textstellen und kennzeichnet die Verbindung als Vorschlag.
3. Eine Übung zu diesem Thema darf erst starten, wenn pro beteiligtem Fach eine freigegebene, passende Frage vorliegt. Eine thematisch hübsch verpackte Mathefrage alleine zählt nicht als gelerntes Biologiewissen.
4. Beispielaufgaben sind stets als Beispiele markiert. Sobald Quellen zum Fach vorliegen, werden für die Entdeckerreise keine ungeprüften Demo-Aufgaben an ihrer Stelle verwendet.
5. Ein kuratiertes Simplicissimus-Video dient als Einstieg, nicht als automatisch verifizierter Beleg. Keine Videoinhalte aus Titel oder Beschreibung erfinden.
6. Keine automatischen Bewertungen freier Gedanken. Der Abschlusstext ist eine Reflexion, die Oskar mit einer erwachsenen Person besprechen kann.
7. Material, Reflexion und Fortschritt bleiben lokal im Browser und im persönlichen JSON-Backup. Keine Veröffentlichung in öffentlichen GitHub-Repositories.

## Erster Prototyp, Version 0.5

- Wasserreise mit 6 Stationen: Einstieg, Video, Mathe, Biologie, Erdkunde, Reflexion. Die drei Fachstationen sind frei anwählbar.
- Video: Simplicissimus, „Das üble Geschäft mit Wasser“, offizieller Link https://youtu.be/e-IlDMOaX8A. Der Film muss vorab auf Alter und Inhalt geprüft werden. Die Reise lässt sich ohne das Video fortsetzen.
- Für die Fachstationen haben freigegebene Fragen aus Oskars hochgeladenem Schulmaterial Vorrang. Ohne vorhandenen Schulstoff sind die Beispielaufgaben deutlich gekennzeichnet.
- Biologie als Fach ohne erfundenen Klassenarbeitstermin.
- Vorschläge für fachübergreifende Themen Wasser, Daten, Licht und Zeit aufgrund von Quellenhinweisen. Kein allgemeines semantisches Matching im Prototyp.
- Ein Fächer-Mix startet nur mit fachlich passenden, bereits freigegebenen Aufgaben.
- XP nur einmal bei tatsächlichem Abschluss, abschließende Reflexion bleibt gespeichert.

## Zielarchitektur

**Quellen → Konzepte → begründete Verbindungen → Lernstationen → nachgewiesene Kompetenzen**.

Spätere Entitäten:

- `Source`: Fach, Quelle, Kapitel oder Seitenangabe, Auszug, Rechte und Vertrauensstatus.
- `Concept`: normalisierter Begriff, Lernziel, Schwierigkeit, curriculare Einordnung.
- `Evidence`: wörtlicher, geprüfter Auszug aus einer konkreten Quelle.
- `Relation`: Konzept A, Konzept B, Beziehungstyp (`shared`, `prerequisite`, `application`, `contrast`), Belege und Sicherheit.
- `Task`: Frage, Erklärung, Beleg, Fach, Lernziel, freigegeben von, Version.
- `Journey`: Leitfrage, erzählerischer Einstieg, Stationen und Abzweigungen, Videolinks, Ziele und Abschlussreflexion.

## Geplanter KI-Workflow

1. Hochgeladene Quellen prüfen und nach Thema und Lernziel erschließen.
2. Aus mindestens zwei Fachquellen eine semantische Begründung der Verbindung erzeugen.
3. Für jeden Lernpfad verbindliche Ziele und unabhängige fachliche Belege festhalten.
4. Höchstens drei kurze Fachstationen plus Transferaufgabe vorschlagen. Unsicherheit sichtbar machen.
5. Altersangemessene Videos redaktionell auswählen. Keine automatisch kopierten Video-Transkripte und keine unbelegten Fragen zum Inhalt.
6. Entwurf mit Quellen, Fachzuordnung und Prüfungshinweisen zur Freigabe anzeigen.
7. Lernfortschritt getrennt speichern: Fachkompetenz, Transfer, Interesse und selbst formulierte Erklärung.

## Grenzen und offene Aufgaben

- Die vorhandenen Themenregeln liefern **Hinweise, keine nachgewiesene semantische Gleichheit**. Vor Freigabe durch einen Erwachsenen prüfen.
- KI-generierte Journeys aus hochgeladenen mehrteiligen Quellen, Videotranskripten oder Webseiten sind noch nicht implementiert.
- Eine Videovorschau, Altersbewertung, Transkript-Rechteprüfung und Video-Kapitelmarken sind noch nicht integriert.
- Das Video führt aus der App zu YouTube. Fortschritt misst nicht, ob es tatsächlich angeschaut wurde.
- Ein persistentes, geräteübergreifendes Benutzerkonto und zentrale geschützte Materialdaten fehlen.
- Der bestehende KI-Worker kann Fragen aus einem Schultext erzeugen, aber noch keine fachübergreifenden, automatisch entworfenen Journeys.