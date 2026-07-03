const { parsePacket, registerV1Vehicles, connect } = require("../../src/integrations/gps/tracker-client");

describe("tracker-client", () => {
  describe("parsePacket", () => {
    test("normaliza pacote valido com todos os campos", () => {
      const raw = {
        vehicle_id: "VH-001",
        lat: "-23.5505",
        lng: "-46.6333",
        speed_kmh: "72.5",
        ts: "2026-05-15T14:30:00Z",
      };
      const packet = parsePacket(raw);

      expect(packet.vehicleId).toBe("VH-001");
      expect(packet.coordinates.lat).toBe(-23.5505);
      expect(packet.coordinates.lng).toBe(-46.6333);
      expect(packet.speedKmh).toBe(72.5);
      expect(packet.timestamp).toBeInstanceOf(Date);
    });

    test("usa timestamp atual quando ts nao e fornecido", () => {
      const raw = { vehicle_id: "VH-002", lat: "0", lng: "0", speed_kmh: "0" };
      const before = new Date();
      const packet = parsePacket(raw);
      const after = new Date();

      expect(packet.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(packet.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test("lanca erro quando campos obrigatorios estao ausentes", () => {
      expect(() => parsePacket({ vehicle_id: "VH-003" })).toThrow(
        "Pacote de telemetria invalido"
      );
    });

    test("converte strings numericas para float", () => {
      const raw = { vehicle_id: "VH-004", lat: "-22.9", lng: "-43.1", speed_kmh: "85.3" };
      const packet = parsePacket(raw);
      expect(typeof packet.speedKmh).toBe("number");
      expect(typeof packet.coordinates.lat).toBe("number");
    });
  });

  describe("connect", () => {
    test("rejeita veiculos com rastreador v1 (BUG-S4-10)", async () => {
      registerV1Vehicles(["VH-V1-TEST"]);
      await expect(connect("VH-V1-TEST")).rejects.toThrow("BUG-S4-10");
    });

    test("conecta com sucesso para veiculo v2", async () => {
      const result = await connect("VH-V2-001");
      expect(result.status).toBe("connected");
      expect(result.vehicleId).toBe("VH-V2-001");
    });
  });
});
