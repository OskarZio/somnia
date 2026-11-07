/* Somnia – treści: techniki, reality checki, program, słowniki.
   Opisy oparte na badaniach (źródła w README.md). */
'use strict';

const EVIDENCE = {
  strong: { label: 'Mocne dowody', cls: 'ev-strong' },
  good:   { label: 'Dobre dowody', cls: 'ev-good' },
  mixed:  { label: 'Dowody mieszane', cls: 'ev-mixed' },
  anecdotal: { label: 'Głównie praktyka', cls: 'ev-anec' },
};

const TECHNIQUES = [
  {
    id: 'mild',
    name: 'MILD',
    full: 'Mnemonic Induction of Lucid Dreams',
    evidence: 'strong',
    when: 'Po przebudzeniu w nocy (najlepiej po WBTB, ok. 5 h snu)',
    summary: 'Ćwiczenie pamięci prospektywnej: ustawiasz w głowie intencję „zauważę, że śnię” i wizualizujesz moment, w którym to się dzieje.',
    why: 'W badaniu NALDIS (Aspy i in., 2017) połączenie reality checków, WBTB i MILD dało ok. 17% skuteczności w ciągu tygodnia, a u osób, które zasnęły w ciągu 5 minut od zakończenia MILD – prawie 46% prób. W ILDIS (Aspy, 2020, N=355) MILD i SSILD wypadły równie dobrze.',
    steps: [
      'Po przebudzeniu przypomnij sobie sen, z którego się budzisz – jak najwięcej szczegółów. Zapisz słowa-klucze.',
      'Powtarzaj w myślach z prawdziwą intencją: „Następnym razem, gdy będę śnić, zapamiętam, że śnię”. Skup się na znaczeniu, nie mechanicznym klepaniu.',
      'Wyobraź sobie, że wracasz do tego snu i w pewnym momencie zauważasz coś dziwnego (znak snu) – i właśnie wtedy uświadamiasz sobie: „to sen!”. Zobacz, co robisz dalej.',
      'Powtarzaj intencję i wizualizację, aż poczujesz, że intencja „siedzi”, albo aż zaśniesz.',
      'Kluczowe: zasypiaj szybko po zakończeniu (do ~5–10 min). Jeśli myśli odpływają, wróć na chwilę do intencji.',
    ],
    tips: [
      'Najlepiej działa u osób z dobrą pamięcią snów – najpierw buduj dziennik.',
      'Wpleć swoje znaki snu: „Gdy zobaczę [znak], zrozumiem, że śnię”.',
    ],
  },
  {
    id: 'ssild',
    name: 'SSILD',
    full: 'Senses Initiated Lucid Dream',
    evidence: 'good',
    when: 'Po WBTB (ok. 4,5–6 h snu)',
    summary: 'Cykliczne przenoszenie uwagi: wzrok → słuch → czucie ciała. Najpierw kilka szybkich cykli, potem kilka wolnych, a potem zwykłe zasypianie.',
    why: 'W ILDIS (Aspy, 2020) SSILD był tak samo skuteczny jak MILD, a jest prostszy – nie wymaga pamiętania snu ani wizualizacji. Sukces przewidywało szybkie zaśnięcie (do 10 min) po technice.',
    steps: [
      'Połóż się wygodnie, oczy zamknięte. Nie staraj się niczego „zobaczyć” na siłę – samo obserwowanie wystarczy.',
      'WZROK: skieruj uwagę na ciemność pod powiekami. Obserwuj kolory, plamki, cokolwiek się pojawi.',
      'SŁUCH: przenieś uwagę na dźwięki – w pokoju, na zewnątrz, w głowie.',
      'CIAŁO: poczuj ciało – ciężar, temperaturę, mrowienie, oddech.',
      'Zrób 4–6 szybkich cykli (ok. 2–5 s na każdy zmysł), a potem 3–4 wolne cykle (ok. 30–60 s na zmysł).',
      'Po ostatnim cyklu przestań i zasypiaj w swojej ulubionej pozycji. Możesz dodać krótką intencję: „zauważę, że śnię”.',
    ],
    tips: [
      'Często pojawiają się fałszywe przebudzenia – po każdym „przebudzeniu” zrób reality check (zatkany nos!).',
      'Jeśli zasypiasz w trakcie cykli – to też jest OK.',
    ],
  },
  {
    id: 'wbtb',
    name: 'WBTB',
    full: 'Wake Back To Bed',
    evidence: 'good',
    when: 'Budzik po ok. 4,5–6 h snu, krótka pobudka, powrót do łóżka',
    summary: 'Budzisz się w drugiej połowie nocy, gdy fazy REM są najdłuższe, robisz technikę i wracasz spać prosto w intensywne śnienie.',
    why: 'Świadome sny pojawiają się najczęściej w ostatnich godzinach snu. W badaniach Aspy’ego pobudka po ok. 5 h była bazą dla MILD/SSILD. Sam WBTB też podnosi szanse (Stumbrys i in., 2012).',
    steps: [
      'Ustaw w Somnii plan nocy – budzik WBTB trafi w koniec cyklu snu w okolicy 5 h.',
      'Po pobudce nie ruszaj się 30–60 s i przypomnij sen. Zapisz go.',
      'Pozostań wybudzony/a krótko – zwykle 5–20 min (dłużej = więcej czujności, ale trudniej zasnąć). Przy przyćmionym świetle.',
      'Zrób MILD lub SSILD i wracaj spać.',
    ],
    tips: [
      'Nie więcej niż 2–3 noce w tygodniu – sen jest ważniejszy niż świadomy sen.',
      'Jeśli masz problemy z zasypianiem – skróć czas czuwania do minimum albo pomiń WBTB.',
    ],
  },
  {
    id: 'rc',
    name: 'Reality checki',
    full: 'Testowanie rzeczywistości + krytyczna refleksja',
    evidence: 'mixed',
    when: 'W ciągu dnia, ok. 10 razy, przy wyzwalaczach i znakach snu',
    summary: 'Kilka razy dziennie naprawdę sprawdzasz, czy nie śnisz. Nawyk przenosi się do snów.',
    why: 'Sam reality check (bez innych technik) w NALDIS nie dał istotnego efektu przez tydzień, ale w połączeniu z WBTB+MILD był częścią najskuteczniejszej kombinacji. Działa lepiej po kilku tygodniach i gdy jest robiony uważnie (metoda krytyczno-refleksyjna Tholeya), a nie odruchowo.',
    steps: [
      'Zatrzymaj się i szczerze zapytaj: „Czy ja teraz śnię?”. Zakładaj, że może tak być.',
      'Zrób fizyczny test – najlepiej dwa (np. zatkany nos + tekst).',
      'Rozejrzyj się: czy coś jest dziwne? Jak się tu znalazłem/am? Co robiłem/am 10 minut temu?',
      'Wyobraź sobie przez chwilę, jak by to było, gdyby to był sen – co byś zrobił/a?',
    ],
    tips: [
      'Wiąż RC z wyzwalaczami: przejście przez drzwi, telefon w ręku, silne emocje, coś dziwnego, Twoje znaki snu.',
      'Lepiej 8 uważnych RC niż 30 odruchowych.',
    ],
  },
  {
    id: 'tlr',
    name: 'TLR – dźwiękowe cue',
    full: 'Targeted Lucidity Reactivation',
    evidence: 'good',
    when: 'Trening przed snem / przy WBTB + ciche cue w nocy',
    summary: 'Przed snem kojarzysz dźwięk z uważnym stanem „czy śnię?”. W nocy ten sam dźwięk gra cicho – mózg może go wpleść w sen i przypomnieć o świadomości.',
    why: 'Northwestern (Konkoly i in., 2024, Consciousness and Cognition): aplikacja domowa z treningiem i cue podniosła średnią z 0,74 do 2,11 świadomych snów tygodniowo; w grupie kontrolnej z fałszywym cue efekt był dużo mniejszy. Ograniczenie: telefon nie wie, kiedy jesteś w REM, więc cue może Cię wybudzić – dlatego ustaw bardzo cichą głośność.',
    steps: [
      'Wybierz dźwięk cue w ustawieniach (zawsze ten sam).',
      'Podczas treningu (sesja w zakładce Noc) cue gra co jakiś czas – za każdym razem robisz uważny „check”: ciało, myśli, emocje, otoczenie. „Czy śnię?”.',
      'Po zaśnięciu Somnia odczeka ustalony czas i odtworzy cue cicho w seriach, w oknie, w którym prawdopodobny jest REM.',
      'Jeśli w śnie usłyszysz dźwięk lub poczujesz „sygnał” – zrób RC.',
    ],
    tips: [
      'Kalibracja: głośność taka, żeby na jawie ledwo było słychać.',
      'Jeśli cue Cię budzi – zmniejsz głośność lub wydłuż opóźnienie.',
    ],
  },
  {
    id: 'recall',
    name: 'Pamięć snów',
    full: 'Fundament wszystkich technik',
    evidence: 'strong',
    when: 'Każdego ranka i po każdym nocnym przebudzeniu',
    summary: 'Dobra pamięć snów to najsilniejszy predyktor sukcesu z MILD. Bez niej możesz mieć świadome sny i ich nie pamiętać.',
    why: 'W ILDIS lepsza ogólna pamięć snów przewidywała skuteczność technik. Dziennik pozwala też znaleźć znaki snu.',
    steps: [
      'Przed snem: „Rano zapamiętam swoje sny”.',
      'Po przebudzeniu nie ruszaj się i nie sięgaj od razu po telefon do innych rzeczy. Leż w tej samej pozycji.',
      'Odtwarzaj sen od końca: ostatnia scena → co było wcześniej → jeszcze wcześniej.',
      'Zapisz najpierw słowa-klucze (albo podyktuj), dopiero potem całość.',
      'Zapisuj także fragmenty i „nic nie pamiętam” – to też dane.',
    ],
    tips: [
      'Alkohol i późne ekrany pogarszają REM i pamięć snów.',
      'Stała pora snu i odpowiednia długość snu = więcej REM rano.',
    ],
  },
  {
    id: 'dild',
    name: 'Świadomość w ciągu dnia',
    full: 'Pamięć prospektywna i uważność',
    evidence: 'mixed',
    when: 'Cały dzień',
    summary: 'Trening „zauważania” w ciągu dnia: cele pamięci prospektywnej (LaBerge) i krótkie chwile uważności.',
    why: 'Uważność koreluje z częstością świadomych snów, a MILD opiera się właśnie na pamięci prospektywnej. Trening dzienny wzmacnia ten mięsień.',
    steps: [
      'Wybierz na dziś 3–4 cele (np. „gdy zobaczę psa, zrobię RC”).',
      'Gdy zauważysz cel – zrób RC i zaznacz to w zakładce Dzień.',
      'Jeśli przegapisz cel, zauważ to i postanów: „następnym razem zauważę”.',
    ],
    tips: ['Twoje znaki snu z dziennika są najlepszymi celami.'],
  },
  {
    id: 'wild',
    name: 'WILD / FILD / DEILD',
    full: 'Wejście w sen bezpośrednio z jawy',
    evidence: 'anecdotal',
    when: 'Po WBTB lub przy porannych przebudzeniach',
    summary: 'Zasypiasz, zachowując świadomość (WILD), lekko poruszasz palcami przy zasypianiu (FILD) albo wracasz w sen zaraz po przebudzeniu bez ruchu (DEILD).',
    why: 'Popularne w społeczności, ale słabo przebadane. Mogą prowadzić przez paraliż senny – nieszkodliwy, ale bywa straszny. Traktuj jako zaawansowane uzupełnienie.',
    steps: [
      'DEILD: gdy budzisz się rano, nie ruszaj się, nie otwieraj oczu, przypomnij sen i „wróć” do jego obrazu.',
      'WILD: leż nieruchomo, rozluźniaj ciało, obserwuj obrazy hipnagogiczne, nie angażując się w nie. Gdy scena stanie się wyraźna – wejdź w nią.',
      'Przy paraliżu sennym: spokojnie oddychaj, skup się na poruszeniu palcem u nogi albo przyjmij doznania i pozwól im przejść w sen.',
    ],
    tips: ['Bardzo cichy budzik Somnii („tryb DEILD”) sprzyja przebudzeniom bez ruchu.'],
  },
];

