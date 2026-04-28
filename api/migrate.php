<?php
require_once 'db.php';

try {
    $pdo->exec("ALTER TABLE task_breakdowns ADD COLUMN min_target_val VARCHAR(100) DEFAULT NULL AFTER title");
    echo "Successfully added min_target_val to task_breakdowns.\\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column already exists.\\n";
    } else {
        echo "Error: " . $e->getMessage() . "\\n";
    }
}
?>
