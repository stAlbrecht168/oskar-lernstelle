# ADR 0003: Belegbasierte, KI-generierte Entdeckerreisen

**Status:** Implementiert als lokaler Prototyp in Version 0.6 (2026-10-28)

## Kontext

Die vorhandene Wasserreise ist kuratiert und nicht auf alle Schulmaterialien übertragbar. Oskar soll neue, fachübergreifende Entdeckungsreisen aus hochgeladenen Unterrichtstexten erhalten, ohne ungesicherte Verknüpfungen als Schulstoff zu lernen. Interessante Videos sollen motivieren, aber nicht als unüberprüfte Sachbelege dienen.

## Entscheidung

- Die bestehende Materialbibliothek bleibt die einzige Quelle für den geprüften Unterrichtsstoff. Keine automatischen Schulbuch- oder Video-Scraper.
- Der zugangsgeschützte Cloudflare Worker nimmt `POST /journey` mit 2 bis 4 Unterrichtsquellen entgegen. Quelle: `id`, Fach, Titel und Text. Verfügbare Fächer sind die IDs aus der Lern-App.
- Das Modell liefert eine strukturierte JSON-Antwort mit Leitfrage, Einstieg, konkreter Verbindung zwischen den Fächern, 2 bis 4 Auswahlaufgaben und einer offenen Reflexion. Jeder Aufgabenteil verweist auf genau eine Quelle.
- Der Server kontrolliert Grenzen, unterschiedliche Fächer, doppelte Quellen, Frageformat und ob das Zitat wörtlich in der benannten Quelle steht. Der Client führt vor Freigabe eine weitere Prüfung durch. Es bleibt eine menschliche Pflichtprüfung der inhaltlichen Richtigkeit.
- Ein Generator-Vorschlag wird nur lokal als **Entwurf** gespeichert. Titel, Fragen, Antworten und Erklärungen sind editierbar; Quellenzitate bleiben schreibgeschützt. Einzige Veröffentlichung: explizite **Freigabe**.
- Das Kind sieht nur freigegebene Reisen. Quelltext und Belege werden nach einer richtigen Antwort eingeblendet. Sind Quellen gelöscht oder verändert, ist eine Reise nicht mehr startbar.
- Der Video-Katalog enthält zunächst genau ein verifiziertes Simplicissimus-Video, das sich thematisch mit Wasser beschäftigt. Die Auswahl ist ein optionaler Vorschlag, kein automatischer Beweis und kein ausgelesener Videoinhalt. Das Video wird nur mit separater Bestätigung an eine Reise gebunden.
- Offene Reflexionsantworten werden nicht maschinell bewertet. Ein abgeschlossener Durchlauf vergibt einmalig 15 XP. Fortschritt, Reisen und Schulmaterialien liegen im Browser und sind Teil des JSON-Backups.

## Datensicherheit und Grenzen

Der persönliche Zugangs-Token wird nicht persistent im Browser gespeichert. OpenAI-Secrets verbleiben im Worker. `store: false` wird für die Modell-API gesetzt. Der Server speichert keine Unterrichtstexte dauerhaft. Die Webseite wird öffentlich statisch bereitgestellt, die privaten Browser-Daten nicht. GitHub darf keine Schülerdaten oder originale Schulbuchseiten erhalten.

Aus Gründen der Kosten- und Missbrauchsbegrenzung gelten Obergrenzen von insgesamt 15.000 Quellzeichen und vier Quellen je Generierung. Ein gemeinsamer Familien-Token ist keine skalierbare Lösung; Rate Limiting und Nutzerkonten sind offen. Alle KI-Antworten benötigen menschliche Prüfung. Auch ein tatsächlich im Material vorkommendes Zitat garantiert keine korrekte Antwort.

## Verworfene Alternativen

- Rein KI-geschriebene Fachverbindungen ohne Belege: nicht nachvollziehbar.
- Automatisch erzeugte Videozusammenfassungen allein aus Titeln oder URLs: unzuverlässig.
- Automatische Veröffentlichung ohne Freigabe: ungeeignet für eine Lern-App für ein zehnjähriges Kind.
- Schulmaterial im GitHub-Repository speichern: Datenschutz- und Urheberrechtsrisiko.

## Verifikation

- `cd worker && npm test`: Vertrags-, CORS-, Zugriffs- und Quellenprüfungen.
- `python tests/browser-generator.py`: Desktop/Smartphone, simulierte KI-Antwort, Quellenvalidierung, Video-Opt-in, Freigabe, Durchlauf, XP einmalig, keine JS-Fehler.
- Kein echter LLM- oder Cloudflare-Live-Test ohne Nutzer-Secrets.