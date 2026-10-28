# KI-Aufgabendienst einrichten

Die Lernstelle läuft auf GitHub Pages. Die KI-Anbindung nutzt einen separaten Cloudflare Worker, damit der OpenAI API-Schlüssel nie im öffentlichen Browser oder Repository steht. Er erzeugt Vorschläge für Wissenskarten, Auswahlfragen, Richtig-oder-falsch-Fragen und Lückentexte. Jede Frage wird durch ein wörtliches Zitat aus der hochgeladenen Quelle verankert. Die Belege müssen vor der Freigabe fachlich geprüft werden.

## Bereitstellung über GitHub Actions

1. Erstelle ein Cloudflare-Konto und einen API-Token mit der Berechtigung, Workers zu bearbeiten. Kopiere die Account-ID aus dem Dashboard.
2. Erstelle einen separaten OpenAI API-Schlüssel mit Ausgabenlimit. Aktiviere ggf. Nutzungsbudget/Monitoring. Der ChatGPT-Plus-Tarif enthält keine API-Nutzung.
3. Hinterlege unter [GitHub Actions Secrets](https://github.com/stAlbrecht168/oskar-lernstelle/settings/secrets/actions) vier Repository Secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `OPENAI_API_KEY` und `OSKAR_ACCESS_TOKEN`. Der letzte Wert ist ein selbst erzeugtes langes Zufallspasswort; **niemals** hier oder im Chat veröffentlichen.
4. Öffne [Actions > KI-Dienst bereitstellen](https://github.com/stAlbrecht168/oskar-lernstelle/actions/workflows/deploy-worker.yml) und starte `Run workflow`. Der Workflow testet den Worker, deployt ihn und setzt die OpenAI- und Zugriffsschlüssel als private Worker Secrets.
5. Übernimm die `.workers.dev`-Adresse aus dem Workflow-Protokoll. Trage sie in der **Materialbibliothek** der Lernstelle in das HTTPS-Feld ein. Dort gibt es einen Button **Verbindung prüfen**. Den privaten Zugriffscode eingeben, bevor du auf **KI-Vorschläge** bei einer Materialquelle klickst.

Es gibt **keinen automatischen Cloudflare-Deploy**, solange die vier Zugangsdaten fehlen. Die GitHub Page ist ohne den Worker weiterhin mit lokalem Kartenmodus verwendbar.

## Datenschutz und Grenzen

Das private Familienpasswort ist ein einfacher Zugangsschutz für eine kleine Nutzergruppe und ersetzt keine Benutzerverwaltung oder per IP limitierte Abrechnung. Browser-Origin-Prüfung ist keine Authentifizierung, daher wird zusätzlich ein Zugangscode verlangt. Schütze insbesondere API-Schlüssel, setze Quoten und verwende nur Texte, die du an den KI-Anbieter senden darfst. Uploads werden in der Web-App lokal ausgelesen und nur beim aktiven Klick auf KI-Vorschläge als Text übertragen. Die API wird mit `store:false` aufgerufen. Dies garantiert nicht, dass keinerlei Verarbeitung oder Logging beim Anbieter stattfindet.

Der Worker prüft automatisch, ob Belegzitate im übergebenen Text auftauchen. Eine mathematische/fachliche Prüfung der generierten Antworten findet nicht statt. Die Freigabe in der Materialbibliothek ist verpflichtend.

## Tests

```bash
cd worker
npm test
```

## Manuelle Einrichtung alternativ

```bash
cd worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ACCESS_TOKEN
```

Der Worker antwortet an `/health` mit `ok:true` und `configured:true`, wenn beide Secrets vorhanden sind. Diese Diagnose verrät keine geheimen Werte.