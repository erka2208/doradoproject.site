<?php
declare(strict_types=1);
require __DIR__ . '/lib/content.php';
$automationMessage = '';
try {
    run_due_automations();
} catch (Throwable $exception) {
    $automationMessage = 'Automatisering tijdelijk niet beschikbaar.';
}
$posts = public_posts(18);
?>
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#143a2a">
  <title>Tuindorado Tuincoach · Proeftuin</title>
  <meta name="description" content="Proeftuin voor automatische, seizoens- en weerafhankelijke tuintips.">
  <link rel="stylesheet" href="test.css?v=1">
</head>
<body>
  <header class="topbar"><a class="brand" href="./"><span>T</span> TUINDORADO PROEFTUIN</a><a class="admin-link" href="beheer/">Beheer</a></header>
  <main>
    <section class="hero">
      <div><p class="eyebrow">EXPERIMENT · NIET DE ECHTE TUINDORADO-SITE</p><h1>De automatische<br><em>tuincoach</em></h1><p class="lead">Drie verse weektips en extra waarschuwingen wanneer het weer daar aanleiding toe geeft. Deze omgeving is bedoeld om mogelijkheden én fouten zichtbaar te maken.</p></div>
      <aside class="status-card"><strong>Automatisering actief</strong><span>Weekadvies: 3 berichten</span><span>Weercontrole: elke 3 uur bij bezoek</span><span>Regio: <?= content_e(GARDEN_LOCATION) ?></span><?php if ($automationMessage): ?><small><?= content_e($automationMessage) ?></small><?php endif; ?></aside>
    </section>

    <section class="content-section">
      <div class="section-title"><div><p class="eyebrow">NU IN DE TUIN</p><h2>Actuele tuintips</h2></div><p>Automatisch samengesteld uit gecontroleerde regels en seizoenskennis.</p></div>
      <?php if (!$posts): ?>
        <div class="empty"><h3>Nog geen berichten</h3><p>Open het beheer om de eerste testserie te maken.</p></div>
      <?php else: ?>
      <div class="post-grid">
        <?php foreach ($posts as $post): ?>
        <article class="post-card <?= $post['source_type'] === 'weather' ? 'weather-card' : '' ?>">
          <div class="post-top"><span class="category"><?= content_e($post['category']) ?></span><span class="source"><?= $post['source_type'] === 'weather' ? 'Weergestuurd' : ($post['source_type'] === 'test' ? 'Handmatige test' : 'Weektip') ?></span></div>
          <h3><a href="post.php?slug=<?= rawurlencode($post['slug']) ?>"><?= content_e($post['title']) ?></a></h3>
          <p><?= content_e($post['excerpt']) ?></p>
          <?php if ($post['weather_summary']): ?><div class="weather-fact"><?= content_e($post['weather_summary']) ?></div><?php endif; ?>
          <a class="read-more" href="post.php?slug=<?= rawurlencode($post['slug']) ?>">Lees de tip →</a>
        </article>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </section>

    <section class="explain">
      <div><p class="eyebrow">WAT TESTEN WE?</p><h2>Automatisch, maar niet gedachteloos.</h2></div>
      <div class="explain-grid"><p><strong>Seizoen</strong>De kennisbank kiest drie passende onderwerpen voor de huidige maand en voorkomt dubbele weekseries.</p><p><strong>Weer</strong>Vorst, hitte, harde wind en droogte hebben duidelijke drempels. Alleen bij een nieuwe situatie verschijnt een bericht.</p><p><strong>Controle</strong>In het beheer zijn berichten, bronnen en foutmeldingen zichtbaar. Zo leren we waar menselijke goedkeuring nodig blijft.</p></div>
    </section>
  </main>
  <footer><span>Tuindorado Proeftuin</span><span>Geen definitieve website · geen verkoopadvies</span></footer>
</body>
</html>

