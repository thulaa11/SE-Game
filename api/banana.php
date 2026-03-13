<?php
// Simple proxy for the external Banana API to avoid browser CORS issues.
// Returns the same CSV format as the original API: "<base64image>,<solution>"

header('Content-Type: text/plain; charset=utf-8');

$remoteUrl = 'https://marcconrad.com/uob/banana/api.php?out=csv&base64=yes';

// Prefer cURL for better error handling if available.
if (function_exists('curl_init')) {
    $ch = curl_init($remoteUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($response === false || $httpCode !== 200) {
        http_response_code(502);
        echo 'ERROR: Failed to fetch puzzle.';
        if ($curlErr) {
            error_log('[banana.php] cURL error: ' . $curlErr);
        }
        exit;
    }

    echo $response;
    exit;
}

// Fallback to file_get_contents if cURL is not available.
$context = stream_context_create([
    'http' => [
        'method'  => 'GET',
        'timeout' => 10,
    ],
]);

$response = @file_get_contents($remoteUrl, false, $context);

if ($response === false) {
    http_response_code(502);
    echo 'ERROR: Failed to fetch puzzle.';
    error_log('[banana.php] file_get_contents error while fetching Banana API.');
    exit;
}

echo $response;
exit;

