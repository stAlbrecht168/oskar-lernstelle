# Oskars Lernstelle

## Direkte Links

- **Lern-App:** [Oskars Lernstelle öffnen](https://stalbrecht168.github.io/oskar-lernstelle/)
- **Second Brain:** [Materialbibliothek und Wissensbasis öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#second-brain)
- **Second-Brain-Konzept:** [Zielbild und Anforderungen](docs/second-brain-konzept.md)
- **Lernplan:** [14-Tage-Lernplan öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#lernplan)
- **Lerntracking:** [Lernübersicht öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#tracking)
- **KI-Dienst einrichten:** [Anleitung für den Cloudflare Worker](worker/README.md)

Das Second Brain ist derzeit kein separater Webdienst. Die Wissensbasis und die Materialverwaltung sind in die Lern-App integriert. Beide Webadressen funktionieren, sobald GitHub Pages für dieses Repository erfolgreich veröffentlicht wurde. Schulmaterialien werden nach Auswahl des lokalen Repositories in dessen ignoriertem Ordner `local-data/` gespeichert und nicht im öffentlichen Git-Repository veröffentlicht.

Lern-App für Oskar, 5. Klasse Gymnasium in Niedersachsen. Das Interface orientiert sich an motivierenden, kleinen Duolingo-Lektionen, die Inhalte stammen aus selbst hinzugefügten Schulmaterialien.

## Weiterentwicklung in VS Code mit Codex

Du kannst die Lernstelle direkt im **lokal geklonten GitHub-Repository** weiterentwickeln. Installiere die [OpenAI Codex-Erweiterung für VS Code](https://marketplace.visualstudio.com/items?itemName=OpenAI.chatgpt), öffne den Projektordner in VS Code und melde dich in der Erweiterung mit deinem ChatGPT-Konto an. Codex berücksichtigt die Projektregeln aus [AGENTS.md](AGENTS.md).

```bash
cd /pfad/zu/oskar-lernstelle
git pull
code .
```

Codex kann den Quellcode bearbeiten und die Tests ausführen. Vor einem Push Änderungen und Testergebnisse prüfen. Beispiel:

```bash
node --test tests/*.test.mjs
cd worker && npm test
cd ..
git status
```

Die Lern-App kann lokal über den mitgelieferten Entwicklungsserver oder den VS-Code-Task **Lern-App lokal starten** ausprobiert werden (siehe **Start und Tests**). Der Server stellt ausschließlich die öffentlichen App-Dateien bereit. Der Cloudflare-KI-Worker erlaubt standardmäßig nur die veröffentlichte GitHub-Pages-Origin. Für lokale KI-Tests muss eine ausdrücklich autorisierte Entwicklungs-Origin eingerichtet werden. Ohne diese Einschränkung zu ändern, sollte der KI-Aufruf weiterhin in der veröffentlichten App getestet werden.

## Privater Datenordner im geklonten Projekt

Im Materialdialog wählst du einmal **Lokales Repository auswählen** und anschließend den Hauptordner deines geklonten `oskar-lernstelle`. Die App erstellt darin automatisch:

```text
oskar-lernstelle/
├── index.html
├── worker/
├── AGENTS.md
└── local-data/
    ├── materialien.json
    ├── lernkarten.json
    ├── aufgaben.json
    ├── lernstand.json
    ├── klassenarbeiten.json
    ├── entdeckerreisen.json
    ├── fachverbindungen.json
    └── Originaldateien/
        ├── music/
        ├── math/
        └── ...
```

**`local-data/` wird durch `.gitignore` vom Git-Commit ausgeschlossen.** Schulmaterial, Noten, Lernstand und Originaldateien bleiben auf deinem Computer. Die App benötigt in Chrome oder Edge deine Erlaubnis für den Ordnerzugriff. Die auf GitHub Pages veröffentlichte Web-App kann nicht selbständig auf beliebige Ordner zugreifen.

Beim erstmaligen Verbinden übernimmt die App bereits im selben Browser gespeicherte Materialien in den neuen Ordner. Sie entfernt die alten Browser-Daten erst nach erfolgreichem Schreiben. Nicht zuvor gespeicherte Uploads lassen sich nicht nachträglich übernehmen. Der Ordner ist kein automatischer Cloud-Sync. Für automatische **KI-Aufgabengenerierung** werden ausgelesene Texte weiterhin über den privaten Cloudflare-Worker an OpenAI gesendet.

## Fehlerfeste lokale Speicherung

Beim Verbinden werden zuerst alle acht Datengruppen vollständig gelesen und auf ihre Struktur geprüft: Materialien, Lernkarten, KI-Aufgaben, Lernstand und Termine, Klassenarbeiten, Entdeckerreisen, KI-Verbindungen und Wissensseiten. Erst nach erfolgreicher Prüfung und Speicherung wird der neue Ordner aktiv. Fehlende Dateien werden mit leeren Standardwerten ergänzt; Daten aus einem vorherigen Ordner werden dabei nicht in den neuen übernommen. Ungültiges JSON, unzulässige Datenstrukturen oder widersprüchliche IDs brechen die Übernahme ab, statt Einträge still zu entfernen. Unterschiedliche nichtleere Lernstände im Browser und im ersten Zielordner werden ebenfalls nicht automatisch überschrieben.

Zusammengehörige JSON-Dateien werden als ein Datensatz gespeichert. Vor dem ersten Schreibzugriff sichert die App das vorherige Dateiset in `local-data/.oskar-transaction.json`. Erst wenn alle Dateien erfolgreich geschrieben sind, wird dieses Journal entfernt. Scheitert ein Schreibvorgang, wird der vorherige Stand wiederhergestellt. Scheitert auch diese Wiederherstellung, bleibt das Journal erhalten und wird beim nächsten Verbinden zuerst verarbeitet. Eine beschädigte oder leere Journaldatei blockiert die Übernahme vorsichtshalber; sie sollte zusammen mit den vorhandenen Daten gesichert und anhand eines intakten privaten Backups geprüft werden, statt sie ungeprüft zu löschen.

Bei einem Speicherfehler bleiben die neuen Änderungen im Arbeitsspeicher. Im Materialdialog bietet der vorhandene Ordnerbutton dann **Erneut lokal speichern** an. Erst die Meldung **Alle Änderungen wurden lokal gespeichert** bestätigt den vollständigen Schreibvorgang. Bis dahin die Seite geöffnet lassen und bei Bedarf ein privates JSON-Backup herunterladen. Nicht bestätigte Änderungen können bei einem Browserabbruch verloren gehen; wiederhergestellt wird der letzte vollständig bestätigte Stand. Originaldateien werden erst entfernt, nachdem das Löschen der zugehörigen Quelle erfolgreich gespeichert wurde. Ein laufender Import oder eine offene Übung/Reise muss vor einem Ordnerwechsel beendet oder geschlossen werden. Verspätete KI-Antworten aus dem vorherigen Speicher werden nicht in den neuen übernommen.

JSON-Backups enthalten jetzt auch Klassenarbeiten und ihre Lernschwerpunkte. Die Wiederherstellung validiert den gesamten Inhalt vor der Übernahme und verwendet im Ordner denselben Schreibschutz; im Browser schützt ein temporäres Wiederherstellungsjournal den Austausch der Speicherschlüssel. Für größere eigene Exporte wurde die Importgrenze auf 64 MB erhöht. Bei älteren Backups ohne einzelne Datengruppen erklärt die Bestätigung, welche vorhandenen Gruppen erhalten bleiben. Ältere JSON-Backups enthalten keine Originaldateien; Version 3 enthält bis zu 40 MB Originaldateien und die Wissensseiten. Verwende für einen vollständigen Umzug das ZIP-Backup im Material-Tab (siehe unten).

**Grenzen:** Nur einen Tab pro Speicherordner verwenden und die Dateien nicht gleichzeitig in anderen Programmen bearbeiten. Für mehrere Tabs oder externe Schreibprozesse gibt es keine gemeinsame Sperre oder automatische Konfliktauflösung. Die Wiederherstellung setzt einen weiterhin lesbaren Datenträger und gültige Zugriffsrechte voraus. Sie schützt nicht vor einem vollständigen Datenträgerausfall und ersetzt keine separate private Sicherung. Die bisherigen Aufbewahrungsgrenzen des Lerntrackings bleiben bestehen.

Speicherregressionen mit vollständig synthetischem Dateisystem: `node --test tests/local-folder-runtime.test.mjs tests/storage-integrations.test.mjs`.

## Vollständiges privates ZIP-Backup

Im Material-Tab der Materialbibliothek stehen beim lokalen Speicherort **Vollständiges Backup herunterladen** und **Backup wiederherstellen** bereit. Auf dem bisherigen Rechner zuerst den Speicherordner verbinden und das ZIP herunterladen. Auf dem neuen Rechner Chrome oder Edge öffnen, einen leeren lokalen Zielordner verbinden, dann das ZIP auswählen und den geprüften Austausch der Lerndaten bestätigen. Das ZIP muss privat auf den anderen Rechner übertragen werden. Es enthält keine Zugangscodes oder KI-Konfiguration. Das bisherige JSON-Backup bleibt für ältere Sicherungen verfügbar.

Das vollständige ZIP enthält die sieben bisherigen JSON-Datengruppen, zusätzlich die Wissensseiten in `wissen.json` sowie sämtliche Dateien aus `local-data/Originaldateien/<fach>/`, einschließlich nicht mehr referenzierter Originale. Fehlende verknüpfte Originale oder unbekannte Unterordner brechen den Export ab. `manifest.json` verwendet das Format `oskar-full-backup`, Version `2`, und führt für jede Nutzdatei den relativen Pfad, ihre Bytezahl und eine SHA-256-Prüfsumme auf. Das ZIP wird ohne Kompression erstellt. Importiert werden ausschließlich diese streng geprüften ZIP-STORE-Archive, keine ZIP64-, verschlüsselten oder anderweitig komprimierten Archive. ZIP-Version 1 ohne Wissensseiten bleibt importierbar. Grenzen: 256 MiB für das Archiv, 64 MiB je Datei, 32 MiB je JSON-Datengruppe, 2000 ZIP-Einträge einschließlich Manifest, 1 MiB für das Manifest.

Der Import prüft zunächst das komplette ZIP einschließlich zentralem Verzeichnis, CRC32, Manifest, SHA-256, Dateimengen, Pfaden, allen Datengruppen und Originalverweisen. Pfadwechsel, absolute und Windows-Pfade, doppelte oder nur in der Großschreibung unterschiedliche Namen, Gerätezielnamen und unbekannte Nutzdateien werden abgewiesen. Erst anschließend wird die Austauschbestätigung angezeigt. Bei ungültigen Archiven findet kein Zugriff auf den Zielordner statt.

Originale werden unter neuen eindeutigen Dateinamen im jeweiligen Fachordner geschrieben; die Materialverweise werden entsprechend angepasst. Bereits vorhandene Originale bleiben erhalten. Das bestehende Journal sichert vor dem ersten Dateischreibzugriff sowohl die bisherigen acht Datengruppen als auch die Liste neu angelegter Originale. Fehler und ein Neustart vor dem vollständigen Commit stellen die bisherigen Metadaten wieder her und entfernen ausschließlich die neu angelegten Originale. Bei unvollständiger Wiederherstellung bleibt das Journal für den nächsten Verbindungsversuch erhalten. Während Export oder Übernahme wird ein Speicherwechsel blockiert; laufende Importe und Übungen müssen vorher abgeschlossen werden.

**Grenzen:** Backups sind unverschlüsselt. Prüfsummen erkennen Beschädigungen, belegen aber nicht die Vertrauenswürdigkeit eines Archivs. Nur eigene private Sicherungen importieren. Das Archiv wird im Arbeitsspeicher verarbeitet; bei großen Sicherungen wird entsprechend zusätzlicher RAM benötigt. Der Schutz vor gleichzeitigen Änderungen durch andere Tabs oder externe Programme bleibt auf die oben beschriebene Ein-Tab-Nutzung begrenzt. Erfolgreich bestätigte Wiederherstellungen ersetzen die acht Datengruppen; eine weitere Rückgängig-Funktion gibt es nicht. Vor einem Austausch bei Bedarf ein eigenes vollständiges Backup herunterladen.

Synthetische Node-Regressionen: `node --test tests/local-folder-runtime.test.mjs`. Chrome-Prüfung: `PLAYWRIGHT_MODULE=/absoluter/pfad/playwright-core/index.mjs node tests/browser-full-backup.mjs` (alternativ lokal verfügbares Paket `playwright`). Sie verwendet temporäre isolierte Chrome-Profile und native OPFS-Dateisysteme für Quellrechner, Zielrechner und Browserneustart. Externe Anfragen werden blockiert. Der native Betriebssystem-Ordnerdialog und echte Schuldateien sind kein Teil dieses automatisierten Tests.

## Lernpfad-Fortschritt statt doppelter Statistik

Die separate Karte **Dein Fortschritt** in der rechten Informationsspalte wurde entfernt. XP, Lerntage in Folge und die Zahl absolvierter Levels bleiben in der Kopfzeile sichtbar. Der **Fortschritt des aktuell gewählten Schulfachs** wird direkt unter der Fächerauswahl in **Dein Lernpfad** angezeigt: mit der Beschriftung „Lernpfad geschafft“, Prozentwert und Balken. Der Prozentwert basiert auf den drei Levels dieses Fachs und aktualisiert sich beim Fachwechsel oder nach Abschluss einer Lektion. Die rechte Spalte enthält nur noch Klassenarbeitstermine und Erklärvideos.

## Sofort lernen und offene Lernfläche

Die Lernstelle verlangt **keine manuelle Aufgabenfreigabe**, bevor Oskar beginnen kann. Neue, anhand des Schultexts belegte KI-Fragen und Wissenskarten werden nach dem Upload direkt in den Fachlevels verwendet und bleiben als KI-generiert erkennbar. Bereits vorhandene, anhand der Originalquelle validierbare KI-Entwürfe werden ebenfalls aktiviert. Manuelle Entwürfe ohne Beleg bleiben unangetastet. KI-generierte Inhalte können Fehler enthalten und dürfen bei Bedarf im erweiterten Materialdialog kontrolliert werden.

Sind für ein Fach noch keine KI-Fragen verfügbar, kann Oskar trotzdem sofort mit **deutlich gekennzeichnetem Beispieltraining** starten. Diese Fragen werden nicht als Inhalte aus seinem eigenen Heft dargestellt. Wenn passende KI-Aufgaben eintreffen, stellt der Lernpfad auf die schulstoffbasierten Levels um.

Der Entdeckerbereich zeigt nur die Entdeckerreise mit Video, Stationen und weiteren Reisen. Die frühere Zwischenüberschrift „Fächer verbinden“, die eigenständige Bridge-Liste und der nicht mehr passende BBC-Tunnels-Hinweis wurden entfernt. Die fachübergreifende KI-Verknüpfung bleibt als Hintergrundfunktion erhalten und kann das Vorbefüllen neuer Reisen unterstützen.

Die Bereiche sind über dezente Flächenfarben voneinander getrennt: **Dein Lernpfad** auf einer weißen Fläche, **Entdeckerreisen** auf einem hellblau-grünen Hintergrund und die ergänzenden Termine und Videos in ruhigeren Nebenbereichen. Der Fokus liegt links auf den Lernaktionen. Die Flächen brauchen keine starken Umrandungen. XP, Lernserie und abgeschlossene Level stehen ausschließlich im Header, der Fachfortschritt direkt im Lernpfad.

Automatische Prüfung: `node --test tests/ux-primary-mission.test.mjs tests/ux-frictionless-lessons.test.mjs`.

## Dauerhaftes Second Brain (Version 0.10)

Unter **Mein Wissen entdecken** im Lernbereich werden aus Schulmaterialien dauerhafte Themenseiten. Im Materialdialog kann zwischen **Material hinzufügen** und **Mein Wissen** gewechselt werden. Direkter Einstieg: [Mein Wissen öffnen](https://stalbrecht168.github.io/oskar-lernstelle/#wissen).

- **Themen ergänzen:** Der bestehende ChatGPT-Aufruf erzeugt neben Karten und Aufgaben kurze, belegte Themenbeiträge. Passende vorhandene Themen werden als Kontext mitgegeben. Jede Erklärung behält ihre eigene Schulquelle. Bereits vorhandene belegte KI-Karten werden ohne erneuten Modellaufruf übernommen.
- **Wiederverwenden:** Ein unveränderter Upload wird erkannt. Die App speichert Quellenstand und Themenbeiträge und vermeidet dadurch doppelte Auswertungen. Begriffsuche und Fachfilter helfen beim Wiederfinden.
- **Fragen und Üben:** ChatGPT beantwortet Fragen anhand von bis zu vier passenden Quellen. Ein Thema bietet eigene KI-Übungen und ein druckbares Arbeitsblatt mit getrennten Lösungen. Einmal erzeugte, noch aktuelle Themenübungen werden wiederverwendet.
- **Korrekturen beachten:** Gespeicherter Quelltext lässt sich direkt an der Themenseite berichtigen. Frühere Ableitungen werden bis zur Aktualisierung ausgeschlossen. Mögliche, von der KI gemeldete Widersprüche zeigen beide Textbelege und pausieren betroffene Übungen. Das ist keine Garantie, alle fachlichen Fehler zu erkennen.
- **Originale sichern:** Neue Originale bleiben im ausgewählten Repository unter `local-data/Originaldateien/<fach>/`. Wissensseiten liegen daneben in `local-data/wissen.json`. Nur das erlaubte Ordner-Handle wird in IndexedDB gemerkt, keine Schulunterlagen. Ein Speicherfehler wird angezeigt. Ältere Originaldateien müssen bei Bedarf erneut hochgeladen werden.
- **Privates Backup:** Format 3 enthält Wissensseiten, Originaldateien, Aufgaben, Fortschritt, Noten und Reisen. Die älteren Formate 1 und 2 bleiben importierbar. Die Wiederherstellung prüft Verweise und vorhandene Dateiprüfsummen und setzt einen verbundenen lokalen Ordner voraus. Bestehende Originale bleiben beim Import erhalten. Für JSON-Backups gilt eine Grenze von 40 MB an eingebetteten Originalen; größere Bestände durch Kopieren des privaten `local-data`-Ordners sichern. Daten und Originale werden nicht in das öffentliche Repository hochgeladen.

**Grenzen:** Pro Material werden weiterhin höchstens die ersten 18.000 Zeichen des erkannten Textes ausgewertet. Die Themenauswahl für Fragen ist eine begrenzte Suche und berücksichtigt bis zu vier Quellen, keine vollständige Abfrage aller Unterlagen. Die KI kann Zusammenhänge, Antworten und Widersprüche falsch einschätzen; Zitate werden technisch geprüft, die inhaltliche Richtigkeit nicht garantiert. Der direkte Zugriff auf den gewählten Ordner benötigt Chrome oder Edge auf einem Computer. Es gibt weiterhin keine automatische Gerätesynchronisierung oder serverseitige Wissensablage. Nutzerkonten, Kostenquoten und automatische Videotranskripte sind spätere Erweiterungen.

**Prüfung:** `cd worker && npm test` prüft auch Quellenversionen, Themenzusammenführung, fehlende Belege, Wissens-Backups und die neuen API-Endpunkte. Die bestehenden UX-Tests bleiben Teil des CI-Workflows. Der Cloudflare-Deployment-Workflow führt zusätzlich einen kurzen Live-Test mit ausschließlich erfundenem Schultext aus; Zugangsdaten werden nur aus den vorhandenen GitHub-Secrets verwendet.

## Eine Tagesmission als zentraler Lernfokus

Die Startseite verwendet nur noch **eine zentrale Missionskarte**. Sie verbindet die nächste Klassenarbeit mit dem automatisch berechneten Tagesplan. Darin stehen das heutige Fach, die konkrete Lernphase, die geplante Dauer, der Status und die Information zur anstehenden Klassenarbeit. Der primäre Button **Tagesmission starten** führt immer durch den Tagesplan. **Lernplan & Tracking** bleibt als sekundäre Aktion in derselben Karte erreichbar.

Es gibt keine zweite Karte „Deine Tagesmission“ mehr. Die **linke Spalte** ist der Lernbereich mit Hauptmission, Lernpfad und Entdeckerreisen. Die schmalere **rechte Spalte** enthält nur ergänzende Informationen wie Klassenarbeitstermine, Fortschritt und Erklärvideos. Fehlertraining und Arbeitsblatt-Druck liegen als sekundäre Lernaktionen in der linken Spalte. Auf schmalen Bildschirmen stehen die Zusatzinformationen unter dem Lernbereich.

Regressionsprüfung: `node --test tests/ux-primary-mission.test.mjs`.

## Klausurbezogener Tagesplan und Lerntracking (Version 0.8)

Die Startseite zeigt **Deine Tagesmission** direkt unter der großen Lernmission. Der Lernplan öffnet sich als Dialog, damit die Oberfläche übersichtlich bleibt.

- **Täglich automatisch planen:** pro Tag eine kurze Hauptmission von ca. 10–15 Minuten, abhängig vom nächsten hinterlegten Klausurtermin. Bei mehreren anstehenden Arbeiten wird das nähere Datum priorisiert. Die App bietet Grundlagen, Anwenden, Fehlertraining und einen kurzen Wissenscheck am Vortag an. Der Plan wird beim Öffnen neu aus den aktuellen Terminen berechnet.
- **Termine bearbeiten:** im Dialog unter **Klausurtermine**. Die vorhandenen Beispieltermine sind vorbelegt und müssen anhand des echten Schulplans geprüft werden. Biologie hat derzeit noch kein Datum. Ein leeres Feld ist zulässig.
- **Erledigung zuverlässig erfassen:** Eine Einheit zählt erst, wenn das Quiz bis zum Ergebnis abgeschlossen wurde (nicht beim Öffnen oder Klicken auf eine Antwort). Im Bereich **Lerntracking** gibt es 14 Tage Rückblick, die Zahl tatsächlicher Lerntage, die aktuelle Serie, absolvierte Lerneinheiten und den Prozentsatz richtiger Antworten aus freigegebenem Schulstoff. Ältere Lerntage bleiben sichtbar, enthalten aber keine rückwirkend erfundenen Einzelwerte.
- **Echte Inhalte statt Platzhalter:** Hochgeladene Materialien werden automatisch analysiert. Belegbare KI-Aufgaben werden ohne zusätzliche Freigabe spielbar. Falls die KI-Aufgaben noch fehlen, kann Oskar ersatzweise mit ausdrücklich gekennzeichneten Beispielaufgaben starten.
- **Datenschutz und Grenzen:** Tracking und Termine liegen nach dem Verbinden im privaten local-data-Ordner. Auf einem anderen Gerät fehlt der Stand, solange er nicht mit einem privaten JSON-Backup übertragen wird. Es gibt keine automatische Elternbenachrichtigung, Synchronisierung, serverseitige Anwesenheitskontrolle oder Garantie, dass Oskar tatsächlich aufmerksam lernt. Kurzes gemeinsames Feedback nach dem Training bleibt sinnvoll.

**Beispiel ab 28. Oktober 2026**, auf Grundlage der bislang eingetragenen Termine: Musik (02.11.) hat zunächst Priorität, am 28./29.10. Aufgaben anwenden, am 30./31.10. die Sicherheit prüfen und Fehler wiederholen, am 01.11. einen kurzen Wissenscheck. Anschließend rückt Kunst (05.11.) stärker in den Fokus. Bei geänderten Terminen werden die Aufgaben neu verteilt. Für eine echte Klausurvorbereitung müssen die zu prüfenden Themen als Schulmaterial hinterlegt sein.

## Klassenarbeiten und Lernschwerpunkte

Im Materialdialog unter **Noten & Arbeiten** kannst du Noten, korrigierte Arbeiten (Foto, PDF oder Text), Lehrerhinweise und Übungsthemen erfassen. Das Material bleibt lokal gespeichert und wird beim privaten JSON-Backup mitgesichert.

Die optionale KI-Auswertung erfordert eine ausdrückliche Bestätigung. Entferne vor dem Senden Namen und persönliche Angaben. Vorschläge ohne belegte Fehler werden nicht übernommen; andere Vorschläge müssen geprüft und freigegeben werden. Eine Note allein begründet keine fachliche Schwäche.

Der persönliche Lernplan priorisiert bestätigte Fehler und kommende Klassenarbeiten. Der offizielle niedersächsische Lehrplan wird nicht geändert.

## Musikmaterial wird erkannt, aber noch nicht zum Üben verwendet

Die Schulmaterialien liegen nach dem Verbinden im ausgewählten privaten local-data-Ordner. Eine vorhandene Musik-PDF kann bereits gespeichert sein, obwohl bisher keine KI-Übungsfragen daraus erzeugt wurden. Das kann passieren, wenn der private KI-Zugriffscode noch fehlt, der Worker die Analyse nicht abschließen konnte oder kein ausreichend lesbarer Quellentext erkannt wurde.

Der Lernpfad zeigt für das ausgewählte Fach jetzt einen kompakten Quellenstatus mit **Anzahl der gespeicherten Materialien und der tatsächlich spielbaren Aufgaben**. Falls KI-Aufgaben fehlen, erklärt er die Ursache und bietet „KI verbinden“ oder „Erneut versuchen“ an.

Bereits gespeicherte Quellen ohne spielbare Quizfragen werden beim nächsten erfolgreichen Verbinden des KI-Dienstes erneut analysiert, einschließlich zuvor fehlgeschlagener Analysen. Ein erneuter PDF-Upload ist dafür nicht nötig. Eine Datei, die in einer alten Version nur ausgewählt, aber nicht gespeichert wurde, lässt sich hingegen nicht wiederherstellen. Materialien sind weiterhin nicht automatisch zwischen verschiedenen Browsern oder Geräten synchronisiert.

## Schulmaterial automatisch in Lernaufgaben umwandeln (Version 0.9)

Die Materialbibliothek ist ein kompakter Dialog. Im normalen Ablauf sind nur zwei Eingaben sichtbar:

1. **Schulfach auswählen.**
2. **PDF, Foto oder Textdatei hochladen.**

Anschließend wird die Datei ohne weiteren Speichern-Button lokal eingelesen und als Quelle gesichert. Die App zeigt die Schritte **Lesen, gespeichert, KI-Analyse, Übungen bereit** oder einen verständlichen Fehler an. Dateien, die in einer älteren Version nur ausgelesen, aber nicht gespeichert wurden, müssen erneut hochgeladen werden.

Für Bilddateien wird die Texterkennung im Browser ausgeführt. Wenn ein PDF ausschließlich aus Scans besteht, versucht die App eine Texterkennung der ersten fünf Seiten. Textbasierte PDFs werden bis zur 15. Seite gelesen. Pro Datei gilt eine Grenze von 12 MB.

Der vorhandene Cloudflare-KI-Worker generiert automatisch belegte Wissenskarten und Übungsfragen aus dem extrahierten Text. Die generierten Inhalte sind sofort in Oskars Fachlevels nutzbar, ohne zusätzliche manuelle Freigabe. Sie werden dabei ausdrücklich als **KI-erstellt** und nicht als von einer Person kontrolliert gekennzeichnet. Eine gelegentliche Stichprobenprüfung ist sinnvoll.

Die Worker-URL ist bereits voreingestellt: `https://oskar-lernstelle-ai.sha-2d1.workers.dev`. Für den Aufruf benötigt die App weiterhin den privaten Zugriffscode des bereits eingerichteten Workers. Er wird bei Bedarf unter **Weitere Einstellungen und Korrekturen** eingegeben und nur für die aktuelle Browser-Sitzung gespeichert. Ohne Zugriffscode bleibt die hochgeladene Quelle gespeichert und als **KI-Verbindung fehlt** sichtbar. Nach dem Verbinden werden auch zuvor gespeicherte Materialien ohne KI-Aufgaben automatisch verarbeitet.

Die Originaldateien werden nicht in GitHub abgelegt. Der ausgelesene Text, Lernstand, Wissensseiten und erzeugte Fragen liegen im privaten local-data-Ordner. Bei einem Fehler meldet die App, ob die Datei übernommen wurde und lediglich die KI-Erzeugung fehlgeschlagen ist.

## Materialbibliothek und Lernpfad

Die Materialbibliothek öffnet sich als Dialog über die Navigation auf Desktop und Smartphone. Der Lernpfad bleibt ohne zusätzliche Material-Verwaltungsflächen. Ein gesonderter Elternbereich existiert nicht mehr. Neue Quellen als Text, Markdown, textbasiertes PDF oder Bild (lokale Texterkennung) hinzufügen und auf erkannte Fehler kontrollieren. Aus Notizen lassen sich lokal Begriff-Erklärung-Karten vorschlagen.

Die optionale KI generiert aus längeren Schultexten Wissenskarten und bis zu neun verschiedene Quizfragen: Auswahl, Richtig oder falsch und Lücken mit Auswahloptionen. Alle Vorschläge enthalten einen Quellenbeleg. Die Vorschläge erscheinen zunächst als Entwürfe und müssen geprüft werden. Erst dann werden sie in den drei Levels des zugehörigen Faches eingesetzt. Wenn ein Fach Quellen, aber noch keine freigegebenen Fragen hat, werden seine Levels gesperrt und nicht mit unpassenden Demofragen gefüllt. Fächer ohne importierten Stoff haben weiter ausdrücklich gekennzeichnete Demofragen.

Die Daten werden im ausgewählten lokalen local-data-Ordner gespeichert. Backups als JSON enthalten Material, Lernfortschritt, Wissenskarten und KI-Fragen. Übertrage die Backups nicht in öffentliche Repositories. Die GitHub Page ist öffentlich, die persönlichen Schulmaterialien nicht.

## Automatische fachübergreifende KI-Verbindungen

Sobald mindestens zwei längere Quellen aus unterschiedlichen Fächern gespeichert sind und das private KI-Gateway verbunden ist, analysiert die App sie automatisch. Ein manueller Button zur Themensuche ist nicht nötig. Die Analyse startet nach einer kurzen Verzögerung, damit beim Hochladen mehrerer Dateien nicht für jede Datei sofort ein API-Aufruf erfolgt.

Die KI sucht nach **fachlichen Lerntransfers** statt nach vorgegebenen Stichwörtern. Jede vorgeschlagene Verbindung nennt einen gemeinsamen Gedanken, erklärt den konkreten Nutzen der Kombination und stellt eine offene Entdeckerfrage. Die Originalzitate aus mindestens zwei verschiedenen Schulquellen werden im Worker und im Browser auf Übereinstimmung geprüft. Die Ergebnisse bleiben als **KI-Vorschläge** gekennzeichnet und sollten fachlich geprüft werden. Es ist ausdrücklich möglich, dass keine Verbindung gefunden wird.

Für eine Analyse werden bis zu vier zuletzt relevante Quellen berücksichtigt, jeweils mit bis zu 3.500 Zeichen. Die KI-Vorschläge werden pro Quellenstand im privaten local-data-Ordner gespeichert. Werden Materialien ergänzt, entfernt oder per Backup ausgetauscht, wird die Analyse aktualisiert. Der Zugriffscode für den KI-Dienst wird nicht dauerhaft gespeichert und muss nach einem Neuladen der Seite erneut eingegeben werden. Die Schultexte werden erst mit eingerichteter, authentifizierter KI-Verbindung an den Worker übermittelt. OpenAI-Nutzung kann Kosten verursachen.

## KI-Dienst

Der Cloudflare-Worker ist vorbereitet und kann über GitHub Actions deployed werden, sobald vier private Secrets eingerichtet sind. Anleitung: [worker/README.md](worker/README.md). Die OpenAI-Nutzung ist kostenpflichtig und erfordert einen eigenen API-Schlüssel. Die GitHub-Page kann keinen geheimen OpenAI-Schlüssel sicher im Frontend speichern.

## Start und Tests

Für lokale Entwicklung wird Node.js 22 oder neuer benötigt. Es müssen keine Pakete installiert werden:

```bash
node scripts/dev-server.mjs
```

Dann `http://127.0.0.1:8000` öffnen. Alternativ in VS Code **Terminal > Aufgabe ausführen > Lern-App lokal starten** wählen. Mit `Ctrl+C` wird der Server beendet. Ein anderer Port kann als Argument angegeben werden, zum Beispiel `node scripts/dev-server.mjs 8001`.

Der Server bindet ausschließlich an `127.0.0.1`. Er liefert nur `index.html` und die dreizehn ausdrücklich freigegebenen JavaScript-Dateien der App aus. Verzeichnislisten, Pfadwechsel, kodierte alternative Pfade und symbolische Links auf Dateien werden abgewiesen. `local-data/`, `Originaldateien/`, `.git/`, Umgebungsdateien, Secrets, Worker-Code, Tests und interne Dokumente sind über diesen Server nicht abrufbar. Neue öffentliche App-Dateien müssen ausdrücklich zur Freigabeliste in `scripts/dev-server.mjs` hinzugefügt werden. Für die Vorschau diesen Server verwenden, da allgemeine Repository-Server private Dateien mit ausliefern können.

Frontend- und Server-Tests: `node --test tests/*.test.mjs`. Die Server-Tests verwenden ausschließlich synthetische Dateien in temporären Ordnern. Für den Worker: `cd worker && npm test`.

## End-to-End-Prüfung des Lernablaufs

`tests/browser-learning-flow.mjs` erzeugt ausschließlich ein synthetisches Text-PDF zum Thema Liter und Milliliter (Klasse 5). Der Test lädt es über die sichtbare Materialverwaltung hoch, liest es mit der tatsächlich eingebundenen PDF.js-Version 3.11.174 und verwendet native Chrome-Dateisystemhandles in temporären OPFS-Profilen. Der Ordnerbutton wird über die Oberfläche bedient; nur der Betriebssystem-Ordnerdialog ist durch die Auswahl dieses synthetischen Testordners ersetzt.

Die Anfragen laufen durch den echten lokalen Worker-Code einschließlich Authentifizierung, Responses-API-Anfrageformat und Quellenvalidierung. Ausschließlich der OpenAI-Netzwerkaufruf liefert erfundene Testantworten. Die lokale Testumgebung verwendet frei erfundene Zugriffswerte, keine Secrets. PDF.js und sein Worker werden aus einem lokalen Paket über abgefangene Bibliotheksanfragen ausgeliefert; alle sonstigen externen Abrufe werden blockiert. Es werden keine Dateien aus dem privaten Repository-Ordner `local-data/` gelesen.

Für die Browserprüfung werden Chrome und die Testpakete `playwright-core` sowie `pdfjs-dist@3.11.174` benötigt. Sie können außerhalb des Repositorys installiert werden, beispielsweise:

```bash
npm install --prefix /tmp/oskar-e2e --ignore-scripts --package-lock=false playwright-core pdfjs-dist@3.11.174
PLAYWRIGHT_MODULE=/tmp/oskar-e2e/node_modules/playwright-core/index.mjs PDFJS_DIST=/tmp/oskar-e2e/node_modules/pdfjs-dist node tests/browser-learning-flow.mjs
```

Geprüft werden Desktop (1200 px) und Mobilansicht (390 px), tatsächliche PDF-Textextraktion, Fachauswahl, Originaldatei und Datenspeicherung, sechs automatisch freigeschaltete Quizfragen und drei Lernkarten einschließlich Quellenbelegen, alle Levels, Feedback, XP, Fachfortschritt, Neuladen sowie die Fehlerwiederholung für Quiz- und Lernkartenfragen. Derselbe Dateiinhalt beziehungsweise derselbe vollständig ausgelesene Text wird innerhalb eines Fachs nicht erneut importiert. Erneute KI-Erzeugung verwendet denselben validierten Pfad und behält bei unveränderten Fragen und Antworten die IDs, damit Fortschritt und Fehlerverweise erhalten bleiben. Eine parallele Analyse derselben Quelle wird verhindert. Wiederholte Levels vergeben die Wiederholungs-XP anstelle einer erneuten Erstabschluss-Belohnung.

Fehlerprüfungen umfassen beschädigte und zu große PDFs, Netzwerkfehler am Gateway und beim Modellanbieter, ungültiges JSON, falsche Antwortstrukturen, unbelegte Inhalte und einen erfolgreichen erneuten Versuch über den sichtbaren Button. V8-Funktionsabdeckung stellt sicher, dass die Kernfunktionen der Anwendung tatsächlich ausgeführt werden. `tests/learning-pipeline.test.mjs` und die Worker-Tests ergänzen isolierte Prüfungen für Quellenfilter, stabile IDs, parallele Erzeugung, Timeouts und fehlerhafte Modellantworten. Das ist keine vollständige Zweigabdeckung der gesamten Anwendung.

**Einmalige Einrichtung bleibt erforderlich:** Für passende KI-Übungen muss der lokale Ordner verbunden und ein gültiger privater KI-Zugriffscode eingerichtet sein. Der Test hinterlegt ausschließlich einen erfundenen Code für den vollständig abgefangenen Testdienst. Ohne Code bleibt das Material gespeichert und der Lernstart mit ausdrücklich gekennzeichneten Beispielaufgaben möglich; quellenbasierte KI-Aufgaben entstehen erst nach Einrichtung. Nach erfolgreicher Verarbeitung startet **Jetzt mit deinem Schulstoff üben** direkt die passende Lektion ohne technischen Dialog oder Freigabeschritt.

**Manuell zu prüfen:** Betriebssystem-Ordnerauswahl und Berechtigungsentzug, tatsächliche OCR gescannter PDFs/Fotos, externe Bibliotheksdownloads unter echten Netzwerkbedingungen, Bedienung auf physischen Mobilgeräten und die didaktische Qualität echter Modellantworten. Die Browserprüfung verwendet Text-PDFs; sie belegt keine OCR-Erkennungsqualität und keine vollständige Konformität mit dem niedersächsischen Lehrplan. Produktive Modellaufrufe sind für diesen Test weder nötig noch erlaubt.

## Animierte Geschichten-Intros

Die erste Station der Wasserreise und die Einstiege eigener Entdeckerreisen verwenden dekorative Three.js-Szenen: Wasser, Pflanzen, Erde, Licht, Daten oder ein Buch. Die Szene illustriert das Thema, sie ist kein Schulquellenbeleg. Der Text und **Spur aufnehmen** bleiben sofort verfügbar. Die Animation läuft höchstens sieben sichtbare Sekunden und lässt sich pausieren oder überspringen. Beim Wechsel der Station oder Schließen des Dialogs werden Animationsschleife, Geometrien, Materialien und WebGL-Kontext freigegeben. Im Hintergrund pausiert die Animation.

Three.js ist auf Version 0.180.0 festgelegt und wird ausschließlich beim Öffnen eines Intros bei verfügbarer WebGL2-Unterstützung von jsDelivr geladen. Dafür findet eine normale externe Bibliotheksanfrage statt, ohne Schultexte oder Zugangscodes. Bei reduzierter Bewegung, fehlendem WebGL oder einem fehlgeschlagenen Download bleibt ein statisches Titelbild sichtbar. Lernstand, Aufgaben und XP werden durch das Intro nicht verändert. Es sind keine Änderungen am Worker oder an den Deployment-Einstellungen nötig.

Browserprüfung mit installiertem Chrome und außerhalb des Repositorys installierten Paketen `playwright-core` und `three@0.180.0`:

```bash
PLAYWRIGHT_MODULE=/pfad/playwright-core/index.mjs THREE_DIST=/pfad/three node tests/browser-story-intros.mjs
```

Die Prüfung verwendet echte Three.js-Geometrien mit Chrome-Software-WebGL, lokale Bibliotheksfixtures und synthetische Reisen. Sie prüft Desktop und Mobilansicht, alle Motive, Pause/Fortsetzen, Überspringen, automatisches Ende, Freigabe beim Stationswechsel sowie statische Rückfälle bei reduzierter Bewegung, fehlendem WebGL und Downloadfehlern. Tatsächliche GPU-Treiber und physische Mobilgeräte bleiben manuell zu prüfen. Grundlage für das Rendering und die Freigabe: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer).

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
