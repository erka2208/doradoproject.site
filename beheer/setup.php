<?php
declare(strict_types=1);
require __DIR__ . '/app.php';

try {
    if (has_users()) {
        redirect('./');
    }

    $error = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $name = trim((string)($_POST['name'] ?? ''));
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm_password'] ?? '');

        if ($name === '') {
            $error = 'Vul je naam in.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Vul een geldig e-mailadres in.';
        } elseif (strlen($password) < 12) {
            $error = 'Gebruik een wachtwoord van minimaal 12 tekens.';
        } elseif ($password !== $confirm) {
            $error = 'De twee wachtwoorden zijn niet gelijk.';
        } else {
            $stmt = db()->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "beheerder")');
            $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            sign_in(['id' => (int)db()->lastInsertId()]);
            flash('success', 'Je beheerdersaccount is aangemaakt.');
            redirect('./');
        }
    }
} catch (Throwable $exception) {
    $error = $exception->getMessage();
}
?>
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#061018">
  <title>Beheerder instellen · Dorado Proeftuin</title>
  <link rel="stylesheet" href="style.css?v=1">
</head>
<body class="auth-page">
  <main class="auth-shell">
    <section class="auth-card">
      <a class="wordmark" href="../"><span>D</span> DORADO PROJECT</a>
      <p class="eyebrow">EENMALIGE INSTALLATIE</p>
      <h1>Maak het eerste beheerdersaccount</h1>
      <p class="intro">Dit account krijgt alle rechten in de proeftuin. Zodra het is aangemaakt, wordt deze installatiepagina automatisch afgesloten.</p>
      <?php if ($error !== ''): ?><div class="notice error"><?= e($error) ?></div><?php endif; ?>
      <form method="post" class="form-stack" autocomplete="on">
        <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
        <label>Naam<input name="name" required autocomplete="name" value="<?= e((string)($_POST['name'] ?? 'Rutger Kussendrager')) ?>"></label>
        <label>E-mailadres<input name="email" type="email" required autocomplete="email" value="<?= e((string)($_POST['email'] ?? 'rutger@tuindorado.nl')) ?>"></label>
        <label>Nieuw wachtwoord<input name="password" type="password" required minlength="12" autocomplete="new-password"></label>
        <label>Herhaal wachtwoord<input name="confirm_password" type="password" required minlength="12" autocomplete="new-password"></label>
        <button class="primary" type="submit">Beheerdersaccount aanmaken</button>
      </form>
    </section>
  </main>
</body>
</html>

