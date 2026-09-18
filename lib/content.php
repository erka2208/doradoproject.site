<?php
declare(strict_types=1);

const GARDEN_LOCATION = 'Drachten';
const GARDEN_LATITUDE = 53.1125;
const GARDEN_LONGITUDE = 6.0989;

function content_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    if (!extension_loaded('pdo_sqlite')) {
        throw new RuntimeException('De SQLite-uitbreiding staat niet aan op deze server.');
    }

    $dataDir = dirname(__DIR__) . '/beheer/data';
    if (!is_dir($dataDir) && !mkdir($dataDir, 0770, true) && !is_dir($dataDir)) {
        throw new RuntimeException('De gegevensmap kan niet worden aangemaakt.');
    }

    $pdo = new PDO('sqlite:' . $dataDir . '/proeftuin.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_key TEXT NOT NULL UNIQUE,
            source_type TEXT NOT NULL,
            title TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            excerpt TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT "published" CHECK(status IN ("draft", "scheduled", "published")),
            weather_summary TEXT NULL,
            scheduled_for TEXT NULL,
            published_at TEXT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS automation_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS automation_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            event_type TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_posts_status_date ON posts(status, published_at, scheduled_for)');
    return $pdo;
}

function content_e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function setting_get(string $key, ?string $default = null): ?string
{
    $stmt = content_db()->prepare('SELECT setting_value FROM automation_settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false ? $default : (string)$value;
}

function setting_set(string $key, string $value): void
{
    $stmt = content_db()->prepare(
        'INSERT INTO automation_settings (setting_key, setting_value) VALUES (?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([$key, $value]);
}

function automation_log(string $level, string $eventType, string $message): void
{
    $stmt = content_db()->prepare('INSERT INTO automation_log (level, event_type, message) VALUES (?, ?, ?)');
    $stmt->execute([$level, $eventType, $message]);
}

function slugify(string $title): string
{
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $title) ?: $title;
    $slug = strtolower(trim((string)preg_replace('/[^a-zA-Z0-9]+/', '-', $ascii), '-'));
    return $slug !== '' ? $slug : 'tuinbericht-' . date('YmdHis');
}

function add_post(array $post): bool
{
    $slug = slugify($post['title']);
    $suffix = 2;
    $base = $slug;
    while (true) {
        $stmt = content_db()->prepare('SELECT COUNT(*) FROM posts WHERE slug = ? AND source_key <> ?');
        $stmt->execute([$slug, $post['source_key']]);
        if ((int)$stmt->fetchColumn() === 0) {
            break;
        }
        $slug = $base . '-' . $suffix++;
    }

    $stmt = content_db()->prepare(
        'INSERT OR IGNORE INTO posts
        (source_key, source_type, title, slug, excerpt, content, category, status, weather_summary, scheduled_for, published_at)
        VALUES (:source_key, :source_type, :title, :slug, :excerpt, :content, :category, :status, :weather_summary, :scheduled_for, :published_at)'
    );
    $stmt->execute([
        ':source_key' => $post['source_key'],
        ':source_type' => $post['source_type'],
        ':title' => $post['title'],
        ':slug' => $slug,
        ':excerpt' => $post['excerpt'],
        ':content' => $post['content'],
        ':category' => $post['category'],
        ':status' => $post['status'] ?? 'published',
        ':weather_summary' => $post['weather_summary'] ?? null,
        ':scheduled_for' => $post['scheduled_for'] ?? null,
        ':published_at' => $post['published_at'] ?? date('Y-m-d H:i:s'),
    ]);
    return $stmt->rowCount() > 0;
}

function weekly_topics(int $month): array
{
    $topics = [
        1 => [
            ['Controleer vorstschade zonder te haasten', 'Winter', 'Niet iedere bruine tak is verloren. Zo controleer je rustig wat echt beschadigd is.', "Wacht met stevig snoeien tot een vorstvrije periode. Kras heel voorzichtig een klein stukje bast weg: groen daaronder betekent dat de tak nog leeft. Verwijder alleen duidelijk dood of gebroken hout. Bescherm potten tegen langdurige vorst en geef op vorstvrije dagen spaarzaam water."],
            ['Maak je snoeigereedschap klaar', 'Snoeien', 'Schoon en scherp gereedschap maakt straks een zichtbaar verschil.', "Reinig snoeischaren en zagen, verwijder hars en slijp botte snijvlakken. Ontsmet het gereedschap tussen zieke planten door. Controleer ook veren, sluitingen en handgrepen. Een scherpe schaar geeft een nette wond en vraagt minder kracht."],
            ['Geef kamerplanten winterrust', 'Binnen', 'Minder licht betekent meestal ook minder water en voeding.', "Voel eerst of de potgrond enkele centimeters droog is. Geef daarna pas water en laat geen laag water in de sierpot staan. Zet planten niet tegen een koude ruit of direct boven de verwarming. Wacht met voeding tot de groei in het voorjaar aantrekt."],
        ],
        2 => [
            ['Snoei alleen wat nu echt mag', 'Snoeien', 'Februari is geschikt voor sommige struiken, maar beslist niet voor allemaal.', "Snoei op een droge, vorstvrije dag. Druif, blauwe regen en veel zomerbloeiende heesters kunnen nu vaak worden aangepakt. Laat voorjaarsbloeiers met rust: daarin zitten de bloemknoppen al klaar. Controleer altijd eerst de soort."],
            ['Help vroege bloeiers op gang', 'Voorjaar', 'Een kleine opruimbeurt maakt licht en ruimte voor nieuw groen.', "Haal nat blad voorzichtig weg rond sneeuwklokjes, krokussen en helleborus. Knip oud helleborusblad laag weg wanneer de bloemen verschijnen. Werk niet in kletsnatte grond; zo voorkom je verdichting en schade aan jonge scheuten."],
            ['Start rustig met voorzaaien', 'Moestuin', 'Begin klein en voorkom lange, slappe zaailingen op de vensterbank.', "Zaai alleen soorten die vroeg moeten beginnen en zet ze zo licht mogelijk. Houd de grond vochtig maar niet drijfnat. Draai bakjes regelmatig. Heb je weinig licht, wacht dan liever nog even: later gezaaide planten halen de vroege starters vaak snel in."],
        ],
        3 => [
            ['Knip siergrassen nu terug', 'Snoeien', 'Het oude blad mag weg voordat de nieuwe sprieten ertussen verschijnen.', "Bind grote pollen eerst losjes samen en knip het oude blad ongeveer 10 tot 15 centimeter boven de grond af. Draag handschoenen; veel grassoorten hebben scherpe bladranden. Haal dood materiaal uit het hart zonder nieuwe scheuten te beschadigen."],
            ['Geef het gazon een rustige start', 'Gazon', 'Wacht tot de bodem niet meer drassig is voordat je aan de slag gaat.', "Hark blad en losse resten weg en maai pas wanneer het gras zichtbaar groeit. Zet de maaier in het begin wat hoger. Kale plekken kun je bijzaaien zodra de bodem voldoende is opgewarmd. Bemest niet vlak voor zware regen."],
            ['Zet vaste planten weer in het licht', 'Voorjaar', 'Ruim afgestorven stengels op, maar kijk eerst of er nog insecten in overwinteren.', "Knip oude stengels in delen en leg een klein deel losjes op een rustige plek. Zo krijgen overwinterende insecten tijd om tevoorschijn te komen. Werk voorzichtig rond jonge neuzen en verdeel grote pollen alleen als de grond goed bewerkbaar is."],
        ],
        4 => [
            ['Bescherm jong groen tegen late nachtvorst', 'Weer', 'Een heldere lentedag kan nog steeds eindigen met vorst aan de grond.', "Zet kwetsbare potten tijdelijk beschut en dek jonge scheuten 's avonds losjes af met vliesdoek. Gebruik geen dicht plastic direct op het blad. Haal de bescherming overdag weer weg voor licht en ventilatie."],
            ['Snoei lavendel met beleid', 'Snoeien', 'Terugsnoeien houdt lavendel compact, maar knip niet diep in kaal oud hout.', "Wacht tot je nieuwe groene groei ziet. Knip ongeveer een derde terug en blijf boven het laagste groene blad. Verwijder dode takjes afzonderlijk. Staat de plant op een natte plek, verbeter dan vooral de afwatering."],
            ['Maak potten klaar voor het buitenseizoen', 'Potten', 'Schone drainage voorkomt verrassend veel problemen.', "Controleer gaten onderin de pot en verwijder oude wortelresten. Gebruik verse potgrond die bij de plant past en laat altijd ruimte onder de rand voor water geven. Laat kuipplanten geleidelijk wennen aan zon en wind."],
        ],
        5 => [
            ['Na IJsheiligen veilig naar buiten', 'Zomerbloeiers', 'Kijk niet alleen naar de kalender, maar ook naar de lokale nachttemperatuur.', "Laat zomerbloeiers en kuipplanten eerst enkele dagen wennen op een beschutte plek. Bouw zonuren rustig op om bladverbranding te voorkomen. Houd vliesdoek bij de hand wanneer toch een koude nacht wordt voorspeld."],
            ['Geef pas water als de plant het nodig heeft', 'Water geven', 'Diep en minder vaak water geven werkt meestal beter dan dagelijks een klein beetje.', "Voel vijf centimeter diep in de grond. Geef bij droogte liefst vroeg in de ochtend direct bij de wortels. Een flinke gietbeurt stimuleert diepere wortels. Potten en nieuwe aanplant vragen vaker controle dan planten die al jaren vaststaan."],
            ['Knip uitgebloeide bloemen weg', 'Bloeiers', 'Regelmatig toppen verlengt bij veel soorten de bloei.', "Knip de bloemstengel terug tot boven een gezond blad of een nieuwe knop. Laat bloemen staan als je zaad wilt verzamelen of vogels wilt helpen. Gebruik schoon gereedschap en verwijder ziek plantmateriaal uit de tuin."],
        ],
        6 => [
            ['Snoei hagen zonder vogelnesten te storen', 'Snoeien', 'Controleer de hele haag voordat de heggenschaar aangaat.', "Zoek zorgvuldig naar actieve nesten en stel snoei uit zodra je er een vindt. Werk op een bewolkte dag om bladverbranding te beperken. Knip de haag boven iets smaller dan onder, zodat ook de onderkant voldoende licht krijgt."],
            ['Houd potplanten koel en gelijkmatig vochtig', 'Potten', 'Warme potten drogen sneller uit dan de border.', "Controleer dagelijks met je vinger en geef vroeg water tot het onder uit de pot loopt. Laat wortels niet langdurig in een volle onderschotel staan. Groepeer potten op hete dagen en geef mediterrane planten een luchtige, goed drainerende plek."],
            ['Help de tuin door een droge week', 'Water geven', 'Richt water op planten die het echt nodig hebben.', "Geef voorrang aan nieuwe aanplant, potten, moestuin en planten met slap blad. Geef langzaam en bij de wortel. Een mulchlaag beperkt verdamping, maar leg die niet strak tegen stammen of stengels. Gevestigde planten hoeven niet allemaal dagelijks water."],
        ],
        7 => [
            ['Geef de tuin water vóór de hitte', 'Water geven', 'Vroeg in de ochtend gaat er minder water verloren door verdamping.', "Geef langzaam en grondig bij de wortels. Verplaats kwetsbare potten uit de felle middagzon en controleer hangpotten extra. Sproei niet automatisch het hele gazon; richt je op jonge aanplant en planten die zichtbaar stress hebben."],
            ['Snoei de blauwe regen na de bloei', 'Snoeien', 'Kort lange zweepscheuten in voor een compacte plant en meer bloemknoppen.', "Knip de lange nieuwe zijscheuten terug tot ongeveer vijf à zes bladeren vanaf de hoofdtak. Laat de hoofdranken staan. Controleer de bevestiging en verwijder scheuten die onder dakpannen of achter regenpijpen groeien."],
            ['Oogst kruiden voor de beste smaak', 'Moestuin', 'Veel kruiden zijn het krachtigst vlak voordat ze volop bloeien.', "Oogst op een droge ochtend nadat de dauw is verdwenen. Knip niet meer dan ongeveer een derde van de plant tegelijk. Zet zachte kruiden direct in water of verwerk ze dezelfde dag. Laat ook wat bloemen staan voor insecten."],
        ],
        8 => [
            ['Knip lavendel na de bloei', 'Snoeien', 'Een lichte zomersnoei houdt de plant netjes zonder nieuwe groei te forceren.', "Verwijder uitgebloeide aren en knip een klein stukje van het jonge groen mee. Blijf uit het kale hout. Geef alleen extra water bij langdurige droogte en zorg dat overtollig water snel kan weglopen."],
            ['Geef tomaten lucht en regelmaat', 'Moestuin', 'Gelijkmatig water en goede ventilatie beperken problemen.', "Geef bij de grond en voorkom nat blad. Verwijder alleen blad dat de luchtcirculatie echt belemmert en pluk rijpe vruchten op tijd. Grote schommelingen in watergift kunnen barsten en neusrot verergeren."],
            ['Bereid lege plekken voor op het najaar', 'Vooruitkijken', 'Augustus is een goed moment om te bekijken waar straks bollen of vaste planten kunnen komen.', "Maak foto's van kale plekken terwijl de tuin nog vol staat. Noteer zon, schaduw en bodemvocht. Verbeter arme grond met organisch materiaal, maar wacht met planten tijdens extreme hitte of droogte."],
        ],
        9 => [
            ['Plant vaste planten in warme najaarsgrond', 'Planten', 'De bodem is nog warm en regen helpt nieuwe wortels op weg.', "Maak het plantgat ruim, zet de plant even diep als in de pot en geef direct goed water. Blijf de eerste weken controleren bij droog weer. Plant niet in kletsnatte grond en kies een plek die bij zon- en vochtbehoefte past."],
            ['Zaai kale plekken in het gazon bij', 'Gazon', 'Koelere nachten en vochtige grond helpen graszaad kiemen.', "Maai kort, hark dood materiaal weg en maak de bovenlaag los. Verdeel geschikt graszaad gelijkmatig, druk licht aan en houd de plek vochtig tot het gras goed opkomt. Loop er zo weinig mogelijk overheen."],
            ['Begin met voorjaarsbollen', 'Bollen', 'Vroege planning geeft straks maanden kleur.', "Plant bollen op een goed drainerende plek, meestal twee tot drie keer zo diep als de bol hoog is. Zet de punt omhoog en combineer bloeitijden. Markeer de plek zodat je er later niet per ongeluk doorheen spit."],
        ],
        10 => [
            ['Laat gezond herfstblad voor je werken', 'Herfst', 'Blad is bescherming, voedsel en schuilplaats — behalve waar het verstikt of glad wordt.', "Haal dik blad van gazon, paden en wintergroene rozetten. Verdeel gezond blad dun onder hagen en tussen vaste planten. Ziek blad en blad van aangetaste rozen kun je beter apart afvoeren."],
            ['Maak kuipplanten klaar voor de winter', 'Winterklaar', 'Wacht niet tot de eerste onverwachte vorstnacht.', "Controleer planten op plagen, verwijder dood blad en zoek een lichte, koele overwinteringsplek. Geef in de winter spaarzaam water. Planten die buiten blijven zet je uit de wind en van de koude bestrating af."],
            ['Plant bomen en struiken op het juiste moment', 'Planten', 'Zolang de grond niet bevroren of doorweekt is, kan het najaar ideaal zijn.', "Maak een breed plantgat, verbeter de afwatering waar nodig en plant niet dieper dan de oorspronkelijke grondlijn. Geef ruim water, ook als het later regent. Een boompaal ondersteunt, maar mag de stam niet strak vastzetten."],
        ],
        11 => [
            ['Bescherm mediterrane potplanten tegen vorst', 'Winterklaar', 'Vooral natte wortels en koude wind zijn riskant voor planten in pot.', "Zet potten beschut tegen het huis, van de grond af en controleer de afwatering. Wikkel de pot in isolerend materiaal en gebruik ademend vliesdoek rond het blad bij vorst. Pak de plant niet wekenlang luchtdicht in."],
            ['Maak de regenton winterklaar', 'Water', 'Een volle ton en bevroren koppelingen gaan slecht samen.', "Sluit de toevoer af wanneer strenge vorst wordt verwacht, maak kwetsbare slangen en kranen leeg en controleer of water weg kan. Een stevige ton kan vaak gedeeltelijk gevuld blijven, maar volg altijd de aanwijzingen van de fabrikant."],
            ['Laat uitgebloeide stengels deels staan', 'Natuur', 'Zaadhoofden geven structuur én voedsel en schuilruimte voor dieren.', "Laat stevige, gezonde stengels staan tot het voorjaar. Verwijder wel slap of ziek materiaal. Bind hoge pollen losjes bij elkaar als ze over paden vallen. Zo blijft de tuin netjes zonder alle winterwaarde weg te knippen."],
        ],
        12 => [
            ['Geef groen een veilige kerstplek', 'Binnen', 'Kamerplanten houden niet van hete radiatoren, koude tocht of knipperende lichtsnoeren.', "Zet planten niet pal naast de verwarming of buitendeur. Controleer potgrond voordat je water geeft en zorg dat sierverlichting geen warmte afgeeft tegen het blad. Houd giftige planten en losse decoratie buiten bereik van kinderen en huisdieren."],
            ['Controleer potten na storm en vorst', 'Winter', 'Een korte ronde voorkomt omwaaien, wortelschade en natte voeten.', "Zet hoge potten beschut en controleer of afwateringsgaten open zijn. Verwijder gebroken takken netjes, maar stel grote snoei uit. Druk losgewaaide kluiten voorzichtig aan en geef alleen water op een vorstvrije dag als de grond droog is."],
            ['Maak een tuinplan met drie simpele foto’s', 'Vooruitkijken', 'De rustige wintermaand is ideaal om keuzes voor het voorjaar vast te leggen.', "Fotografeer de tuin vanuit drie vaste punten. Noteer waar kleur, privacy of zitruimte ontbreekt en hoeveel zon elke plek krijgt. Kies daarna hooguit drie prioriteiten. Een kort plan voorkomt losse aankopen die later nergens goed passen."],
        ],
    ];
    return $topics[$month] ?? $topics[9];
}

function generate_weekly_posts(bool $force = false): array
{
    $week = date('o-\\WW');
    if (!$force && setting_get('last_weekly_batch') === $week) {
        return ['created' => 0, 'message' => 'De drie weektips voor ' . $week . ' bestaan al.'];
    }

    $created = 0;
    $topics = weekly_topics((int)date('n'));
    foreach ($topics as $index => [$title, $category, $excerpt, $body]) {
        $sourceKey = 'weekly:' . $week . ':' . ($index + 1);
        if ($force) {
            $sourceKey .= ':test-' . date('YmdHis');
        }
        if (add_post([
            'source_key' => $sourceKey,
            'source_type' => $force ? 'test' : 'weekly',
            'title' => $title,
            'excerpt' => $excerpt,
            'content' => $body,
            'category' => $category,
            'status' => 'published',
            'published_at' => date('Y-m-d H:i:s', time() + ($index * 60)),
        ])) {
            $created++;
        }
    }
    setting_set('last_weekly_batch', $week);
    automation_log('success', 'weekly', $created . ' weektips aangemaakt voor ' . $week . '.');
    return ['created' => $created, 'message' => $created . ' weektips aangemaakt.'];
}

function fetch_weather(): array
{
    $query = http_build_query([
        'latitude' => GARDEN_LATITUDE,
        'longitude' => GARDEN_LONGITUDE,
        'daily' => 'temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max',
        'timezone' => 'Europe/Amsterdam',
        'forecast_days' => 7,
        'wind_speed_unit' => 'kmh',
    ]);
    $context = stream_context_create(['http' => ['timeout' => 4, 'user_agent' => 'Tuindorado-Proeftuin/1.0']]);
    $json = @file_get_contents('https://api.open-meteo.com/v1/forecast?' . $query, false, $context);
    if ($json === false) {
        throw new RuntimeException('De weersverwachting kon niet worden opgehaald.');
    }
    $weather = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    if (empty($weather['daily']['time'])) {
        throw new RuntimeException('De weersverwachting bevat geen daggegevens.');
    }
    return $weather['daily'];
}

function weather_rules(array $daily): array
{
    $dates = array_slice($daily['time'], 0, 5);
    $mins = array_map('floatval', array_slice($daily['temperature_2m_min'], 0, 5));
    $maxes = array_map('floatval', array_slice($daily['temperature_2m_max'], 0, 5));
    $rain = array_map('floatval', array_slice($daily['precipitation_sum'], 0, 5));
    $wind = array_map('floatval', array_slice($daily['wind_gusts_10m_max'], 0, 5));
    $rules = [];

    $coldest = min($mins);
    $coldIndex = array_search($coldest, $mins, true);
    if ($coldest <= 2.0) {
        $date = date('d-m', strtotime($dates[$coldIndex]));
        $rules[] = [
            'frost',
            'Bescherm je olijfboom: koude nacht op komst',
            'De verwachting voor ' . GARDEN_LOCATION . ' daalt rond ' . $date . ' naar ' . number_format($coldest, 1, ',', '.') . ' °C.',
            "Zet een olijfboom in pot beschut tegen het huis en haal de pot van de koude grond. Wikkel vooral de pot en kluit isolerend in. Gebruik rond de kroon alleen ademend vliesdoek en haal dat bij zachter weer weer los. Controleer eerst of de pot goed afwatert: koude én natte wortels vormen vaak het grootste risico.",
            'Vorstsignaal: minimum ' . number_format($coldest, 1, ',', '.') . ' °C op ' . $date,
        ];
    }

    $highest = max($maxes);
    if ($highest >= 27.0) {
        $rules[] = [
            'heat',
            'Hitte op komst: geef gericht en vroeg water',
            'Binnen vijf dagen wordt in ' . GARDEN_LOCATION . ' ongeveer ' . number_format($highest, 1, ',', '.') . ' °C verwacht.',
            "Geef vroeg in de ochtend langzaam water bij de wortels. Geef voorrang aan potten, hangmanden, moestuin en jonge aanplant. Verplaats kwetsbare potplanten tijdelijk uit de hete middagzon. Dagelijks een klein scheutje is meestal minder effectief dan minder vaak en grondig water geven.",
            'Hittesignaal: maximum ' . number_format($highest, 1, ',', '.') . ' °C',
        ];
    }

    $gust = max($wind);
    if ($gust >= 60.0) {
        $rules[] = [
            'wind',
            'Harde wind verwacht: zet losse tuinspullen vast',
            'Voor ' . GARDEN_LOCATION . ' worden windstoten tot ongeveer ' . round($gust) . ' km/u verwacht.',
            "Zet hoge potten laag en beschut, klap parasols in en controleer lichte tuinmeubelen, doeken en plantensteunen. Bind bomen niet star vast: een brede boomband moet enige beweging toestaan. Wacht met snoeien tot na de harde wind en verwijder daarna gebroken takken met schoon gereedschap.",
            'Windsignaal: windstoten tot circa ' . round($gust) . ' km/u',
        ];
    }

    $rainTotal = array_sum($rain);
    if ($rainTotal <= 2.0 && max($maxes) >= 18.0) {
        $rules[] = [
            'dry',
            'Droge dagen voor de boeg: controleer jonge aanplant',
            'Voor de komende vijf dagen wordt in ' . GARDEN_LOCATION . ' samen ongeveer ' . number_format($rainTotal, 1, ',', '.') . ' mm regen verwacht.',
            "Controleer jonge bomen, struiken, vaste planten en potten door enkele centimeters diep te voelen. Geef alleen waar de grond echt droog is en laat het water langzaam bij de wortels intrekken. Een mulchlaag helpt vocht vasthouden, maar houd de stamvoet vrij.",
            'Droogtesignaal: circa ' . number_format($rainTotal, 1, ',', '.') . ' mm in vijf dagen',
        ];
    }
    return $rules;
}

function run_weather_check(bool $force = false): array
{
    $last = setting_get('last_weather_check');
    if (!$force && $last && strtotime($last) > time() - 3 * 3600) {
        return ['created' => 0, 'message' => 'Het weer is minder dan drie uur geleden gecontroleerd.'];
    }
    try {
        $daily = fetch_weather();
        $created = 0;
        foreach (weather_rules($daily) as [$key, $title, $excerpt, $body, $summary]) {
            if (add_post([
                'source_key' => 'weather:' . $key . ':' . date('Y-m-d'),
                'source_type' => 'weather',
                'title' => $title,
                'excerpt' => $excerpt,
                'content' => $body,
                'category' => 'Weerbericht',
                'weather_summary' => $summary,
                'status' => 'published',
            ])) {
                $created++;
            }
        }
        setting_set('last_weather_check', date(DATE_ATOM));
        automation_log('success', 'weather', $created . ' nieuwe weerberichten; ' . count(weather_rules($daily)) . ' regels actief.');
        return ['created' => $created, 'message' => $created . ' nieuw(e) weerbericht(en) aangemaakt.'];
    } catch (Throwable $exception) {
        automation_log('error', 'weather', $exception->getMessage());
        return ['created' => 0, 'message' => $exception->getMessage(), 'error' => true];
    }
}

function run_due_automations(): void
{
    content_db()->exec("UPDATE posts SET status = 'published', published_at = COALESCE(published_at, scheduled_for), updated_at = CURRENT_TIMESTAMP WHERE status = 'scheduled' AND scheduled_for <= CURRENT_TIMESTAMP");
    if (setting_get('last_weekly_batch') !== date('o-\\WW')) {
        generate_weekly_posts(false);
    }
    run_weather_check(false);
}

function public_posts(int $limit = 12): array
{
    $stmt = content_db()->prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY COALESCE(published_at, created_at) DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function find_post(string $slug): ?array
{
    $stmt = content_db()->prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$slug]);
    $post = $stmt->fetch();
    return $post ?: null;
}

