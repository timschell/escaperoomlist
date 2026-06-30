# 🔓 Escape Room Tracker

Eine mobile-first **PWA** zum Tracken deiner gespielten Escape Rooms – mit Fotos,
Datums-Nachtrag, Druck-Status und Statistiken. Läuft als eine einzige Node-App
(API + Frontend) und wird per **Docker / Dokploy** deployed.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Express%20%2B%20SQLite-7c5cff)

## Funktionen

- 📋 **Raumliste** – Suche, Filter (ohne Datum / mit Foto / ausgedruckt …) und
  Gruppierung nach **Land**, **Stadt** oder **Jahr**.
- 📅 **Datum nachtragen** – jeder Raum ohne Datum lässt sich antippen und ergänzen.
- 📷 **Foto pro Raum** – direkt vom Handy aufnehmen oder aus der Galerie wählen.
  Bilder werden serverseitig verkleinert (max. 1600 px, JPEG) und im Volume gespeichert.
- 🖨️ **Druck-Liste** – sieh auf einen Blick, welche Fotos schon **ausgedruckt**
  sind und welche noch fehlen; ein Tipp markiert sie als erledigt.
- 📊 **Statistik** – Anzahl Räume, Länder, Städte, Verteilung nach Land/Jahr/Anbieter.
- ➕ **Neue Räume** hinzufügen, bearbeiten, löschen.
- 💾 **Backup** – Export/Import aller Raumdaten als JSON.
- 📱 **Installierbar** – „Zum Home-Bildschirm hinzufügen“, funktioniert offline (App-Shell).

## Projektstruktur

```
.
├── server/            Express-API + SQLite + Foto-Uploads, hostet auch das gebaute Frontend
│   ├── src/
│   └── seed/initial_escape_rooms.json   (134 Räume – Erst-Befüllung)
├── client/            React + Vite + TypeScript PWA
│   └── src/
├── Dockerfile         Multi-Stage Build (Client bauen → Server-Image)
├── docker-compose.yml Deployment inkl. persistentem /data-Volume
└── package.json       Komfort-Skripte (dev / build / start)
```

Alle Daten (DB + Fotos) liegen unter **`/data`** (im Container) bzw. im
Docker-Volume `escaperoom-data`. Beim allerersten Start wird die Datenbank
automatisch mit deinen 134 Räumen befüllt; bestehende Daten werden nie überschrieben.

## Lokale Entwicklung

Voraussetzung: Node 20+ (getestet mit Node 22/23).

```bash
npm install          # installiert root + server + client
npm run dev          # API :3000  +  Vite :5173  (mit Proxy)
# → App im Browser: http://localhost:5173
```

Produktion lokal testen (so wie im Container):

```bash
npm run build        # baut Client nach server/public/
npm start            # → http://localhost:3000
```

## Deployment mit Dokploy

Die App ist ein einzelner Container, der auf **Port 3000** lauscht und `/data`
als persistentes Volume braucht.

### Variante A – Compose (empfohlen)

1. In Dokploy ein neues Projekt → **Compose** anlegen, dieses Repo als Quelle wählen.
2. Dokploy nutzt die `docker-compose.yml` automatisch (inkl. Volume `escaperoom-data`).
3. Unter **Domains** deine Domain auf **Port 3000** mappen (Traefik/HTTPS macht Dokploy).
4. Deploy starten.

### Variante B – Application (Dockerfile)

1. Neues Projekt → **Application**, Build-Type **Dockerfile**.
2. **Volume Mount** hinzufügen: Host/Volume → Container-Pfad **`/data`**.
3. **Port 3000** veröffentlichen und Domain zuweisen.
4. Deploy.

### Ohne Dokploy (beliebiger Docker-Host)

```bash
docker compose up -d --build
# App auf http://SERVER-IP:3000
```

### Umgebungsvariablen

| Variable       | Default   | Bedeutung                                              |
|----------------|-----------|-------------------------------------------------------|
| `PORT`         | `3000`    | HTTP-Port                                             |
| `DATA_DIR`     | `/data`   | Verzeichnis für DB + Uploads (Volume!)                |
| `APP_PASSWORD` | _(leer)_  | Wenn gesetzt: Passwortschutz (Basic Auth) für die App |
| `APP_USER`     | `escape`  | Benutzername für den Passwortschutz                   |

## 🔒 Sicherheit / Passwortschutz

Die App hat **keine eingebaute Nutzerverwaltung** und ist für **eine Person**
gedacht. Auf einer öffentlichen Domain solltest du sie unbedingt schützen, sonst
kann jeder mit dem Link deine Daten sehen, ändern oder löschen.

**Empfohlen:** Setze in Dokploy (Service → Environment) eine Variable
`APP_PASSWORD=<dein-geheimes-passwort>`. Dann fragt der Browser beim ersten
Öffnen nach Benutzer (`escape`) + Passwort (Basic Auth). Ohne gesetztes
`APP_PASSWORD` läuft die App offen und gibt beim Start eine Warnung im Log aus.

Alternativ kannst du den Schutz auch über die Dokploy/Traefik-Basic-Auth-Middleware
vor den Container legen – dann brauchst du `APP_PASSWORD` nicht.

## Backup & Restore

- **Mehr → Daten exportieren**: lädt `escaperooms-backup.json` (alle Raumdaten).
- **Mehr → Backup importieren**: ersetzt oder ergänzt die Räume aus einer JSON-Datei.
- Die **Fotodateien** liegen im Volume unter `/data/uploads` – für ein vollständiges
  Backup zusätzlich dieses Volume sichern (z. B. via Dokploy-Volume-Backup).

## API (Kurzreferenz)

| Methode | Pfad                      | Zweck                          |
|---------|---------------------------|--------------------------------|
| GET     | `/api/rooms`              | alle Räume                     |
| POST    | `/api/rooms`              | Raum anlegen                   |
| PATCH   | `/api/rooms/:id`          | Felder/Datum/`printed` ändern  |
| DELETE  | `/api/rooms/:id`          | Raum löschen                   |
| POST    | `/api/rooms/:id/photo`    | Foto hochladen (multipart)     |
| DELETE  | `/api/rooms/:id/photo`    | Foto entfernen                 |
| GET     | `/api/stats`              | Statistik                      |
| GET     | `/api/backup/export`      | JSON-Export                    |
| POST    | `/api/backup/import`      | JSON-Import                    |
| GET     | `/api/health`             | Healthcheck                    |