const REALITY_CHECKS = [
  { id: 'nose', name: 'Zatkany nos', how: 'Zatkaj nos palcami i spróbuj oddychać. We śnie zwykle nadal oddychasz.', reliability: 5 },
  { id: 'text', name: 'Tekst dwa razy', how: 'Przeczytaj napis, odwróć wzrok, przeczytaj znowu. We śnie tekst się zmienia lub jest nieczytelny.', reliability: 4 },
  { id: 'hand', name: 'Palec przez dłoń', how: 'Spróbuj przebić dłoń palcem drugiej ręki, naprawdę oczekując, że przejdzie.', reliability: 4 },
  { id: 'fingers', name: 'Policz palce', how: 'Przyjrzyj się dłoniom i policz palce. We śnie bywa ich więcej, są rozmyte lub dziwne.', reliability: 3 },
  { id: 'clock', name: 'Zegar', how: 'Spójrz na godzinę, odwróć wzrok, spójrz ponownie. We śnie godzina „skacze”.', reliability: 3 },
  { id: 'memory', name: 'Jak się tu znalazłem?', how: 'Odtwórz ostatnie 15 minut. We śnie nie da się połączyć zdarzeń w ciągłość.', reliability: 3 },
  { id: 'light', name: 'Włącznik światła', how: 'Pstryknij włącznik. We śnie światło często nie reaguje.', reliability: 2 },
];

