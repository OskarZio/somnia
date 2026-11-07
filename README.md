# ☾ Somnia – aplikacja do świadomego śnienia

Darmowa aplikacja webowa (PWA) do nauki świadomego śnienia, oparta na metodach, które mają realne wsparcie w badaniach. Działa w przeglądarce na telefonie i komputerze, można ją „zainstalować” na ekranie głównym i używać offline. **Wszystkie dane zostają na Twoim urządzeniu.**

**👉 Otwórz aplikację: https://oskarzio.github.io/somnia/**

## Co jest w środku

| Moduł | Co robi |
|---|---|
| **Dziennik snów** | Szybki zapis (także dyktowanie głosem po polsku), poziom świadomości (brak / przebłysk / świadomy / kontrola), wyrazistość, emocje, tagi, koszmary, fałszywe przebudzenia, technika z danej nocy, wyszukiwarka i filtry, „nic nie pamiętam” jako dane. |
| **Znaki snu** | Ręczne znaki snu w 4 kategoriach (akcja, miejsce, forma, odczucie) + automatyczne sugestie z powtarzających się słów w Twoich snach. Znaki trafiają do skryptu MILD i celów dnia. |
| **Budzik świadomego snu (zakładka Noc)** | Pobudki w końcu cyklu snu, WBTB po ~4,5 lub ~6 h, ekran „nie ruszaj się – przypomnij sen”, szybka notatka, odliczanie czuwania, **prowadzony głosem MILD lub SSILD**, trening dźwięku cue i **ciche cue w szacowanych oknach REM (TLR)**. Łagodny narastający budzik albo bardzo cichy tryb DEILD. Ciemnoczerwony ekran nocny, blokada wygaszania ekranu. |
| **Dzień** | Program 4-tygodniowy z codzienną listą, reality checki z krytyczną refleksją (losowy test + pytanie), przypomnienia w aplikacji, **eksport losowych przypomnień do kalendarza (.ics)**, cele pamięci prospektywnej, intencja na noc. |
| **Techniki** | MILD, SSILD, WBTB, reality checki, TLR, pamięć snów, świadomość w ciągu dnia, WILD/FILD/DEILD – każda z krokami, poziomem dowodów i opisem badań. Stabilizacja snu, bezpieczeństwo. |
| **Postępy** | Seria nocy, % nocy z pamiętanym snem, sny na noc, RC dziennie, kalendarz 5 tygodni, wykres tygodniowy, **skuteczność technik u Ciebie**, top emocje i znaki snu. |
| **Prywatność** | Dane w `localStorage`, PIN przed podglądem, kopia JSON, eksport dziennika do Markdown. Bez kont, bez serwera, bez śledzenia. |

## Research: co działa (i dlaczego aplikacja wygląda tak, a nie inaczej)

**1. WBTB + MILD to najlepiej przebadany zestaw.** W National Australian Lucid Dream Induction Study (Aspy i in., 2017, N=169) grupa łącząca reality checki, WBTB i MILD miała ok. 17% skuteczności w ciągu tygodnia, a u osób, które zasnęły w ciągu 5 minut od zakończenia MILD – prawie 46% prób. Sam reality check bez innych technik nie dał istotnego efektu. → *Budzik stawia WBTB w centrum, a po technice zachęca do szybkiego zaśnięcia.*

**2. SSILD jest równie skuteczny jak MILD.** International Lucid Dream Induction Study (Aspy, 2020, N=355): MILD i SSILD podobnie skuteczne, hybryda bez przewagi. Predyktory sukcesu: **dobra pamięć snów** i **zaśnięcie w ciągu 10 minut** po technice. Udane techniki nie pogarszały jakości snu. → *Wybór MILD/SSILD z prowadzeniem głosem; pierwszy tydzień programu to wyłącznie budowanie pamięci snów.*

**3. Świadome sny pojawiają się głównie nad ranem.** Fazy REM wydłużają się w drugiej połowie nocy, dlatego WBTB po ok. 5 h trafia tuż przed najintensywniejsze śnienie. → *WBTB po 3 lub 4 cyklach, pobudka zawsze w końcu cyklu.*

