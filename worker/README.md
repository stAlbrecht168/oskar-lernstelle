# Optionaler KI-Dienst (Cloudflare Worker)

Die öffentliche GitHub Page **enthält keinen** API-Schlüssel. Dieses Gateway kann nach eigener Einrichtung über die OpenAI Responses API bis zu zehn Vorschläge aus einem Quelltext generieren, mit **wörtlichen Quellenbelegen**. Vorschläge bleiben Entwürfe, bis sie im Elternbereich geprüft werden.

## Bereitstellung (optional)

1. Bei Cloudflare anmelden und Wrangler installieren bzw. mit `npx wrangler` starten.
2. Im Verzeichnis `worker` ausführen:

   ```sh
   npx wrangler login
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put ACCESS_TOKEN
   npx wrangler deploy
   ```

   `ACCESS_TOKEN` muss ein langes zufälliges, privates Passwort sein, das nicht in ein Repository gehört.
3. In der Lernstelle im Elternbereich die veröffentlichte Worker-Adresse (z. B. `https://oskar-lernstelle-ai.<account>.workers.dev`) und den Zugriffscode eingeben. Die Seite sendet Lerntext nur bei Klick auf **KI-Vorschläge**.
4. Die Service-Nutzung kann Kosten verursachen. API-Abrechnung, Volumenbeschränkungen und Zugang müssen vor dem öffentlichen Einsatz konfiguriert werden.

**Sicherheit:** Das ist eine vorläufige, passwortgeschützte Familienlösung, keine produktionsreife Nutzerverwaltung. Cloudflare/der KI-Anbieter verarbeitet den übertragenen Text. Keine privaten Schülerdaten, Fotos oder kompletten Schulunterlagen ohne ausdrückliche Entscheidung über Datenschutz übertragen. Für größere Nutzerkreise echte Authentifizierung, Rate Limiting und Missbrauchsschutz nachrüsten.

Das Gateway kontrolliert, dass die vom Modell ausgegebenen Textbelege im gelieferten Quelltext vorkommen. Damit ist **keine vollständige fachliche Richtigkeit garantiert**; die Karten müssen geprüft werden.