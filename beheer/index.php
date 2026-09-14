<?php
declare(strict_types=1);
require __DIR__ . '/app.php';

try {
    if (!has_users()) {
        redirect('setup.php');
    }

    $loginError = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'login') {
        verify_csrf();
        if (attempt_login((string)($_POST['email'] ?? ''), (string)($_POST['password'] ?? ''))) {
            redirect('./');
        }
        $loginError = 'E-mailadres of wachtwoord klopt niet.';
    }

    $user = current_user();
    if (!$user):
?>
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#061018">
  <title>Inloggen · Dorado Proeftuin</title>
  <link rel="stylesheet" href="style.css?v=1">
</head>
<body class="auth-page">
  <main class="auth-shell">
    <section class="auth-card">
      <a class="wordmark" href="../"><span>D</span> DORADO PROJECT</a>
      <p class="eyebrow">AFGESCHERMDE PROEFTUIN</p>
      <h1>Inloggen</h1>
      <p class="intro">Nieuwe onderdelen bekijken en testen voordat ze op de gewone website verschijnen.</p>
      <?php if ($loginError !== ''): ?><div class="notice error"><?= e($loginError) ?></div><?php endif; ?>
      <form method="post" class="form-stack">
        <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="login">
        <label>E-mailadres<input name="email" type="email" required autocomplete="username" autofocus></label>
        <label>Wachtwoord<input name="password" type="password" required autocomplete="current-password"></label>
        <button class="primary" type="submit">Inloggen</button>
      </form>
    </section>
  </main>
</body>
</html>
<?php
        exit;
    endif;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        if (!can('users', $user)) {
            throw new RuntimeException('Je hebt geen rechten om gebruikers te beheren.');
        }
        $action = (string)($_POST['action'] ?? '');

        if ($action === 'add_user') {
            $name = trim((string)($_POST['name'] ?? ''));
            $email = strtolower(trim((string)($_POST['email'] ?? '')));
            $role = (string)($_POST['role'] ?? 'alleen_lezen');
            $password = (string)($_POST['password'] ?? '');
            $validRoles = ['beheerder', 'redacteur', 'tester', 'alleen_lezen'];
            if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new RuntimeException('Vul een naam en geldig e-mailadres in.');
            }
            if (!in_array($role, $validRoles, true)) {
                throw new RuntimeException('Deze gebruikersrol bestaat niet.');
            }
            if (strlen($password) < 12) {
                throw new RuntimeException('Het tijdelijke wachtwoord moet minimaal 12 tekens hebben.');
            }
            $stmt = db()->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
            $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $role]);
            flash('success', $name . ' is toegevoegd als ' . role_label($role) . '.');
        } elseif ($action === 'toggle_user') {
            $id = (int)($_POST['user_id'] ?? 0);
            if ($id === (int)$user['id']) {
                throw new RuntimeException('Je kunt je eigen account niet uitschakelen.');
            }
            db()->prepare('UPDATE users SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ?')->execute([$id]);
            flash('success', 'De toegang van deze gebruiker is aangepast.');
        } elseif ($action === 'update_role') {
            $id = (int)($_POST['user_id'] ?? 0);
            $role = (string)($_POST['role'] ?? '');
            if ($id === (int)$user['id']) {
                throw new RuntimeException('Je kunt je eigen beheerdersrol niet wijzigen.');
            }
            if (!in_array($role, ['beheerder', 'redacteur', 'tester', 'alleen_lezen'], true)) {
                throw new RuntimeException('Deze gebruikersrol bestaat niet.');
            }
            db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $id]);
            flash('success', 'De gebruikersrol is aangepast.');
        }
        redirect('./#gebruikers');
    }

    $allUsers = can('users', $user)
        ? db()->query('SELECT id, name, email, role, active, created_at, last_login_at FROM users ORDER BY active DESC, name')->fetchAll()
        : [];
    $flash = take_flash();
} catch (PDOException $exception) {
    $message = str_contains(strtolower($exception->getMessage()), 'unique')
        ? 'Dit e-mailadres bestaat al.'
        : 'De gegevens konden niet worden opgeslagen.';
    flash('error', $message);
    redirect('./#gebruikers');
} catch (Throwable $exception) {
    $fatalError = $exception->getMessage();
}
?>
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#061018">
  <title>Beheer · Dorado Proeftuin</title>
  <link rel="stylesheet" href="style.css?v=1">
