<?php
// Code/api/config/analytics_manager.php

require_once __DIR__ . '/mongodb_config.php'; // Pour getMongoClient()

use MongoDB\Client;
use MongoDB\Collection;
use MongoDB\BSON\UTCDateTime;
use MongoDB\BSON\ObjectId;

/**
 * Retourne la collection pour les événements analytiques des trajets.
 * @return Collection
 */
function getRideAnalyticsCollection(): Collection {
    $client = getMongoClient();
    return $client->ecoride->ride_analytics; // Base de données "ecoride", collection "ride_analytics"
}

/**
 * Retourne la collection pour les statistiques globales de la plateforme.
 * @return Collection
 */
function getPlatformStatsCollection(): Collection {
    $client = getMongoClient();
    return $client->ecoride->platform_stats; // Base de données "ecoride", collection "platform_stats"
}

/**
 * Enregistre un événement lorsqu'un trajet est terminé.
 *
 * @param string $rideIdSQL L'ID SQL du trajet.
 * @return bool True si l'insertion a réussi, false sinon.
 */
function recordRideCompletedEvent(string $rideIdSQL): bool {
    try {
        $collection = getRideAnalyticsCollection();
        $now = new UTCDateTime(); // Timestamp actuel

        $eventDocument = [
            'eventType' => 'rideCompleted',
            'rideId' => $rideIdSQL, 
            'completedAt' => $now,
            'dateDimension' => date('Y-m-d', $now->toDateTime()->getTimestamp())
        ];

        $insertResult = $collection->insertOne($eventDocument);
        return $insertResult->getInsertedCount() === 1;

    } catch (Exception $e) {
        error_log("Erreur AnalyticsManager (rideCompleted): " . $e->getMessage());
        return false;
    }
}

/**
 * Enregistre un événement de revenu pour la plateforme et met à jour le total.
 *
 * @param string $rideIdSQL L'ID SQL du trajet.
 * @param float $commissionAmount Le montant de la commission gagnée.
 * @return bool True si l'enregistrement et la mise à jour ont réussi, false sinon.
 */
function recordPlatformRevenueEvent(string $rideIdSQL, float $commissionAmount): bool {
    try {
        $analyticsCollection = getRideAnalyticsCollection();
        $statsCollection = getPlatformStatsCollection();
        $now = new UTCDateTime();

        // 1. Enregistrer l'événement de revenu
        $eventDocument = [
            'eventType' => 'platformRevenue',
            'rideId' => $rideIdSQL,
            'revenueAmount' => $commissionAmount,
            'collectedAt' => $now,
            'dateDimension' => date('Y-m-d', $now->toDateTime()->getTimestamp())
        ];
        $insertResult = $analyticsCollection->insertOne($eventDocument);

        if ($insertResult->getInsertedCount() !== 1) {
            error_log("Erreur AnalyticsManager (platformRevenue event): Échec de l'insertion de l'événement.");
            return false;
        }

        // 2. Mettre à jour le total des revenus de la plateforme
        $statsUpdateResult = $statsCollection->updateOne(
            ['_id' => 'globalMetrics'], // Filtre pour trouver le document unique
            ['$inc' => ['totalPlatformRevenue' => $commissionAmount]], // Opérateur d'incrémentation
            ['upsert' => true] // Crée le document s'il n'existe pas
        );
        
        // Vérifie si la mise à jour (ou l'upsert) a fonctionné
        return ($statsUpdateResult->getModifiedCount() === 1 || $statsUpdateResult->getUpsertedCount() === 1);

    } catch (Exception $e) {
        error_log("Erreur AnalyticsManager (platformRevenue): " . $e->getMessage());
        return false;
    }
}

?>