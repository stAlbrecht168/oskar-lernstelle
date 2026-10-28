# Second Brain für Oskars Lernstelle

**Stand:** 28. Oktober 2026  
**Status:** Zielbild und Anforderungen; mit diesem Dokument werden keine neuen App-Funktionen aktiviert.

## Ziel

Oskar ist zehn Jahre alt und besucht die fünfte Klasse eines niedersächsischen Gymnasiums. Seine Lernstelle soll hochgeladene Buchseiten, Arbeitsblätter und Mappenseiten in eine wachsende, nachvollziehbare Wissensbasis verwandeln. Daraus entstehen kurze Erklärungen, Wissenskarten, Übungen und bei passenden Quellen fachübergreifende Entdeckerreisen. Klassenarbeiten und der tatsächlich gelernte Stoff bestimmen die Lernschwerpunkte.

Der zentrale Gedanke ist: Neue Schulmaterialien ergänzen vorhandene Themen. Gespeichertes Wissen wird bei späteren Fragen und Aufgaben wiederverwendet und auf seine Quellen zurückgeführt.

## Einfacher Ablauf

1. Ein Foto, eine PDF oder eine Textdatei hochladen. Im bestehenden Ablauf ist zusätzlich das Fach auswählbar. Als Erweiterung soll die KI das Fach vorschlagen; nur bei Unsicherheit ist eine kurze Rückfrage nötig.
2. Die App liest den Inhalt ein, sichert die Quelle und lässt ChatGPT die Wissensbasis ergänzen. Titel, Themen und Verbindungen werden vorgeschlagen. Korrekturen liegen in einer aufklappbaren Ansicht.
3. Oskar kann mit den verfügbaren Aufgaben üben. Ein Arbeitsblatt mit gesonderten Lösungen lässt sich drucken.

Keine zusätzlichen Pflichtfelder für Schlagwörter, Kapitel, Lernziele oder Wiki-Verknüpfungen. Der normale Ablauf verlangt weder die Pflege von Ordnern noch das Kopieren von Prompts oder JSON. Für neue, aus Schulmaterial erzeugte Aufgaben ist ChatGPT über die vorhandene OpenAI-Anbindung vorgesehen. Ein Ausfall wird angezeigt; lokal erzeugte Ersatzaufgaben werden nicht als KI-Ergebnis ausgegeben. Bereits gespeicherte Aufgaben bleiben verwendbar.

## Quellen und Wissen getrennt erhalten

Die Trennung von Rohmaterial und aufbereitetem Wissen wird als Datenmodell übernommen. Sichtbare Ordner namens `raw` und `wiki` sind dafür nicht erforderlich.

| Bestandteil | Inhalt und Herkunft |
| --- | --- |
| Schulquelle | Originaldatei, soweit technisch gespeichert, ausgelesener Text und korrigierte Textfassung; Dateiname, Fach und stabile Quellen-ID |
| Themenseite | Ein überschaubares Konzept mit kindgerechter Erklärung, Begriffen, Beispielen und Verweisen auf konkrete Schulquellen |
| Verbindung | Zwei Themen, die Art des Zusammenhangs und Belege für beide Seiten; ein KI-Vorschlag bleibt erkennbar |
| Übung | Frage, Lösung, Erklärung, Themen- und Quellenverweise sowie Kennzeichnung der KI-Erzeugung |
| Lernstand | Tatsächliche Übungsversuche und bestätigte Fehler; getrennt von fachlichen Aussagen gespeichert |
| Zusatzressource | Erklärvideo oder Link mit Anbieter, Thema und Status, ob sein Inhalt tatsächlich ausgewertet wurde |

Jede fachliche Aussage auf einer Themenseite und jede materialbezogene Aufgabe benötigt einen nachvollziehbaren Quellenbezug. Wenn verfügbar, gehören Seite, Textstelle und ein überprüfbares Zitat dazu. Ein passendes Zitat allein beweist noch keine fachlich richtige Lösung.

Die dauerhafte Speicherung der Originaldateien muss gesondert umgesetzt und geprüft werden. Der gegenwärtig gespeicherte Text ist kein Ersatz für eine zugesicherte Sicherung der hochgeladenen Datei.

