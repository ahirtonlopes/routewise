// dangerfile.js -- Governanca como Codigo: RouteWise
//
// Regras de conformidade verificadas automaticamente em cada Pull Request.
// Executado pelo Danger.js no pipeline de CI (GitHub Actions).
//
// Documentacao: https://danger.systems/js/
// Como funciona: o Danger le os dados do PR via API do GitHub e executa
// este arquivo. Itens marcados com fail() bloqueiam o merge. warn() apenas avisa.

// ---------------------------------------------------------------------------
// CONFIGURACAO DO PROJETO
// ---------------------------------------------------------------------------

const CONFIG = {
  // Prefixo dos cards no Jira. Todos os PRs devem referenciar um card.
  jiraPrefix: "ROUTEWISE",

  // Caminhos que exigem revisao adicional por conterem codigo critico:
  // integracao GPS, notificacoes push, rotas da API e migrations de banco.
  criticalPaths: [
    "src/integrations/gps",
    "src/services/notifications",
    "src/api/routes",
    "migrations/",
  ],

  // Arquivos de configuracao que nunca devem ir para o repositorio.
  sensitiveFiles: [".env", ".env.local", ".env.production"],

  // Numero minimo de aprovadores para PRs que tocam caminhos criticos.
  criticalApprovers: 2,

  // PRs acima deste tamanho recebem aviso para revisao mais cuidadosa.
  largePRThreshold: 500,

  // Queda de cobertura (em pontos percentuais) que gera aviso.
  coverageDropThreshold: 5,
};

// ---------------------------------------------------------------------------
// REGRA 1 -- Referencia ao card do Jira
//
// Objetivo: garantir rastreabilidade entre o codigo e o trabalho planejado.
// Todo PR deve mencionar o identificador do card (ex: ROUTEWISE-42) no
// titulo ou na descricao.
//
// Por que isso importa: sem rastreabilidade, e impossivel reconstruir
// "por que esse codigo existe" seis meses depois. Isso protege o time
// em code reviews, auditorias e investigacoes de incidente.
// ---------------------------------------------------------------------------

const jiraPattern = new RegExp(`${CONFIG.jiraPrefix}-\\d+`, "i");
const titleHasJira = jiraPattern.test(danger.github.pr.title);
const bodyHasJira  = jiraPattern.test(danger.github.pr.body || "");

if (!titleHasJira && !bodyHasJira) {
  fail(
    `**Rastreabilidade: card do Jira nao encontrado.**\n\n` +
    `O titulo ou a descricao do PR deve conter o identificador do card ` +
    `(exemplo: \`${CONFIG.jiraPrefix}-42\`). ` +
    `Isso conecta o codigo ao requisito, a discussao de design e a aprovacao documentada.\n\n` +
    `Como corrigir: edite o titulo do PR para incluir o numero do card.`
  );
}

// ---------------------------------------------------------------------------
// REGRA 2 -- Arquivos criticos exigem mais aprovadores
//
// Objetivo: reduzir risco em mudancas de codigo de alta criticidade.
// O modulo de GPS processa dados pessoais de localizacao de motoristas (LGPD).
// A API de rotas e o ponto de entrada de todos os alertas de velocidade.
//
// Configurar via CONFIG.criticalPaths para refletir a arquitetura do projeto.
// ---------------------------------------------------------------------------

const changedFiles = [
  ...danger.git.created_files,
  ...danger.git.modified_files,
];

const criticalFilesChanged = changedFiles.filter((file) =>
  CONFIG.criticalPaths.some((cp) => file.includes(cp))
);

if (criticalFilesChanged.length > 0) {
  const approvals = danger.github.reviews.filter(
    (r) => r.state === "APPROVED"
  ).length;

  if (approvals < CONFIG.criticalApprovers) {
    fail(
      `**Revisao insuficiente para modulos criticos.**\n\n` +
      `Este PR modifica codigo de integracao ou de tratamento de dados sensiveis. ` +
      `Sao necessarios pelo menos **${CONFIG.criticalApprovers} aprovadores** ` +
      `(atual: ${approvals}).\n\n` +
      `Arquivos criticos detectados:\n` +
      criticalFilesChanged.map((f) => `- \`${f}\``).join("\n") + `\n\n` +
      `Solicite revisao de um segundo aprovador antes do merge.`
    );
  } else {
    message(
      `Modulos criticos revisados com ${approvals} aprovadores. Requisito atendido.`
    );
  }
}

// ---------------------------------------------------------------------------
// REGRA 3 -- Arquivos sensiveis nao devem ser commitados
//
// Objetivo: prevenir vazamento de credenciais e segredos de producao.
// Esta regra bloqueia o merge imediatamente se um .env for detectado.
// ---------------------------------------------------------------------------

const sensitiveFilesFound = changedFiles.filter((file) =>
  CONFIG.sensitiveFiles.some((sf) => file.endsWith(sf) || file.includes(sf + "."))
);

