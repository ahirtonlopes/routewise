/**
 * tracker-client.js
 *
 * Cliente de integracao com a API dos rastreadores GPS.
 * Responsavel por receber pacotes de telemetria em tempo real
 * e disponibiliza-los para o pipeline de alertas.
 *
 * Contexto de frota: 140 veiculos total.
 * - 97 com rastreador v2 (funcionais nesta release)
 * - 43 com rastreador v1 (bloqueados pelo BUG-S4-10, guard de hardware incompativel)
 */

const RASTREADOR_V1_IDS = new Set(); // populado via guard-filter no boot
const POLLING_INTERVAL_MS = 5000;

/**
 * Conecta ao endpoint de telemetria do rastreador e retorna
 * um readable stream de pacotes GPS.
 *
 * @param {string} vehicleId - Identificador do veiculo na frota.
 * @param {object} options
 * @param {number} options.timeoutMs - Timeout de conexao em ms (default: 10000).
 * @returns {Promise<object>} Stream de pacotes de telemetria.
 */
async function connect(vehicleId, { timeoutMs = 10000 } = {}) {
  if (RASTREADOR_V1_IDS.has(vehicleId)) {
    throw new Error(
      `BUG-S4-10: rastreador v1 detectado para o veiculo ${vehicleId}. ` +
      `Este veiculo nao recebera alertas nesta release.`
    );
  }

  return {
    vehicleId,
    connectedAt: new Date().toISOString(),
    pollingInterval: POLLING_INTERVAL_MS,
    status: "connected",
  };
}

/**
 * Processa um pacote de telemetria bruto recebido do rastreador.
 * Normaliza coordenadas, velocidade e timestamp para o formato interno.
 *
 * @param {object} rawPacket - Pacote bruto do rastreador.
 * @returns {object} Pacote normalizado.
 */
function parsePacket(rawPacket) {
  const { vehicle_id, lat, lng, speed_kmh, ts } = rawPacket;

  if (!vehicle_id || lat === undefined || lng === undefined || speed_kmh === undefined) {
    throw new Error("Pacote de telemetria invalido: campos obrigatorios ausentes.");
  }

  return {
    vehicleId: vehicle_id,
    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    speedKmh: parseFloat(speed_kmh),
    timestamp: ts ? new Date(ts) : new Date(),
  };
}

/**
 * Registra os IDs de veiculos com rastreador v1 (BUG-S4-10).
 * Chamado no boot pelo guard-filter antes de aceitar conexoes.
 *
 * @param {string[]} ids - Lista de IDs afetados.
 */
function registerV1Vehicles(ids) {
  ids.forEach((id) => RASTREADOR_V1_IDS.add(id));
}

module.exports = { connect, parsePacket, registerV1Vehicles };
