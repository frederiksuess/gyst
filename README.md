# GYST

Notes · Tasks · Habits · Journal. Eine PWA ohne Backend – alle Daten bleiben auf dem Gerät.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette App (HTML, CSS, JS in einer Datei) |
| `manifest.webmanifest` | Name, Icons, Standalone-Anzeige |
| `sw.js` | Service Worker: App-Shell offline, Fonts werden beim ersten Laden gecacht |
| `icons/` | 192/512 px + maskable Icon |
| `.well-known/assetlinks.json` | Verknüpft die Android-App mit der Domain (URL-Leiste verschwindet) |
| `.nojekyll` | Damit GitHub Pages den `.well-known`-Ordner ausliefert |

## 1. Auf GitHub Pages veröffentlichen

1. Neues Repo anlegen (z. B. `gyst`), diese Dateien in den Root pushen.
2. Settings → Pages → Source: „Deploy from a branch", Branch `main`, Ordner `/ (root)`.
3. Nach ein bis zwei Minuten ist die App unter `https://DEINNAME.github.io/gyst/` erreichbar.
   Alle Pfade in der App sind relativ, der Unterordner ist also egal.

## 2. Mit PWABuilder in eine Android-App packen

1. https://www.pwabuilder.com öffnen, die Pages-URL eingeben, „Package for stores" → Android.
2. Im Dialog: Package ID merken (z. B. `io.github.deinname.gyst`), „Signing key: Create new" – **die erzeugte `signing.keystore` und die Passwörter aufheben**, sonst kannst du später kein Update signieren.
3. Download entpacken. Darin liegen:
   - `app-release-signed.apk` → per USB oder Drive aufs Telefon, dort öffnen, installieren
     (Android fragt einmal, ob Installationen aus dieser Quelle erlaubt sind).
   - `assetlinks.json` → Inhalt in `.well-known/assetlinks.json` dieses Repos übernehmen und pushen.
     Erst danach zeigt die App keine Chrome-Adressleiste mehr. (Prüfen: `https://DEINNAME.github.io/gyst/.well-known/assetlinks.json` muss im Browser aufrufbar sein.)

Die APK ist nur eine Hülle: Sie lädt immer die aktuelle Version von GitHub Pages.
Ein `git push` genügt für ein App-Update; die APK muss nur neu gebaut werden, wenn sich Name, Icon oder Package-ID ändern.

## Nach einem Update

Im `sw.js` die Zeile `const VERSION = 'gyst-v1'` hochzählen (`v2`, `v3` …), damit installierte Geräte den neuen Stand ziehen.

## Wo liegen die Daten?

In der IndexedDB von Chrome (Origin `DEINNAME.github.io`). Sie überleben App-Neustarts und Updates.
Sie gehen verloren, wenn du in Android die Daten von **Chrome** löschst oder Chrome deinstallierst – deshalb gibt es *Settings → Export backup*: die JSON-Datei landet über das Teilen-Menü direkt in Google Drive, und *Import backup* stellt sie wieder her.

## Sperre

PIN (6 Ziffern, als SHA-256 gespeichert) und optional Fingerabdruck/Gesicht über WebAuthn (Systemdialog von Android).
Das ist ein Zugriffsschutz beim Öffnen, keine Verschlüsselung der Datenbank.
