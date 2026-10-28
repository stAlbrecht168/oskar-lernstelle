# Oskars Lernstelle

Eine Duolingo-inspirierte, mobilfähige Lern-App für die 5. Klasse am niedersächsischen Gymnasium. Die Demo läuft als statische Website und kann über GitHub Pages veröffentlicht werden.

## In Betrieb (Version 0.2)

- Sieben Fächer, drei Lernlevel, XP, Fortschrittsanzeige und Wiederholung falsch beantworteter Aufgaben.
- Klassenarbeitstermine: Musik 02.11., Kunst 05.11., Geschichte 10.11., Physik 13.11., Erdkunde 24.11., Werte & Normen 25.11. und Mathe 11.12.2026.
- Elternbereich: TXT/Markdown, **textbasierte PDFs** und Fotos (PNG/JPG/WebP) importieren; erkannte Texte korrigieren und Quellen pro Fach lokal speichern.
- **Lokale Wissenskarten-Extraktion** aus überprüfbaren Definitionen, z. B. `Halbe Note = 2 Schläge` oder `Empathie: sich in andere hineinversetzen`. Die Extraktion arbeitet mit Regeln, **nicht** mit generativer KI.
- Karten einzeln bearbeiten, prüfen, freigeben oder löschen; nur freigegebene Karten gehen ins Quiz.
- Lernmissionen mit freigegebenem Schulstoff, Multiple Choice, sofortigem Quellenverweis und Druckansicht mit Lösungen. Für ein Multiple-Choice-Quiz sind mindestens **zwei unterschiedliche freigegebene Karten im selben Fach** nötig.
- Lokaler Browser-Speicher und manueller JSON-Export/-Import zur Datensicherung bzw. zum Wechsel zwischen Geräten.
- Links zu Lehrer Schmidt und Daniel Jung (keine automatisierte Videorecherche).

## Start

`index.html` im Browser öffnen oder einen statischen Server starten:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` aufrufen. Die App ist vollständig in `index.html` enthalten.

## Lernstoff hinzufügen

1. Elternbereich öffnen, Schulfach und einen aussagekräftigen Quellentitel eintragen.
2. Notizen einfügen oder eine Datei auswählen. Vor allem bei Fotos den erkannten Text kontrollieren.
3. `Quelle speichern` → in der Quellenliste `Karten gewinnen` anklicken.
4. Im Tab `Wissen prüfen` Begriff/Erklärung korrigieren und einzeln freigeben.
5. Zurück zum Lernpfad; Fach wählen → `Mein Schulstoff üben`. Über `Drucken` erhältst du ein Übungsblatt mit Antworten auf einer Extraseite.

**Wichtig:** Bei Fließtext ohne klare Definitionen erkennt der Regelgenerator nicht zuverlässig geeignete Karten. Dann eine Frage/Erklärung manuell hinzufügen. Die bisherigen Standardquizze sind **Demoaufgaben, nicht Oskars Unterrichtsstoff**.

## Dateiformate und Grenzen

| Format | Verarbeitung | Einschränkung |
|---|---|---|
| `.txt`, `.md` | Text im Browser | Maximal 30.000 Zeichen pro Notiz |
| `.pdf` | PDF.js extrahiert Text im Browser | Maximal 15 Seiten; PDFs mit nur eingescannten Bildern liefern keinen Text |
| `.jpg`, `.jpeg`, `.png`, `.webp` | Tesseract.js erkennt deutschen/englischen Text im Browser | Handschrift und Fotos können fehlerhaft erkannt werden; Nachprüfung nötig |

Für PDF- und Bildimport werden Open-Source-Bibliotheken und ggf. Sprachmodelle von externen CDNs geladen. Zum reinen Üben mit vorhandenen Daten sind diese Downloads nicht nötig. Für Dateiimport ist eine Internetverbindung beim ersten Laden der Bibliotheken erforderlich. Maximal 12 MB pro Datei.

## Datenschutz

Das GitHub-Repository und GitHub Pages sind **öffentlich**. Keine Originalunterlagen, Namen in Schulheften, Fotos von Personen, Zugangsdaten oder persönliche Backups einchecken. Quellen, Wissenskarten und Lernstände liegen im `localStorage` **nur des jeweiligen Browsers**. Der Elternbereich ist bislang nicht durch ein Passwort geschützt. Gerät und Browserzugriff schützen. JSON-Backups enthalten Schulstoff und Lerndaten und gehören nicht in ein öffentliches Repository.

Es existiert derzeit **kein bereitgestellter** KI-Dienst, keine Datenbank, keine Anmeldung und keine automatische Synchronisation. Der optionale KI-Worker ist nur als Quellcode vorbereitet. Auf mehreren Geräten gibt es bis zur Backend-Erweiterung getrennte Lernstände; Daten lassen sich manuell per Export/Import übertragen.

## Optionale generative KI (noch nicht aktiv)

Im Elternbereich gibt es zusätzlich `KI-Vorschläge`. Dafür liegt unter [`worker/`](worker/) ein separat zu betreibender **Cloudflare-Worker-Prototyp**. Der Worker sendet einen ausgewählten Quelltext an die OpenAI Responses API, verlangt einen privaten Zugangscode und filtert Karten ohne wörtliche Textbelege aus. **Alle Ergebnisse müssen vor dem Üben freigegeben werden.** Er ist bislang nicht deployt, nicht mit API-Zugangsdaten versehen und nicht auf Produktion abgesichert. Details und Sicherheitsgrenzen: [`worker/README.md`](worker/README.md).

Der lokale Regelgenerator bleibt auch ohne KI und API-Kosten nutzbar. KI-Aufrufe senden Schulstoff bewusst an externe Dienste, weshalb du die Materialien zuvor auf private Angaben prüfen solltest.

## GitHub Pages veröffentlichen

1. Repository `stAlbrecht168/oskar-lernstelle` öffnen.
2. `Settings` → `Pages` → bei `Build and deployment` die Quelle `GitHub Actions` auswählen.
3. Der Workflow `.github/workflows/deploy-pages.yml` veröffentlicht dann bei jedem Push auf `main`. Falls nötig ihn einmal über `Actions` manuell starten.
4. Nach erfolgreichem Deployment: `https://stalbrecht168.github.io/oskar-lernstelle/`.

Solange GitHub Pages nicht aktiviert und ein Deployment nicht erfolgreich ausgeführt wurde, ist die URL noch kein bestätigter Live-Link.

## Qualität und nächster Schritt

- Standardfragen und neu gewonnene Karten werden **nicht** als verifizierter Lehrplaninhalt ausgegeben.
- Die lokale Kartenerzeugung basiert nur auf klar zuordenbaren Textbelegen und erfordert Elternfreigabe.
- Für zuverlässige KI-gestützte Fragen aus komplexeren Schulbuchseiten ist ein **separater, geschützter Server** erforderlich. API-Schlüssel gehören nicht in GitHub Pages oder browserseitiges JavaScript.
- Als nächste Ausbauschritte sind vorgesehen: Quellen mit Seitenbezug, KI-basierte Aufgaben mit Qualitätskontrolle, echte Übungsformate jenseits von Multiple Choice, geschützter Elternzugang und sichere geräteübergreifende Synchronisation.