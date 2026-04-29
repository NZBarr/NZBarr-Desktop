<?php

// This script should be run from a cron job to clean up old history records.

// Bootstrap the application
require_once __DIR__ . '/../private/bootstrap.php';

echo "--- History Cleanup Script ---
";

// Check if retention is enabled
if (!defined('RETENTION_HISTORY_DAYS') || RETENTION_HISTORY_DAYS <= 0) {
    echo "Download history retention is disabled (RETENTION_HISTORY_DAYS is set to 0 or not defined).
";
    exit;
}

$days = RETENTION_HISTORY_DAYS;
echo "Retention period is set to $days days.
";

try {
    // Prepare the DELETE statement
    $sql = "DELETE FROM user_downloads WHERE download_date < DATE_SUB(NOW(), INTERVAL :days DAY)";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':days', $days, PDO::PARAM_INT);

    // Execute the statement
    $stmt->execute();

    // Report the number of deleted rows
    $rowCount = $stmt->rowCount();
    echo "Successfully deleted $rowCount old history records.
";

} catch (PDOException $e) {
    echo "Error: Could not clean up history records.
";
    echo "PDOException: " . $e->getMessage() . "
";
    exit(1);
}

echo "--- Cleanup complete. ---
";
