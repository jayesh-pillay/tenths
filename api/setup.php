<?php
// TENTH'S CLOUD FORGE
// This script automatically reads your production_schema.sql 
// and builds all your tables in the cloud database with one click.

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';

// Read the unified schema file from the parent directory
$schema_path = __DIR__ . '/../production_schema.sql';

if (!file_exists($schema_path)) {
    die("ERROR: Could not find production_schema.sql");
}

$sql = file_get_contents($schema_path);

try {
    // Execute the massive SQL query to build everything
    $pdo->exec($sql);
    echo "<h1>SUCCESS!</h1>";
    echo "<p>The Tenth's Sanctuary Database has been perfectly forged in the cloud.</p>";
    echo "<p>You can now close this page and start using your app.</p>";
} catch (\PDOException $e) {
    echo "<h1>DATABASE ERROR</h1>";
    echo "<p>Failed to build tables: " . $e->getMessage() . "</p>";
}
?>
