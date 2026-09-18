<?php
declare(strict_types=1);
require __DIR__ . '/lib/content.php';
$slug = (string)($_GET['slug'] ?? '');
$post = find_post($slug);
if (!$post) {
    http_response_code(404);
}
?>
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive">
  <title><?= $post ? content_e($post['title']) : 'Bericht niet gevonden' ?> · Tuindorado Proeftuin</title>
  <link rel="stylesheet" href="test.css?v=1">
</head>
<body>
  <header class="topbar"><a class="brand" href="./"><span>T</span> TUINDORADO PROEFTUIN</a><a class="admin-link" href="beheer/">Beheer</a></header>
  <main class="article-shell">
  <?php if (!$post): ?>
    <article class="article"><p class="eyebrow">404</p><h1>Dit bericht bestaat niet.</h1><p><a href="./">Terug naar alle tuintips</a></p></article>
  <?php else: ?>
    <article class="article">
      <a class="back" href="./">← Alle tuintips</a><p class="eyebrow"><?= content_e($post['category']) ?> · <?= $post['source_type'] === 'weather' ? 'WEERGESTUURD' : 'WEEKTIP' ?></p>
      <h1><?= content_e($post['title']) ?></h1><p class="article-intro"><?= content_e($post['excerpt']) ?></p>
      <?php if ($post['weather_summary']): ?><div class="weather-fact large"><?= content_e($post['weather_summary']) ?></div><?php endif; ?>
      <?php foreach (preg_split('/\n\s*\n/', trim($post['content'])) as $paragraph): ?><p><?= content_e($paragraph) ?></p><?php endforeach; ?>
      <div class="note"><strong>Proeftuinbericht</strong>Deze tip is automatisch geplaatst om de techniek te testen. Controleer bij twijfel altijd wat voor jouw specifieke plant en standplaats geldt.</div>
    </article>
  <?php endif; ?>
  </main>
</body>
</html>