**4. Dźwiękowe cue (Targeted Lucidity Reactivation) działają także w domu.** Northwestern University (Konkoly, Paller i in., 2024, *Consciousness and Cognition*): aplikacja z treningiem przed snem i cue w nocy podniosła średnią z 0,74 do 2,11 świadomych snów tygodniowo; w kontroli z fałszywym cue efekt był znacznie mniejszy. Ograniczenie: telefon nie wie, kiedy jesteś w REM, a cue może wybudzać. → *Trening cue w trakcie MILD/SSILD, potem ciche serie w szacowanych oknach REM z regulowaną głośnością i opóźnieniem.*

**5. Reality checki: tylko uważne i w połączeniu z innymi technikami.** Najbardziej niezawodny test to zatkany nos; tekst i zegar też są dobre. Metoda krytyczno-refleksyjna (Tholey) – naprawdę zastanowić się, czy to sen. → *Każdy RC w Somnii to test + pytanie refleksyjne + ocena uważności.*

**6. Czego chcą użytkownicy najlepszych aplikacji** (Oniri, Shape, WorldWithin, Lucidity, Awoken, Dreemer): szybki zapis (najlepiej głosem), znaki snu, przypomnienia o RC w wybranych godzinach, kurs technik, cue dźwiękowe, statystyki i eksport. Somnia ma to wszystko za darmo i bez konta.

## Ograniczenia (uczciwie)

- To aplikacja webowa: budzik i cue działają, **gdy Somnia jest otwarta**. W nocy zostaw ją włączoną na ładowarce (aplikacja trzyma ekran włączony i przyciemniony). Na iPhonie Safari może wyciszyć dźwięk po zablokowaniu ekranu – **zawsze ustaw zapasowy budzik systemowy**.
- Przypomnienia o RC w tle są najbardziej niezawodne przez **plik .ics** zaimportowany do kalendarza telefonu.
- Okna REM są szacowane z długości cyklu (ustawialna), nie mierzone.
- Dyktowanie wymaga przeglądarki z Web Speech API (np. Chrome na Androidzie, Safari na iOS).

## Bezpieczeństwo

Nie rób WBTB codziennie (2–3 noce w tygodniu). Paraliż senny jest nieszkodliwy. Przy bezsenności, zaburzeniach psychotycznych, dysocjacji, PTSD lub epilepsji – skonsultuj praktykę z lekarzem. Somnia nie zaleca żadnych suplementów ani leków.

## Uruchomienie lokalne

```bash
git clone https://github.com/OskarZio/somnia.git
cd somnia
python3 -m http.server 8000   # otwórz http://localhost:8000
```

Czysty HTML/CSS/JS, bez zależności i bez kroku budowania. Pliki: `index.html`, `styles.css`, `app.js` (logika), `data.js` (treści technik i programu), `sw.js` (offline), `manifest.webmanifest`.

## Źródła

- Aspy D.J., Delfabbro P., Proeve M., Mohr P. (2017). *Reality testing and the mnemonic induction of lucid dreams: Findings from the national Australian lucid dream induction study.* Dreaming, 27(3). [Omówienie – Neuroscience News](https://neurosciencenews.com/lucid-dream-control-7769/)
- Aspy D.J. (2020). *Findings From the International Lucid Dream Induction Study.* Frontiers in Psychology, 11:1746. [PMC7379166](https://pmc.ncbi.nlm.nih.gov/articles/PMC7379166)
- Konkoly K.R., Paller K.A. i in. (2024). *Provoking lucid dreams at home with sensory cues paired with pre-sleep cognitive training.* Consciousness and Cognition. [Northwestern News](https://news.northwestern.edu/stories/2024/10/study-shows-pre-sleep-training-coupled-with-sensory-cues-can-trigger-lucid-dreaming-2)
- Carr M., Konkoly K. i in. (2020). *Combining presleep cognitive training and REM-sleep stimulation in a laboratory morning nap for lucid dream induction.* [Swansea](https://cronfa.swansea.ac.uk/Record/cronfa53997)
- International Journal of Dream Research 17(2), 2024 – TLR + uważność po WBTB. [PDF](https://faculty.wcas.northwestern.edu/~paller/IJDR2024.pdf)
- Stumbrys T., Erlacher D., Schädlich M., Schredl M. (2012). *Induction of lucid dreams: A systematic review of evidence.* Consciousness and Cognition, 21(3).
- LaBerge S., Rheingold H. (1990). *Exploring the World of Lucid Dreaming.*

## Licencja

MIT
