const { shouldAlert, sendAlert, SPEED_ALERT_THRESHOLD_KMH } = require("../../src/services/notifications/push-service");

const makePacket = (speedKmh) => ({
  vehicleId: "VH-001",
  speedKmh,
  coordinates: { lat: -23.55, lng: -46.63 },
  timestamp: new Date(),
});

describe("push-service", () => {
  describe("shouldAlert", () => {
    test(`dispara alerta quando velocidade supera ${SPEED_ALERT_THRESHOLD_KMH} km/h`, () => {
      expect(shouldAlert(makePacket(81))).toBe(true);
      expect(shouldAlert(makePacket(120))).toBe(true);
    });

    test("nao dispara alerta no limite exato do threshold", () => {
      expect(shouldAlert(makePacket(SPEED_ALERT_THRESHOLD_KMH))).toBe(false);
    });

    test("nao dispara alerta abaixo do threshold", () => {
      expect(shouldAlert(makePacket(60))).toBe(false);
      expect(shouldAlert(makePacket(0))).toBe(false);
    });
  });

  describe("sendAlert", () => {
    test("retorna canal push quando adaptador funciona", async () => {
      const pushAdapter = { send: jest.fn().mockResolvedValue(true) };
      const result = await sendAlert(makePacket(90), {
        managerId: "MGR-01",
        pushAdapter,
      });

      expect(result.sent).toBe(true);
      expect(result.channel).toBe("push");
      expect(pushAdapter.send).toHaveBeenCalledWith("MGR-01", expect.objectContaining({
        type: "SPEED_ALERT",
        vehicleId: "VH-001",
      }));
    });

    test("cai para canal web quando push falha (fallback garantido)", async () => {
      const pushAdapter = { send: jest.fn().mockRejectedValue(new Error("timeout")) };
      const result = await sendAlert(makePacket(95), {
        managerId: "MGR-02",
        pushAdapter,
      });

      expect(result.sent).toBe(true);
      expect(result.channel).toBe("web");
    });

    test("usa canal web quando nenhum adaptador e fornecido", async () => {
      const result = await sendAlert(makePacket(85), { managerId: "MGR-03" });
      expect(result.sent).toBe(true);
      expect(result.channel).toBe("web");
    });
  });
});
