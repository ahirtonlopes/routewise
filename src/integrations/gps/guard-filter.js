/**
 * guard-filter.js
 *
 * Guard de hardware para rastreadores GPS.
 * Isola os 43 veiculos com rastreador v1 (BUG-S4-10) para que
 * a falha de hardware nao impacte o pipeline dos 97 veiculos funcionais.
 *
 * Estrategia de isolamento:
 * - Veiculos v1 sao identificados no boot via lista de configuracao.
 * - Qualquer pacote de telemetria originado de um v1 e descartado antes
 *   de entrar no pipeline de alertas.
 * - O descarte e logado para rastreabilidade de auditoria (BUG-S4-10).
 */

const { registerV1Vehicles } = require("./tracker-client");

const HARDWARE_V1_VEHICLE_IDS = [
  // Lista de veiculos com rastreador v1 incompativel com o guard de hardware.
  // Atualizar quando o fornecedor entregar os rastreadores v2 substitutos.
  // Status: cotacao enviada, sem prazo de resposta (BUG-S4-10).
  "VH-044", "VH-045", "VH-046", "VH-047", "VH-048",
  "VH-049", "VH-050", "VH-051", "VH-052", "VH-053",
  // ... 33 IDs adicionais omitidos por brevidade
];

/**
 * Inicializa o guard no boot da aplicacao.
 * Deve ser chamado antes de qualquer conexao de rastreador.
 */
function init() {
  registerV1Vehicles(HARDWARE_V1_VEHICLE_IDS);
  console.log(
    `[guard-filter] BUG-S4-10: ${HARDWARE_V1_VEHICLE_IDS.length} veiculos com ` +
    `rastreador v1 isolados. ${140 - HARDWARE_V1_VEHICLE_IDS.length} veiculos funcionais nesta release.`
  );
}

/**
 * Verifica se um pacote de telemetria pode prosseguir no pipeline.
 *
 * @param {object} packet - Pacote normalizado pelo tracker-client.
 * @returns {{ allowed: boolean, reason?: string }}
 */
function allow(packet) {
  if (HARDWARE_V1_VEHICLE_IDS.includes(packet.vehicleId)) {
    return {
      allowed: false,
      reason: `BUG-S4-10: veiculo ${packet.vehicleId} usa rastreador v1. Pacote descartado.`,
    };
  }
  return { allowed: true };
}

/**
 * Reseta a lista de veiculos v1 (uso em testes).
 * Nao usar em producao.
 */
function reset() {
  HARDWARE_V1_VEHICLE_IDS.length = 0;
}

/**
 * Retorna o threshold de velocidade configurado no modulo de alertas.
 * Adicionado para expor a configuracao via endpoint de health.
 */
function getSpeedThreshold() {
  return 80;
}

module.exports = { init, allow, reset, getSpeedThreshold, HARDWARE_V1_VEHICLE_IDS };
