<?php
declare(strict_types=1);
require __DIR__ . '/app.php';
require dirname(__DIR__) . '/lib/content.php';

if (!has_users()) {
    redirect('setup.php');
}
$user = current_user();
if (!$user) {
    redirect('./');
}
if (!can('publish', $user)) {
    http_response_code(403);
    exit('Geen toegang.');
}

$notice = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = (string)($_POST['action'] ?? '');
    if ($action === 'run_weekly') {
        $notice = generate_weekly_posts(true);
    } elseif ($action === 'run_weather') {
        $notice = run_weather_check(true);
    } elseif ($action === 'toggle') {
        $id = (int)($_POST['post_id'] ?? 0);
        content_db()->prepare("UPDATE posts SET status = CASE status WHEN 'published' THEN 'draft' ELSE 'published' END, published_at = CASE status WHEN 'published' THEN published_at ELSE CURRENT_TIMESTAMP END, updated_at = CURRENT_TIMESTAMP WHERE id = ?")->execute([$id]);
        $notice = ['message' => 'De zichtbaarheid is aangepast.'];
    } elseif ($action === 'delete') {
        $id = (int)($_POST['post_id'] ?? 0);
        content_db()->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]);
        $notice = ['message' => 'Het testbericht is verwijderd.'];
    }
}

$posts = content_db()->query('SELECT * FROM posts ORDER BY created_at DESC LIMIT 40')->fetchAll();
$logs = content_db()->query('SELECT * FROM automation_log ORDER BY id DESC LIMIT 20')->fetchAll();
?>
<!doctype html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Automatische tuintips · Dorado Proeftuin</title><link rel="stylesheet" href="style.css?v=1"><style>.actions{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0 30px}.automation-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.automation-card{background:#0b1b25;border:1px solid #173748;border-radius:16px;padding:22px}.automation-card h2{margin-top:0}.post-list{display:grid;gap:10px}.post-row{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;background:#0b1b25;border:1px solid #173748;border-radius:12px;padding:15px}.post-row small{display:block;color:#8ea6b5;margin-top:5px}.row-actions{display:flex;gap:8px}.row-actions form{margin:0}.log{font-family:monospace;font-size:12px;color:#a9bfca;border-bottom:1px solid #173748;padding:9px 0}.danger{color:#ff9e9e!important}@media(max-width:780px){.automation-grid{grid-template-columns:1fr}.post-row{grid-template-columns:1fr}.row-actions{flex-wrap:wrap}}</style></head>
<body>
  <header class="topbar"><a class="wordmark" href="../"><span>D</span> DORADO PROJECT</a><div class="account"><span><?= e($user['name']) ?> · Beheerder</span><a href="./">Dashboard</a><a href="logout.php">Uitloggen</a></div></header>
  <main class="dashboard">
    <section class="welcome"><div><p class="eyebrow">TUINDORADO-EXPERIMENT</p><h1>Automatische tuintips</h1><p>Test weekseries en weerregels zonder de echte Tuindorado-site te raken.</p></div><a class="secondary" href="../">Bekijk testsite</a></section>
    <?php if ($notice): ?><div class="notice <?= !empty($notice['error']) ? 'error' : 'success' ?>"><?= e($notice['message']) ?></div><?php endif; ?>
    <section class="automation-grid">
      <article class="automation-card"><span class="badge">3 PER WEEK</span><h2>Seizoenstips</h2><p>De normale automatische run maakt één unieke serie per kalenderweek. Met deze knop maak je expres een extra testserie.</p><form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="run_weekly"><button class="primary" type="submit">Maak 3 testtips</button></form></article>
      <article class="automation-card"><span class="badge">LIVE VERWACHTING</span><h2>Weerregels Drachten</h2><p>Controleert vorst ≤ 2 °C, hitte ≥ 27 °C, windstoten ≥ 60 km/u en een droge periode. Per regel verschijnt maximaal één bericht per dag.</p><form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="run_weather"><button class="primary" type="submit">Controleer het weer nu</button></form></article>
    </section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">CONTENTWACHTRIJ</p><h2>Berichten</h2></div><p>Hier kun je foutieve of dubbele proefberichten verbergen of verwijderen.</p></div><div class="post-list">
      <?php foreach ($posts as $post): ?><div class="post-row"><div><strong><?= e($post['title']) ?></strong><small><?= e($post['source_type']) ?> · <?= e($post['category']) ?> · <?= e($post['status']) ?> · <?= e($post['created_at']) ?></small></div><div class="row-actions"><form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="toggle"><input type="hidden" name="post_id" value="<?= (int)$post['id'] ?>"><button class="text-button" type="submit"><?= $post['status'] === 'published' ? 'Verbergen' : 'Publiceren' ?></button></form><form method="post" onsubmit="return confirm('Dit testbericht verwijderen?')"><input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="post_id" value="<?= (int)$post['id'] ?>"><button class="text-button danger" type="submit">Verwijderen</button></form></div></div><?php endforeach; ?>
      <?php if (!$posts): ?><p>Nog geen berichten aangemaakt.</p><?php endif; ?>
    </div></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">CONTROLE</p><h2>Automatiseringslogboek</h2></div><p>Fouten met weerdata of database worden hier zichtbaar.</p></div><?php foreach ($logs as $log): ?><div class="log">[<?= e($log['created_at']) ?>] <?= e(strtoupper($log['level'])) ?> · <?= e($log['event_type']) ?> — <?= e($log['message']) ?></div><?php endforeach; ?><?php if (!$logs): ?><p>Nog geen runs geregistreerd.</p><?php endif; ?></section>
  </main>
</body></html>