if (sensitiveFilesFound.length > 0) {
  fail(
    `**BLOQUEIO DE SEGURANCA: arquivo sensivel detectado.**\n\n` +
    `Os arquivos abaixo nao devem ser versionados. ` +
    `Eles podem conter credenciais, tokens de API ou configuracoes de producao.\n\n` +
    sensitiveFilesFound.map((f) => `- \`${f}\``).join("\n") + `\n\n` +
    `Como corrigir: remova o arquivo do commit e adicione ao \`.gitignore\`. ` +
    `Se credenciais foram expostas, revogue-as imediatamente.`
  );
}

// ---------------------------------------------------------------------------
// REGRA 4 -- PRs grandes recebem aviso
//
// Objetivo: encorajar PRs focados e faceis de revisar.
// PRs acima de 500 linhas tem taxa de revisao efetiva muito menor.
// A regra usa warn() (nao fail()) para nao bloquear, apenas sinalizar.
// ---------------------------------------------------------------------------

const totalChanges = danger.github.pr.additions + danger.github.pr.deletions;

if (totalChanges > CONFIG.largePRThreshold) {
  warn(
    `**PR grande: ${totalChanges} linhas alteradas.**\n\n` +
    `PRs acima de ${CONFIG.largePRThreshold} linhas aumentam o risco de bugs passarem ` +
    `despercebidos na revisao. Considere:\n` +
    `- Dividir em PRs menores e sequenciais\n` +
    `- Agendar uma sessao de revisao dedicada com o time\n` +
    `- Documentar claramente na descricao quais secoes merecem atencao`
  );
}

// ---------------------------------------------------------------------------
// REGRA 5 -- Cobertura de testes nao deve cair mais que o threshold
//
// Requer: arquivo coverage/coverage-summary.json gerado pelo Jest.
// Configurar no package.json: "coverageReporters": ["json-summary"]
//
// Esta regra usa warn() (nao fail()) -- a queda de cobertura e um sinal de
// atencao, nao necessariamente um bloqueador. O time decide.
// ---------------------------------------------------------------------------

const fs = require("fs");
const coveragePath = "./coverage/coverage-summary.json";
const baseCoveragePath = "./coverage/base-coverage.json";

if (fs.existsSync(coveragePath)) {
  try {
    const coverage   = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
    const currentPct = coverage.total?.lines?.pct;

    if (fs.existsSync(baseCoveragePath) && currentPct !== undefined) {
      const basePct = JSON.parse(fs.readFileSync(baseCoveragePath, "utf8")).total?.lines?.pct;
      const drop    = basePct - currentPct;

      if (drop > CONFIG.coverageDropThreshold) {
        warn(
          `**Cobertura de testes caiu ${drop.toFixed(1)} pontos** ` +
          `(de ${basePct.toFixed(1)}% para ${currentPct.toFixed(1)}%).\n\n` +
          `Queda acima de ${CONFIG.coverageDropThreshold}% indica que codigo novo ` +
          `nao esta sendo testado. Adicione testes para os novos modulos ou ` +
          `justifique explicitamente na descricao do PR por que a queda e aceitavel.`
        );
      } else {
        message(
          `Cobertura de testes: ${currentPct.toFixed(1)}% ` +
          `(variacao: ${drop >= 0 ? "-" : "+"}${Math.abs(drop).toFixed(1)}p). ` +
          `Dentro do limite aceitavel.`
        );
      }
    } else {
      message(
        `Cobertura atual: ${currentPct?.toFixed(1) ?? "indisponivel"}%. ` +
        `Arquivo de cobertura base nao encontrado -- comparacao nao realizada neste PR.`
      );
    }
  } catch (e) {
    warn(
      `Nao foi possivel ler o arquivo de cobertura. ` +
      `Verifique se o Jest esta configurado com \`coverageReporters: ["json-summary"]\`.`
    );
  }
} else {
  message(
    `Cobertura de testes nao disponivel neste PR. ` +
    `Para ativar: configure o Jest com \`--coverage\` no step de CI antes do Danger.`
  );
}

// ---------------------------------------------------------------------------
// REGRA 6 -- Descricao do PR deve explicar o que muda e por que
//
// Uma descricao util tem: contexto, o que muda, por que muda, e como testar.
// PRs com descricao vazia ou minima sao dificeis de revisar e de auditar.
// ---------------------------------------------------------------------------

const prBody = (danger.github.pr.body || "").trim();

if (prBody.length < 50) {
  warn(
    `**Descricao do PR muito curta (${prBody.length} caracteres).**\n\n` +
    `Uma boa descricao responde:\n` +
    `- **O que muda?** Qual funcionalidade ou correcao este PR introduz.\n` +
    `- **Por que muda?** Qual problema ou requisito motivou a mudanca.\n` +
    `- **Como testar?** O que o revisor deve verificar alem do codigo.\n\n` +
    `Isso reduz o tempo de revisao e cria documentacao automatica no historico do projeto.`
  );
}

// ---------------------------------------------------------------------------
// RESUMO
// ---------------------------------------------------------------------------

message(
  `**Governance Check concluido.**\n\n` +
  `Regras verificadas: referencia ao Jira, aprovadores para modulos criticos, ` +
  `arquivos sensiveis, tamanho do PR, cobertura de testes e qualidade da descricao.\n\n` +
  `Itens com **fail** bloqueiam o merge. Itens com **warn** sao avisos -- ` +
  `o time decide se sao aceitaveis antes de aprovar.`
);
