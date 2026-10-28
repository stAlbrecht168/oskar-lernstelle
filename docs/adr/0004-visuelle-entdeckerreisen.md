# ADR 0004: Visuelle Entdeckerreisen mit Bildern und Videos

**Status:** Implementiert als Prototyp (2026-10-28)

## Kontext

Die Wasserreise und die KI-generierten Entdeckerreisen waren textlastig. Ein Kind in Klasse 5 soll über große, erkennbare Bilder und freiwillig abspielbare Videos neugierig auf die einzelnen Stationen werden, ohne zusätzliche Bedienelemente in der Materialbibliothek.

## Entscheidung

- Das gemeinsame Modul `journey-media-v07.js` stellt große Szenenbilder, kleine Stationsbilder, Titelbilder für freigegebene KI-Reisen und Video-Vorschauen bereit. Auf Smartphones werden die Medien untereinander dargestellt.
- Ein fest kuratierter Bildsatz aus Wikimedia Commons wird verwendet. Die eingesetzten Motive sind **CC0** oder **NASA/Public Domain** und werden in jeder Szene mit einem Link zur Bildquelle gekennzeichnet. Es werden keine fremden Bilder in das Repository kopiert.
- Bei KI-Reisen wird das Motiv anhand der Leitfrage bzw. des Stationsfaches aus diesem Bildsatz gewählt (Wasser, Erde, Biologie, Diagramme, Licht oder neutrales Buch). Das sind **illustrative Fotos**, keine KI-erschlossenen Beweise oder Originalbilder aus dem Schulbuch.
- Auf der Wasserreise gibt es einen Simplicissimus-Videovorschlag und eine zusätzliche NASA-Animation zum Wasserkreislauf (englisch). Beide werden nur nach aktivem Klick als YouTube-Embed über `youtube-nocookie.com` geladen. Die originale externe YouTube-Verlinkung bleibt als Alternative erhalten. Eingebettete Videos werden beim Schließen aus dem DOM entfernt.
- Generierte Reisen übernehmen weiterhin nur ausdrücklich geprüfte/aktivierte Videos aus dem bestehenden Katalog. Es findet weder unkontrolliertes YouTube-Suchen noch Transkription/Scraping statt.
- Bilder sind `loading="lazy"`; falls ein externer Bildserver nicht erreichbar ist, bleibt die farbige Fallbackfläche erhalten. Texte, Fragen, Belege, Bewertung und XP ändern sich nicht.

## Datenschutz, Altersangemessenheit und Grenzen

- Der Download externer Fotos von Wikimedia Commons erzeugt eine Verbindung zu Wikimedia; die Fotos sind nicht vollständig offline verfügbar. Andere externe Bilder werden nicht automatisch heruntergeladen.
- Beim Anklicken von „Video abspielen“ kann YouTube personenbezogene Nutzungsdaten verarbeiten, auch mit der privacy-enhanced Domain. Der Klick soll diese Folge klar machen; dies ersetzt **keine rechtliche Einwilligungsprüfung**.
- Das Simplicissimus-Video richtet sich nicht gezielt an Zehnjährige. Der begleitende Erwachsene prüft es vor dem Abspielen. Die NASA-Animation ist auf Englisch. Beide Videos sind **nur Anreize zur Vertiefung** und dürfen keine Quellbelege der generierten Aufgaben ersetzen.
- Die Dateinamen, Urheberangaben und Lizenzen stammen aus den folgenden Commons-Seiten:
  - [Wassertropfen auf Blatt, CC0](https://commons.wikimedia.org/wiki/File:Water_droplets_on_leaf.jpg)
  - [Blue Marble, NASA](https://commons.wikimedia.org/wiki/File:Blue_Marble.jpg)
  - [Säulendiagramm, CC0](https://commons.wikimedia.org/wiki/File:Bar_chart.jpg)
  - [Sonnenlicht, CC0](https://commons.wikimedia.org/wiki/File:Sunlight_photography_image.jpg)
  - [Aufgeschlagenes Buch, CC0](https://commons.wikimedia.org/wiki/File:Open_book_(Unsplash).jpg)
  - [Wasserkreislauf, NASA](https://commons.wikimedia.org/wiki/File:The_Water_Cycle_(SVS30580).png)

## Verifikation

- Die GitHub-Pages-Action kopiert das Media-Modul und führt `node --check` für alle vier JavaScript-Dateien aus.
- `python tests/browser-journeys.py` prüft die Darstellung auf Desktop und Smartphone und das explizite Starten des Video-Embeds.
- `python tests/browser-generator.py` prüft weiterhin den generierten Reiseablauf; reale Medienaufrufe und tatsächliche Altersfreigabe sind nicht automatisiert verifiziert.
