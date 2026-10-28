# KI-Aufgabendienst einrichten

Die Lernstelle läuft auf GitHub Pages. Die KI-Anbindung nutzt einen separaten Cloudflare Worker, damit der OpenAI API-Schlüssel nie im öffentlichen Browser oder Repository steht. Er erzeugt Vorschläge für Wissenskarten, Auswahlfragen, Richtig-oder-falsch-Fragen und Lückentexte. Jede Frage wird durch ein wörtliches Zitat aus der hochgeladenen Quelle verankert. Die Belege müssen vor der Freigabe fachlich geprüft werden.

## Bereitstellung über GitHub Actions

1. Erstelle ein Cloudflare-Konto und einen API-Token mit der Berechtigung, Workers zu bearbeiten. Kopiere die Account-ID aus dem Dashboard.
2. Erstelle einen separaten OpenAI API-Schlüssel mit Ausgabenlimit. Aktiviere ggf. Nutzungsbudget/Monitoring. Der ChatGPT-Plus-Tarif enthält keine API-Nutzung.
3. Hinterlege unter [GitHub Actions Secrets](https://github.com/stAlbrecht168/oskar-lernstelle/settings/secrets/actions) vier Repository Secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `OPENAI_API_KEY` und `OSKAR_ACCESS_TOKEN`. Der letzte Wert ist ein selbst erzeugtes langes Zufallspasswort; **niemals** hier oder im Chat veröffentlichen.
4. Öffne [Actions > KI-Dienst bereitstellen](https://github.com/stAlbrecht168/oskar-lernstelle/actions/workflows/deploy-worker.yml) und starte `Run workflow`. Der Workflow testet den Worker, deployt ihn und setzt die OpenAI- und Zugriffsschlüssel als private Worker Secrets.
5. Übernimm die `.workers.dev`-Adresse aus dem Workflow-Protokoll. Trage sie in der **Materialbibliothek** der Lernstelle in das HTTPS-Feld ein. Dort gibt es einen Button **Verbindung prüfen**. Den privaten Zugriffscode eingeben, bevor du auf **KI-Vorschläge** bei einer Materialquelle klickst.

Ohne die vier Zugangsdaten findet keine Cloudflare-Bereitstellung statt. Die GitHub Page ist ohne den Worker weiterhin mit lokalem Kartenmodus verwendbar.

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

## Fachübergreifende Journey-Generierung

Der neue Endpunkt `POST /journey` verwendet dieselbe Bearer-Authentifizierung wie `POST /generate`.

Beispiel für den Body (ohne Schulmaterial in GitHub ablegen):

```json
{
  "topic": "Wasser und Pflanzen",
  "sources": [
    {"id": "mat-1", "subject": "math", "title": "Maßeinheiten", "text": "... mindestens 40 Zeichen echter Unterrichtstext ..."},
    {"id": "bio-1", "subject": "biology", "title": "Pflanzen", "text": "... mindestens 40 Zeichen echter Unterrichtstext ..."}
  ]
}
```

Das Beispiel zeigt nur das Datenformat und ist kein gültiger produktiver Aufruf. Zulässig sind zwei bis vier Quellen aus mindestens zwei Fächern, 40 bis 6500 Zeichen je Quelle, zusammen höchstens 15.000 Zeichen. Die Antwort enthält unter `journey` eine Leitfrage, einen Einstieg, eine erläuterte Fächerbrücke, zwei bis vier Stationen, eine offene Reflexion und je Station `sourceId`, `subject`, `evidence`, `question`, `options`, `correctIndex` und `explanation`. `reviewRequired` ist `true`, `videosAnalyzed` ist `false`.

Der Worker verwirft unvollständige Stationen, fehlende oder nicht wörtlich enthaltene Belege, falsche Fach-IDs und Reisen mit weniger als zwei belegten Fächern. Die HTTP-Antwort ist in diesem Fall `422`. Keine Vorschläge werden automatisch veröffentlicht. Video-Links werden ausschließlich im Frontend aus einer kleinen, redaktionell ausgewählten Liste ergänzt und müssen aktiv freigegeben werden. Der Worker ruft keine Videotranskripte ab.

Aktuelle Einschränkungen: keine Registrierung einzelner Nutzer, keine serverseitige Speicherung von Lernreisen, keine automatische Videorecherche, keine Inhaltsbewertung der Videos, kein Rate Limiting und kein Live-Test mit echten privaten API-Zugangsdaten. Für eine öffentliche Mehrnutzer-App wäre eine richtige Authentifizierung mit nutzerbezogenen Quoten erforderlich.
## Automatische Verbindungen zwischen Schulfächern

Der Endpunkt `POST /connections` untersucht zwei bis vier Schulquellen aus mindestens zwei Fächern gemeinsam. Die Anfrage nutzt dieselbe Authentifizierung wie `/generate` und `/journey` und erfordert den privaten `ACCESS_TOKEN`. Die Antwort enthält bis zu drei Vorschläge mit fachlicher Verbindung, Transferidee, offener Frage und wörtlichen Quellenbelegen. Wenn kein seriöser Zusammenhang erkennbar ist, liefert der Worker eine leere Liste.

Die Lern-App startet die Analyse automatisch nach dem Speichern von Material, sobald zwei geeignete Fächer und die Verbindung in der aktuellen Browsersitzung vorhanden sind. Sie prüft die Belege erneut im Browser und speichert Ergebnisse lokal, um identische KI-Aufrufe zu vermeiden. Keine Verbindung wird als bewiesenes Wissen oder automatisch freigegebene Quizantwort dargestellt.



## Dauerhafte Wissensbasis (Version 0.10)

`POST /generate` akzeptiert zusätzlich `subjectId` und bis zu zwölf `existingTopics` mit ID, Fach, Titel, Zusammenfassung und einer Quellenstelle. Die Antwort ergänzt `topics` und `conflicts`. Neue Aussagen werden ausschließlich im neuen Schultext verankert. Geheimnisse bleiben weiterhin Worker-Secrets.

`POST /knowledge-ask` nimmt `question` und ein bis vier `sources` entgegen; Quellen dürfen zusammen höchstens 18.000 Zeichen enthalten. Antworten ohne ausreichende Grundlage müssen `insufficient:true` melden. Alle angegebenen Zitate werden gegen die mitgelieferten Quellen geprüft.

`POST /topic-practice` verwendet `topic` und dieselben Quellen. Jede Quizfrage enthält ihre `sourceId` und ein geprüftes wörtliches Zitat. Beide Endpunkte verwenden unverändert Bearer-Zugang und die zugelassene Browser-Herkunft.

Nach Änderungen am Worker prüft `scripts/live-smoke.mjs` im Deployment-Job die echte Verbindung mit erfundenem Schultext. Der Test protokolliert nur Prüfergebnisse; keine Schlüssel, Zugangscodes oder privaten Schulunterlagen. Dabei erfolgen drei kleine Modellaufrufe über die vorhandene API-Anbindung.
