<?php
declare(strict_types=1);

const APP_NAME = 'Dorado Proeftuin';

if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Strict',
        'path' => '/',
    ]);
    session_start();
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    if (!extension_loaded('pdo_sqlite')) {
        throw new RuntimeException('De SQLite-uitbreiding staat niet aan op deze server.');
    }

    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir) && !mkdir($dataDir, 0770, true) && !is_dir($dataDir)) {
        throw new RuntimeException('De gegevensmap kan niet worden aangemaakt.');
    }

    $pdo = new PDO('sqlite:' . $dataDir . '/proeftuin.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ("beheerder", "redacteur", "tester", "alleen_lezen")),
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_login_at TEXT NULL
        )'
    );
    $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(active, role)');
    $pdo->exec('PRAGMA optimize');

    return $pdo;
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(): void
{
    $sent = (string)($_POST['csrf_token'] ?? '');
    if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
        throw new RuntimeException('Deze pagina was te lang open. Vernieuw de pagina en probeer opnieuw.');
    }
}

function has_users(): bool
{
    return (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;
}

function current_user(): ?array
{
    static $loaded = false;
    static $user = null;
    if ($loaded) {
        return $user;
    }
    $loaded = true;

    $id = (int)($_SESSION['user_id'] ?? 0);
    if ($id < 1) {
        return null;
    }

    $stmt = db()->prepare('SELECT id, name, email, role, active, created_at, last_login_at FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row || (int)$row['active'] !== 1) {
        unset($_SESSION['user_id']);
        return null;
    }
    $user = $row;
    return $user;
}

function sign_in(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    db()->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([(int)$user['id']]);
}

function attempt_login(string $email, string $password): bool
{
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? AND active = 1 LIMIT 1');
    $stmt->execute([trim($email)]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        usleep(350000);
        return false;
    }
    sign_in($user);
    return true;
}

function role_label(string $role): string
{
    return [
        'beheerder' => 'Beheerder',
        'redacteur' => 'Redacteur',
        'tester' => 'Tester',
        'alleen_lezen' => 'Alleen lezen',
    ][$role] ?? $role;
}

function can(string $permission, ?array $user = null): bool
{
    $user ??= current_user();
    if (!$user) {
        return false;
    }
    $permissions = [
        'beheerder' => ['users', 'drafts', 'edit', 'publish', 'integrations'],
        'redacteur' => ['drafts', 'edit'],
        'tester' => ['drafts'],
        'alleen_lezen' => [],
    ];
    return in_array($permission, $permissions[$user['role']] ?? [], true);
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function take_flash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return is_array($flash) ? $flash : null;
}

function redirect(string $path): never
{
    header('Location: ' . $path, true, 303);
    exit;
}