## Die Wissensbasis wächst mit neuen Seiten

- Neue oder geänderte Quellen anhand ihrer ID, Version und einer Prüfsumme erkennen. Nur betroffene Inhalte erneut auswerten; unveränderte Ergebnisse wiederverwenden.
- Vor der Verarbeitung passende vorhandene Themen heranziehen. So können neue Seiten ein Thema ergänzen, statt dass für jeden Upload ein isolierter Eintrag entsteht.
- Pro Thema eine beständige Seite führen. Ähnliche Begriffe können auf dieselbe Themenseite verweisen, ohne ihre unterschiedlichen Bedeutungen zu verlieren.
- Fachübergreifende Beziehungen nur anlegen, wenn die Unterlagen den Zusammenhang tragen. Beispielsweise könnten Physik zu Licht und Schatten und Kunst zu Schattierung verbunden werden, wenn entsprechende Schulquellen vorliegen.
- Bei widersprüchlichen Quellen beide Fundstellen erhalten und die Unklarheit benennen. Die KI darf eine abweichende Aussage nicht still überschreiben.
- Nach einer Quellenkorrektur betroffene Erklärungen, Beziehungen und Aufgaben als zu aktualisieren markieren. Nach dem Löschen einer Quelle dürfen verwaiste Aufgaben nicht unbemerkt weiter als belegt gelten.

Fragen an die Wissensbasis sollen Antworten in einfacher Sprache liefern und die benutzten Quellen zeigen. Fehlt die Grundlage, lautet das Ergebnis eine gezielte Rückfrage oder ein Hinweis auf fehlenden Stoff.

## Aus Wissen wird passendes Training

Die Aufgabenerstellung berücksichtigt das Schulmaterial, die fünfte Klasse, den nächsten hinterlegten Klausurtermin und tatsächliche Fehler aus früheren Übungen. Eine Note allein begründet keine fachliche Schwäche. Aus einem Buchtitel oder Buchcover wird kein vermeintlicher Buchinhalt abgeleitet.

Die App unterscheidet zwischen KI-erstellten und von einem Erwachsenen geprüften Inhalten. Eine einfache Upload-Strecke soll keine neuen Pflichtformulare erhalten. Vorhandene Freigaberegeln für Entdeckerreisen werden durch dieses Konzept nicht geändert. Unklare oder nicht belegbare Ergebnisse werden nicht als sicherer Klausurstoff dargestellt.

Erklärungen und Aufgaben sollen Oskar zuerst zum eigenen Versuch anregen. Lösung und Begründung sind anschließend erreichbar. Aufgaben bleiben im Browser auf Handy, Tablet und Laptop lösbar; Druckansichten enthalten keine Zugangsdaten und bieten Lösungen getrennt an.

## Erklärvideos als ergänzende Quellen

Lehrerschmidt und Daniel Jung sind die vorgesehenen Mathematik-Anbieter. Zunächst können passende Links vorgeschlagen werden. Ein Link oder Videotitel wird nicht als ausgewerteter Videoinhalt behandelt.

Erst ein tatsächlich verfügbares und eingelesenes Transkript beziehungsweise eine bereitgestellte Mitschrift kann als inhaltliche Quelle dienen. Dabei werden Video-URL, Anbieter und nach Möglichkeit Zeitstellen festgehalten. Aufgaben dürfen keine angeblichen Videoinhalte erfinden. Eine automatische Beschaffung von Transkripten ist eine eigene, noch zu prüfende Erweiterung.

## Regelmäßige Qualitätsprüfung

Die Anwendung soll bei Änderungen an Quellen die betroffenen Inhalte prüfen und zusätzlich eine verständliche Übersicht anbieten:

- Aussagen und Aufgaben ohne gültige Quellenstelle;
- doppelte Themen oder nicht mehr erreichbare Verweise;
- fehlende Themenseiten zu bereits verwendeten Begriffen;
- widersprüchliche Aussagen und veraltete Ableitungen;
- unklare Texterkennung, besonders bei Zahlen, Formeln und Diagrammen.

Eindeutige technische Verweise können automatisch repariert werden. Fachlich unklare Fälle benötigen eine kurze Erklärung und gegebenenfalls eine gezielte Rückfrage. Aus einer automatisch erstellten Verknüpfung wird keine ungeprüfte Tatsache.

