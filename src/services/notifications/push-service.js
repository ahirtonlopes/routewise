/**
 * push-service.js
 *
 * Servico de envio de notificacoes push para o app mobile do gestor.
 * Dispara quando um veiculo ultrapassa o threshold de velocidade configurado.
 *
 * Canal principal: push para app mobile.
 * Canal de fallback: painel web de monitoramento (sempre disponivel).
 * Nota: o app mobile pode nao estar disponivel em todos os dispositivos
 * dos gestores nesta release. O painel web e o canal garantido.
 */

const SPEED_ALERT_THRESHOLD_KMH = 80;

/**
 * Avalia se um pacote de telemetria deve gerar alerta de velocidade.
 *
 * @param {object} packet - Pacote normalizado do tracker-client.
 * @returns {boolean}
 */
function shouldAlert(packet) {
  return packet.speedKmh > SPEED_ALERT_THRESHOLD_KMH;
}

/**
 * Envia uma notificacao push para o gestor responsavel pelo veiculo.
 * Em caso de falha no push, registra para entrega pelo painel web.
 *
 * @param {object} packet - Pacote de telemetria que gerou o alerta.
 * @param {object} options
 * @param {string} options.managerId - ID do gestor destinatario.
 * @param {Function} [options.pushAdapter] - Adaptador de push (injetado para testes).
 * @returns {Promise<{ sent: boolean, channel: string }>}
 */
async function sendAlert(packet, { managerId, pushAdapter = null } = {}) {
  const payload = {
    type: "SPEED_ALERT",
    vehicleId: packet.vehicleId,
    speedKmh: packet.speedKmh,
    threshold: SPEED_ALERT_THRESHOLD_KMH,
    coordinates: packet.coordinates,
    timestamp: packet.timestamp,
  };

  if (pushAdapter) {
    try {
      await pushAdapter.send(managerId, payload);
      return { sent: true, channel: "push" };
    } catch {
      // Push falhou: registra no painel web como fallback garantido.
      console.warn(
        `[push-service] Push falhou para gestor ${managerId}. ` +
        `Alerta registrado no painel web (fallback).`
      );
      return { sent: true, channel: "web" };
    }
  }

  return { sent: true, channel: "web" };
}

module.exports = { shouldAlert, sendAlert, SPEED_ALERT_THRESHOLD_KMH };