const RC_QUESTIONS = [
  'Czy ja teraz śnię? Naprawdę rozważ obie możliwości.',
  'Jak się tu znalazłem/am? Co działo się 10 minut temu?',
  'Czy coś jest dziwne, nielogiczne lub „nie na miejscu”?',
  'Co bym teraz zrobił/a, gdyby to był sen?',
  'Czy moje ciało, światło, dźwięki są takie jak zwykle?',
];

const EMOTIONS = ['radość', 'spokój', 'zachwyt', 'ekscytacja', 'strach', 'lęk', 'smutek', 'złość', 'wstyd', 'zagubienie', 'nostalgia', 'miłość'];

const LUCIDITY_LEVELS = [
  { v: 0, label: 'Brak', desc: 'Zwykły sen' },
  { v: 1, label: 'Przebłysk', desc: 'Podejrzenie / chwila świadomości' },
  { v: 2, label: 'Świadomy', desc: 'Wiedziałem/am, że śnię' },
  { v: 3, label: 'Kontrola', desc: 'Świadomy i wpływałem/am na sen' },
];

const DREAMSIGN_CATS = [
  { id: 'action', label: 'Akcja', hint: 'np. latanie, ucieczka, egzamin' },
  { id: 'context', label: 'Miejsce/sytuacja', hint: 'np. stara szkoła, dziwny dom' },
  { id: 'form', label: 'Forma', hint: 'np. ktoś wygląda inaczej, zmienione ciało' },
  { id: 'awareness', label: 'Odczucie', hint: 'np. dziwne myśli, déjà vu, silne emocje' },
];