## Bestehende Technik weiterverwenden

- **Browser-App:** GitHub Pages im Repository `stAlbrecht168/oskar-lernstelle`.
- **KI-Gateway:** der eingerichtete Cloudflare Worker `oskar-lernstelle-ai` unter `https://oskar-lernstelle-ai.sha-2d1.workers.dev`.
- **Bereitstellung:** vorhandener GitHub-Workflow und die eingerichteten Secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `OPENAI_API_KEY` und `OSKAR_ACCESS_TOKEN`. Secret-Werte gehören nicht in die Dokumentation oder in Browser-Dateien.
- **Speicherung:** persönliche Schulmaterialien und Lernstände im privaten Browser-Speicher. Eine Erweiterung um Wissensseiten muss diese in Sicherung und Wiederherstellung aufnehmen. Geräteübergreifende Synchronisierung ist eine separate Funktion.

Die Wissensbasis darf strukturierte Daten verwenden; ein späterer Markdown-Export ist möglich. Für Oskar und seine Eltern sind weder ein Terminal noch zusätzliche Programme zur Wiki-Pflege erforderlich.

## Abgrenzung zur eingereichten Anleitung

Übernommen werden das Sammeln von Quellen, dauerhaft gespeicherte Themenseiten, nachvollziehbare Beziehungen, gezielte Aktualisierungen und regelmäßige Qualitätsprüfungen. Die Umsetzung bleibt bei der gewünschten ChatGPT-Anbindung.

Die Anleitung ist eine Ideenquelle und wird nicht als Ganzes veröffentlicht. Ihre internen Organisationslinks, Kontaktdaten und Installationsanweisungen werden nicht in das öffentliche Projekt übernommen. Aussagen über automatische Qualitätssteigerungen ab bestimmten Seitenzahlen sind keine Zusagen für diese App. Ein Training oder Fine-Tuning des Modells ist für dieses Konzept nicht vorgesehen; gespeichert und aktualisiert wird die Wissensbasis der Anwendung.

## Vorhandene Ansätze und nächste Umsetzung

Die Projektbeschreibung dokumentiert bereits Materialimport, KI-Karten und Fragen mit Quellenzitaten, Vorschläge für Fachverbindungen, Lernplanung, Tracking und private Backups. Der Cloudflare-Deployment-Workflow wurde erfolgreich ausgeführt. Das ersetzt keinen Test einer echten KI-Auswertung oder aller aktuellen Erweiterungen.

Die folgenden Bausteine sind mit diesem Dokument als Entwicklungsziel aufgenommen:

1. Dauerhafte Themenseiten mit stabilen IDs und Quellenverweisen speichern und anzeigen.
2. Neue Seiten gezielt in bestehende Themen einarbeiten und Änderungen versionieren.
3. Fragen und Übungen aus diesen gespeicherten Themen mit den Originalquellen ableiten.
4. Quellenänderungen, Widersprüche und fehlende Belege erkennen; betroffene Inhalte aktualisieren.
5. Themenseiten, Beziehungen und gespeicherte Originale in das private Backup aufnehmen und die Wiederherstellung prüfen.

Eine graphische Darstellung der Beziehungen ist optional. Vorrang haben das zuverlässige Wiederfinden von Wissen, passende Übungen und eine einfache Bedienung.

## Woran die Umsetzung überprüft wird

- Zwei passende Uploads ergänzen dieselbe Themenseite; beide Quellen bleiben nachvollziehbar.
- Ein unveränderter Upload erzeugt keine unnötige zweite KI-Auswertung.
- Bei einer korrigierten Quelle werden betroffene Aufgaben aktualisiert oder bis zur Klärung gekennzeichnet.
- Eine Frage ohne passende Schulquelle erhält keine erfundene, angeblich belegte Antwort.
- Die normale Aufnahme erfordert keine manuelle Verschlagwortung.
- Ein privates Backup lässt sich einschließlich der neuen Wissensdaten wiederherstellen.

Diese Prüfungen sind Abnahmekriterien für die künftige Umsetzung und werden mit diesem Dokument noch nicht als bestanden gemeldet.
