/**
 * alerts.js
 *
 * Rotas da API REST para o modulo de Alertas de Velocidade.
 * Expoe endpoints para consulta de historico de alertas e
 * configuracao do threshold de velocidade.
 */

const express = require("express");
const { shouldAlert } = require("../../services/notifications/push-service");
const { allow } = require("../../integrations/gps/guard-filter");

const router = express.Router();

// Armazenamento em memoria para a demo (substituir por banco em producao).
const alertHistory = [];

/**
 * GET /api/alerts
 * Lista o historico de alertas de velocidade.
 * Aceita query params: vehicleId, from, to, limit.
 */
router.get("/", (req, res) => {
  const { vehicleId, limit = 50 } = req.query;

  let results = alertHistory;
  if (vehicleId) {
    results = results.filter((a) => a.vehicleId === vehicleId);
  }

  res.json({
    total: results.length,
    alerts: results.slice(-parseInt(limit)),
  });
});

/**
 * POST /api/alerts/ingest
 * Recebe um pacote de telemetria e avalia se deve gerar alerta.
 * Chamado internamente pelo tracker-client no pipeline de ingestao.
 */
router.post("/ingest", (req, res) => {
  const packet = req.body;

  const guardResult = allow(packet);
  if (!guardResult.allowed) {
    return res.status(200).json({
      processed: false,
      reason: guardResult.reason,
    });
  }

  if (shouldAlert(packet)) {
    const alert = {
      id: `ALT-${Date.now()}`,
      vehicleId: packet.vehicleId,
      speedKmh: packet.speedKmh,
      coordinates: packet.coordinates,
      timestamp: packet.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    alertHistory.push(alert);

    return res.status(201).json({ processed: true, alert });
  }

  return res.status(200).json({ processed: true, alert: null });
});

/**
 * GET /api/alerts/health
 * Endpoint de saude para monitoramento do modulo de alertas.
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    alertsInMemory: alertHistory.length,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
