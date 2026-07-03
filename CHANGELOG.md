# Changelog

Todas as mudancas notaveis do projeto RouteWise sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Nao lancado]

### Em desenvolvimento
- Modulo de Score de Comportamento dos Motoristas (bloqueado por BUG-S4-10 -- aguarda hardware)

---

## [0.1.0] - 2026-05-18 -- Release inicial: Alertas de Velocidade

### Adicionado
- Modulo de Alertas de Velocidade em tempo real para frota de 140 veiculos
- Integracao com API de GPS via tracker-client (rastreadores v2)
- Guard de hardware (guard-filter) para isolamento do BUG-S4-10:
  43 veiculos com rastreador v1 nao recebem alertas nesta release
- Servico de notificacao push com fallback para painel web
- API REST: `GET /api/alerts`, `POST /api/alerts/ingest`, `GET /api/alerts/health`
- Pipeline de CI com testes automaticos e Governance Check (Danger.js)

### Riscos aceitos nesta release
- **BUG-S4-10**: 43 de 140 veiculos com rastreador v1 fora do escopo de alertas.
  Isolamento testado: falha nao afeta a API dos 97 funcionais.
  Status: cotacao de hardware enviada ao fornecedor, sem prazo de resposta.
  Sign-off: Carlos (Operacional), Priya (TI), Juridico -- 2026-05-15.
