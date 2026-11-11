# 🏃‍♀️ Katumpi: Takbo sa Tuca

Isang **3D endless runner** na mobile game (parang Temple Run / Subway Surfers) tungkol kay
**Katumpi** — isang masayahin at makulit na batang babae na taga-**Tuca, Binidayan**, Lanao del Sur.

Tumatakbo si Katumpi sa daan ng Tuca sa tabi ng Lawa ng Lanao — may mga puno ng niyog,
torogan, bahay kubo, masjid, makukulay na bandila at bangka sa lawa.
Ang mga kulay ay hango sa langkit/okir (pula, dilaw, berde, lila).

## Paano laruin

| Galaw | Phone | Keyboard |
|---|---|---|
| Lumipat ng lane | Swipe ⬅ / ➡ | ← → o A / D |
| Tumalon (sa ibabaw ng harang na kahoy) | Swipe ⬆ | ↑ / W / Space |
| Dumausdos (sa ilalim ng banner) | Swipe ⬇ | ↓ / S |
| Pause | ❚❚ button | P / Esc |

- Iwasan ang **jeep** — kailangan lumipat ng lane.
- Kunin ang mga **barya** (+5 puntos bawat isa).
- Kapag tumama sa gilid, tatalbog si Katumpi pabalik — pero kung dalawang beses agad, nadapa na siya!
- Pabilis nang pabilis ang takbo.
- Ang musika ay nasa `www/assets/music.mp3`.

## Patakbuhin

Walang kailangang i-build — puro HTML/JS (Three.js, kasama na sa `www/lib`).

```bash
npm start          # bubuksan sa http://localhost:8080
```

### I-install sa phone (PWA)

Kapag naka-host na (hal. GitHub Pages — tingnan sa ibaba), buksan sa Chrome ng phone →
menu **⋮** → **Add to Home screen / Install app**. Gumagana rin kahit walang internet pagkatapos ng unang bukas.

**GitHub Pages:** Settings → Pages → Source: **GitHub Actions**. Kapag na-merge sa `main`,
awtomatikong ide-deploy ang `www/` folder.

### Gumawa ng Android APK (Capacitor)

Kailangan: Node.js at Android Studio.

```bash
npm install
npm run android:add     # isang beses lang
npm run android:sync
npm run android:open    # bubuksan sa Android Studio → Build → Build APK
```

## Mga file

```
www/
  index.html      # mga screen at HUD
  style.css
  game.js         # buong laro: mundo, si Katumpi, harang, barya, controls, tunog
  sw.js           # offline support
  manifest.json   # PWA install info
  lib/three.module.min.js
  assets/music.mp3
  icons/
```

### APK (handa nang i-install)

Ang pinakabagong APK ay nasa **`dist/Katumpi.apk`**. I-download sa phone, buksan, at payagan ang
"Install unknown apps" kapag hiningi.

Para gumawa ulit ng APK nang walang Android Studio (Ubuntu/Debian):

```bash
sudo apt-get install android-sdk-platform-23 android-sdk-build-tools dalvik-exchange openjdk-17-jdk
./android-app/build-apk.sh path/sa/katumpi-release.jks   # gamitin ang parehong keystore para ma-update ang app
```