const PROGRAM = [
  {
    week: 1, title: 'Pamięć snów',
    goal: 'Zapisuj każdy sen (nawet fragment). Cel: pamiętać 1+ sen na noc.',
    tasks: ['Zapisz sny rano (lub „nic nie pamiętam”)', 'Intencja przed snem: „zapamiętam sny”', 'Przeczytaj: Pamięć snów'],
  },
  {
    week: 2, title: 'Reality checki i znaki snu',
    goal: 'Dodaj 8–10 uważnych RC dziennie. Wypisz pierwsze znaki snu.',
    tasks: ['Zapisz sny rano', '8–10 uważnych RC', 'Oznacz znaki snu w dzienniku', 'Wybierz 3 cele dnia'],
  },
  {
    week: 3, title: 'WBTB + MILD',
    goal: '2–3 noce w tygodniu: plan nocy z WBTB i MILD. Pozostałe noce – normalny sen i dziennik.',
    tasks: ['Zapisz sny rano', 'RC w ciągu dnia', 'Noc WBTB + MILD (2–3× w tygodniu)', 'Zaśnij do 10 min po technice'],
  },
  {
    week: 4, title: 'SSILD + dźwiękowe cue',
    goal: 'Przetestuj SSILD i TLR. Porównaj w statystykach, co działa u Ciebie.',
    tasks: ['Zapisz sny rano', 'RC w ciągu dnia', 'Noc WBTB + SSILD z cue (2–3× w tygodniu)', 'Sprawdź Postępy: która technika działa'],
  },
];

const SAFETY = [
  'Świadome śnienie jest dla większości ludzi bezpieczne, a w badaniach udane MILD/SSILD nie pogarszało jakości snu. Ale sen jest ważniejszy niż świadomy sen – nie rób WBTB co noc.',
  'Paraliż senny bywa przerażający, ale jest nieszkodliwy i mija sam. Skup się na spokojnym oddechu lub poruszeniu palcem.',
  'Jeśli masz bezsenność, zaburzenia psychotyczne, dysocjację, PTSD lub epilepsję – skonsultuj praktykę z lekarzem. Fragmentacja snu może nasilać objawy.',
  'Suplementy i leki (np. galantamina badana przez LaBerge’a) to substancje z działaniami ubocznymi – nie stosuj bez konsultacji lekarskiej. Somnia ich nie zaleca.',
  'Jeśli koszmary są częste i męczące, świadome śnienie i terapia wyobrażeniowa (IRT) mogą pomóc – ale warto robić to z terapeutą.',
];

const STOPWORDS = new Set(('a aby ale bo by byc być był była było byli były bym coś co czy dla do gdy gdzie go i ich im jak jakby jakiś jakieś jako jej jest jestem jego już ja je jeszcze juz kiedy kto która które który ku lub ma mam mi mnie mną moja moje mój może mu my na nad nam nas nawet nic nie niej nim no o od oraz po pod potem przed przez przy sie się są ta tak taki takie tam te tego tej ten też to tu tylko tym u w we wiec więc wszystko z za ze że żeby zaś było była byłem byłam miałem miałam mieli miał miała coś ktoś która było jakoś trochę bardzo potem nagle wtedy tylko ponieważ czyli jednak który której którym którego mój moim moją mojej swoje swój swoją sobie siebie oni ona ono on wy ty was wam tobą tobie cię ciebie tez też jakaś jakiegoś jakimś bylo byla bylem bylam juz').split(' '));
