<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/lib/content.php';

$weekly = generate_weekly_posts(false);
$weather = run_weather_check(false);

echo json_encode([
    'time' => date(DATE_ATOM),
    'weekly' => $weekly,
    'weather' => $weather,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;

exit(!empty($weather['error']) ? 1 : 0);

