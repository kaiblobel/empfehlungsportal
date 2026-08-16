# Bildquellen · Abschnitt „Empfehlen gehört zum Alltag"

Alle Bilder von [Unsplash](https://unsplash.com), frei nutzbar unter der
[Unsplash-Lizenz](https://unsplash.com/license), auch kommerziell.

Sie lagen vorher **nicht** im Projekt, sondern wurden bei jedem Seitenaufruf über das
Unsplash-CDN nachgeladen (`css/programm.css`, Regeln `.alltag-quote[data-mood=…]`).
Zwei Gründe, warum sie jetzt lokal liegen:

- **Im Kundengespräch verlässlich.** Bei schlechtem Netz standen die Kacheln vorher leer da.
- **Datenschutz.** Der externe Abruf gibt die IP-Adresse der betrachtenden Person an Unsplash
  weiter, ohne dass sie zustimmen konnte. Gleiche Logik wie bei den Schriften, die aus
  demselben Grund lokal eingebunden sind.

| Datei | Unsplash-Foto-ID | Motiv |
|---|---|---|
| `restaurant.jpg` | photo-1517248135467-4c7edcad34c4 | Restaurantraum |
| `film.jpg` | photo-1485846234645-a62644f84728 | Kino |
| `handwerker.jpg` | photo-1504917595217-d4dc5ebe6122 | Handwerk |
| `baecker.jpg` | photo-1509440159596-0249088772ff | Bäckerei |
| `arzt.jpg` | photo-1576091160399-112ba8d25d1d | Praxis |
| `buch.jpg` | photo-1481627834876-b7833e8f5570 | Buch |

Geholt am 16.08.2026 in 760 px Breite bei Qualität 72, das reicht für die Kachelgrößen
in der Präsentation und hält die Seite leicht.