</head>
<body>
  <header class="topbar">
    <a class="wordmark" href="../"><span>D</span> DORADO PROJECT</a>
    <div class="account"><span><?= e($user['name'] ?? '') ?> · <?= e(role_label($user['role'] ?? '')) ?></span><a href="logout.php">Uitloggen</a></div>
  </header>
  <main class="dashboard">
    <section class="welcome">
      <div><p class="eyebrow">PROEFTUIN</p><h1>Goedemorgen, <?= e(explode(' ', trim((string)($user['name'] ?? '')))[0] ?: 'Rutger') ?>.</h1><p>Hier verschijnen nieuwe onderdelen voordat ze naar de gewone site gaan.</p></div>
      <a class="secondary" href="../">Bekijk testsite</a>
    </section>

    <?php if (!empty($fatalError)): ?><div class="notice error"><?= e($fatalError) ?></div><?php endif; ?>
    <?php if (!empty($flash)): ?><div class="notice <?= e($flash['type']) ?>"><?= e($flash['message']) ?></div><?php endif; ?>

    <section class="feature-grid" aria-label="Onderdelen">
      <?php if (can('drafts', $user)): ?>
      <article class="feature-card"><span class="badge">Binnenkort</span><h2>Berichten en pagina’s</h2><p>Concepten bekijken, testen en later ter goedkeuring aanbieden.</p></article>
      <?php endif; ?>
      <?php if (can('edit', $user)): ?>
      <article class="feature-card"><span class="badge">Binnenkort</span><h2>Content maken</h2><p>Een blog, pagina of seizoensbericht toevoegen zonder technisch gedoe.</p></article>
      <?php endif; ?>
      <?php if (can('publish', $user)): ?>
      <article class="feature-card"><span class="badge">Beheerder</span><h2>Goedkeuren en publiceren</h2><p>Jij houdt de laatste knop: niets gaat vanzelf live zonder jouw akkoord.</p></article>
      <?php endif; ?>
      <?php if (can('integrations', $user)): ?>
      <article class="feature-card"><span class="badge">Later</span><h2>Koppelingen</h2><p>Kassa, webshop, weer, nieuwsbrief en sociale media komen hier samen.</p></article>
      <?php endif; ?>
      <?php if (!can('drafts', $user)): ?>
      <article class="feature-card"><span class="badge">Alleen lezen</span><h2>Welkom in de proeftuin</h2><p>Voor jouw account zijn nog geen testonderdelen zichtbaar.</p></article>
      <?php endif; ?>
    </section>

    <?php if (can('users', $user)): ?>
    <section class="panel" id="gebruikers">
      <div class="panel-heading"><div><p class="eyebrow">TOEGANG</p><h2>Gebruikers</h2></div><p>Voeg mensen toe en bepaal precies wat zij mogen zien.</p></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Naam</th><th>Rol</th><th>Status</th><th>Laatst ingelogd</th><th>Actie</th></tr></thead>
          <tbody>
          <?php foreach ($allUsers as $listed): ?>
            <tr>
              <td><strong><?= e($listed['name']) ?></strong><small><?= e($listed['email']) ?></small></td>
              <td>
                <?php if ((int)$listed['id'] === (int)$user['id']): ?><?= e(role_label($listed['role'])) ?>
                <?php else: ?>
                <form method="post" class="inline-form"><input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="update_role"><input type="hidden" name="user_id" value="<?= (int)$listed['id'] ?>"><select name="role" onchange="this.form.submit()"><?php foreach (['beheerder','redacteur','tester','alleen_lezen'] as $role): ?><option value="<?= e($role) ?>" <?= $role === $listed['role'] ? 'selected' : '' ?>><?= e(role_label($role)) ?></option><?php endforeach; ?></select></form>
                <?php endif; ?>
              </td>
              <td><span class="state <?= (int)$listed['active'] === 1 ? 'on' : 'off' ?>"><?= (int)$listed['active'] === 1 ? 'Actief' : 'Uitgeschakeld' ?></span></td>
              <td><?= $listed['last_login_at'] ? e(date('d-m-Y H:i', strtotime($listed['last_login_at']))) : 'Nog niet' ?></td>
              <td><?php if ((int)$listed['id'] !== (int)$user['id']): ?><form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="toggle_user"><input type="hidden" name="user_id" value="<?= (int)$listed['id'] ?>"><button class="text-button" type="submit"><?= (int)$listed['active'] === 1 ? 'Uitschakelen' : 'Activeren' ?></button></form><?php else: ?>Jijzelf<?php endif; ?></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>

      <details class="add-user">
        <summary>Nieuwe gebruiker toevoegen</summary>
        <form method="post" class="user-form">
          <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="add_user">
          <label>Naam<input name="name" required autocomplete="off"></label>
          <label>E-mailadres<input name="email" type="email" required autocomplete="off"></label>
          <label>Rol<select name="role"><option value="tester">Tester</option><option value="redacteur">Redacteur</option><option value="alleen_lezen">Alleen lezen</option><option value="beheerder">Beheerder</option></select></label>
          <label>Tijdelijk wachtwoord<input name="password" type="password" required minlength="12" autocomplete="new-password"></label>
          <button class="primary" type="submit">Gebruiker toevoegen</button>
        </form>
      </details>
    </section>
    <?php endif; ?>
  </main>
</body>
</html>

