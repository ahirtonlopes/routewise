# RouteWise

Sistema de Gestao de Frota com Alertas de Velocidade em Tempo Real.

Repositorio de demo para a disciplina **Ferramentas de IA para Gestao de Projetos** (UNIPDS).
Usado nos Modulos 7 e 8 para demonstrar status reports automaticos e governanca como codigo.

---

## Contexto do projeto

A RouteWise e uma plataforma de rastreamento de frota para a empresa Conecta Cargas.
O sistema monitora 140 veiculos e dispara alertas para o gestor quando um veiculo
ultrapassa 80 km/h.

**Status da release 0.1.0:**
- 97 veiculos com rastreador v2: funcionais
- 43 veiculos com rastreador v1: fora do escopo por conta do BUG-S4-10
  (guard de hardware incompativel -- aguarda troca de equipamento)

---

## Estrutura do projeto

```
src/
  integrations/gps/
    tracker-client.js    -- cliente da API de GPS (ingestao de telemetria)
    guard-filter.js      -- isolamento do BUG-S4-10 (rastreadores v1)
  services/notifications/
    push-service.js      -- alertas push com fallback para painel web
  api/routes/
    alerts.js            -- API REST do modulo de alertas

tests/                   -- testes com Jest (cobertura > 80%)

dangerfile.js            -- regras de governanca (Danger.js)
.github/workflows/ci.yml -- pipeline: testes + governance check
```

---

## Como executar localmente

```bash
# Instalar dependencias
npm install

# Executar testes com cobertura
npm test
```

---

## Governanca como codigo

Todo Pull Request e verificado automaticamente pelo [Danger.js](https://danger.systems/js/)
no pipeline de CI. As regras estao documentadas no `dangerfile.js`.

### Regras ativas

| Regra | Tipo | Criterio |
|---|---|---|
| Referencia ao card do Jira | Falha | Titulo ou descricao deve conter `ROUTEWISE-NNN` |
| Aprovadores para modulos criticos | Falha | PRs em `src/integrations/gps` ou `src/api/routes` exigem 2 aprovadores |
| Arquivos sensiveis | Falha | `.env` e variacoes bloqueiam o merge imediatamente |
| Tamanho do PR | Aviso | PRs acima de 500 linhas recebem recomendacao de divisao |
| Cobertura de testes | Aviso | Queda acima de 5 pontos percentuais gera aviso |
| Descricao do PR | Aviso | Descricoes com menos de 50 caracteres recebem aviso |

**Falhas bloqueiam o merge. Avisos nao bloqueiam.**

### Como o Danger posta o resultado

Apos cada push no PR, o GitHub Actions executa o `dangerfile.js` e o Danger
posta um comentario automatico com o resultado de cada regra. O comentario
e atualizado a cada novo push, nao cria multiplos comentarios.

### Versao Python (modo local, sem CI)

Para rodar a verificacao sem um PR real e sem o GitHub Actions:

```bash
# PR que passa em todas as regras
python danger-config-routewise.py --local

# PR com falhas (demonstracao de bloqueio)
python danger-config-routewise.py --local --mock pr-mock-falhas.json
```

Os arquivos `danger-config-routewise.py`, `pr-mock-routewise.json` e
`pr-mock-falhas.json` estao nos materiais da disciplina (pasta `demos/`).

---

## Pipeline de CI

```
Pull Request aberto/atualizado
         |
         v
  [Job 1: Testes]
  npm test --coverage
  Gera coverage/coverage-summary.json
         |
         v
  [Job 2: Governance Check]
  Danger.js le o dangerfile.js
  Posta comentario no PR
  Sai com codigo 1 se houver falhas
```

O Job 2 roda mesmo se o Job 1 falhar (`if: always()`), para que o
feedback de governanca seja entregue independentemente do estado dos testes.

---

## Personagens do projeto (contexto dos modulos 6, 7 e 8)

- **Carlos Mendonca** -- Diretor de Operacoes, aprovador operacional
- **Priya** -- Responsavel de TI/Infra, aprovadora tecnica
- **Marcus** -- Consultor externo, facilitou a reuniao de kick-off (M1.2)

---

*Ahirton Lopes -- UNIPDS: Ferramentas de IA para Gestao de Projetos*
