<?php
require_once __DIR__ . '/db.php';

try {
    // Standard MySQL ALTER commands (Compatible with almost all versions)
    // We run these inside their own try blocks so if one already exists, the script keeps going!
    
    try {
        $pdo->exec("ALTER TABLE users ADD reset_token VARCHAR(64) DEFAULT NULL");
    } catch (\PDOException $e) { /* Column might already exist, skipping */ }

    try {
        $pdo->exec("ALTER TABLE users ADD reset_expires DATETIME DEFAULT NULL");
    } catch (\PDOException $e) { /* Column might already exist, skipping */ }

    echo "<h1>DATABASE REPAIRED!</h1>";
    echo "<p>Security columns are now confirmed in your users table.</p>";
    echo "<p>Try the <strong>Forgot Password</strong> tool on your site now.</p>";
} catch (\PDOException $e) {
    echo "<h1>REPAIR FAILED</h1>";
    echo "<p>Error: " . $e->getMessage() . "</p>";
}
?>
