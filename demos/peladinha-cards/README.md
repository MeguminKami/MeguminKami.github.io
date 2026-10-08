# Peladinhas Cards

## Temas de cores

Cada Peladinha pode ter um vídeo do YouTube: adiciona o link no formulário do jogo para o visualizar dentro do site. Aceita watch, youtu.be, Shorts e live; guarda apenas `youtubeVideoId`. O criador edita enquanto o jogo não estiver encerrado; depois apenas o admin. Links vazios removem o vídeo. A reprodução depende das permissões de incorporação do autor; existe um link alternativo para o YouTube. Publica as novas `firestore.rules` para permitir este campo opcional (jogos antigos continuam compatíveis).

O ícone de paleta ao lado das notificações abre o selector de temas: **Club Original**, **Volt Arena** (violeta/lima), **Champions Night** (azul/ciano) e **Ultimate 20** (cinzento/rosa, com botões secundários preto/dourado). As três novas paletas são inspirações originais no ambiente dos jogos FIFA, sem assets oficiais. A escolha aplica-se imediatamente e fica guardada neste browser em localStorage, apenas como preferência visual; não guarda dados da liga nem altera a raridade das cartas. Também está disponível antes de iniciar sessão.

Uma liga de futebol entre amigos, com cartas originais, avaliações da comunidade e evolução semanal. Interface em português de Portugal, tema escuro, mobile e desktop. O frontend é HTML/CSS/JavaScript ES Modules: abre com Live Server e publica directamente no GitHub Pages, sem build.

## O que existe

- **Player profiles**: identidade, fotografia, país, nascimento, altura, peso, pé, posições, número, cidade e estilo de jogo. Username permanente; idade calculada a partir do nascimento.
- **Onboarding**: conta e confirmação de password → dados obrigatórios → fotografia opcional → missão de autoavaliação. Contas antigas recebem uma missão para completar o perfil.
- **Weekly Top 3 / ranking**: média das performances da semana, considerando jogos com pelo menos dois ratings recebidos. Desempate por OVR; jogadores sem ratings semanais usam OVR como referência. Semana ISO em `Europe/Lisbon`.
- **Mission Engine**: `COMPLETE_PROFILE`, `SELF_INITIAL_RATING`, `GAME_FEEDBACK`, `RATE_NEW_PLAYER`. Missões derivadas novamente ao iniciar sessão, navegar e concluir acções. Listeners actualizam novidades sem destruir formulários em edição.
- **New player ratings**: rascunhos 0–20 com autosave; um voto externo por colega. Uma carta é provisória até receber 3 avaliações completas. Desde o primeiro voto externo completo, usa 20% autoavaliação + 80% média externa; sem votos externos, usa apenas a autoavaliação. Com 3 votos externos, passa a oficial. Configuração central em `js/utils.js`.
- **Cartas**: 12 atributos, OVR, 6 raridades normais e 10 especiais, três tamanhos e frames originais em CSS. Baseline com peso 3 e cada jogo agregado com peso 1. Guarda-redes N/A não vale zero.
- **Jogos**: rascunho, aberto e fechado; drag-and-drop desktop e botões/selects mobile; máximo 5 titulares/equipa; suplentes; resultados; feedback parcial persistente e submissão bloqueada para membros.
- **Notifications**: sino com badge, dropdown, histórico, marcar uma/todas como lidas; novas missões, jogos encerrados, cartas actualizadas, especiais e mensagens administrativas.
- **Admin / Card Lab**: roles protegidos, edição de perfis, raw ratings, correcção de jogos, reabertura, eliminação completa via função, recálculo da liga/histórico e mensagens. Preview de qualquer carta e tema experimental independente dos dados reais.
- **Card themes / assets**: temas experimentais privados para admins; caminhos locais em `js/assets.js` e rota `#/assets` como catálogo inicial de identidade. Não inclui editor de ficheiros de assets.
- Skeletons, empty states, retry em erros, toasts, confirmações, focus de teclado e navegação inferior mobile.

## Porque existem funções Firebase nesta revisão

Os ratings raw são privados. O browser não pode ler os votos de todos para calcular cartas sem expor a identidade dos avaliadores. As Security Rules não filtram documentos nem ocultam campos: uma consulta que pode devolver votos privados falha por completo. A solução anterior tentava precisamente essa leitura e bloqueava páginas.

Esta versão inclui **Cloud Functions** para produzir `communitySummaries`, `gameSummaries`, histórico e notificações de evolução. Só estas funções escrevem os agregados e snapshots; membros e admins não podem inventar um OVR ou uma média através de DevTools. As funções lêem os dados raw com o Admin SDK **no servidor**, sem credenciais no frontend. [Documentação oficial: rules e queries](https://firebase.google.com/docs/firestore/security/rules-query).

O frontend continua estático no GitHub Pages. Não existe servidor Node que tenhas de manter ligado; Node/npm são necessários uma vez para publicar as funções e para executar os testes. Storage e Functions requerem plano Blaze. Há quotas sem custo, mas serviços de deploy, armazenamento e execução podem gerar custos conforme utilização; alertas de orçamento **não são um limite que bloqueia a factura**. Verifica a [tabela Firebase](https://firebase.google.com/pricing) antes de activar serviços.

## Instalação Firebase, passo a passo

### 1. Pré-requisitos e Web App

Precisas de conta Google, GitHub e browser. Para publicar Functions: Node.js 22, npm e Firebase CLI. Java 21 é necessário apenas para testes de emulador.

Em [Firebase Console](https://console.firebase.google.com/), cria/escolhe o projecto, regista uma Web App e copia o Firebase Web config para `js/config.js`. Mantém a exportação:

```js
export const firebaseConfig = {
  apiKey: "…",
  authDomain: "PROJECT.firebaseapp.com",
  projectId: "PROJECT",
  storageBucket: "PROJECT.firebasestorage.app",
  messagingSenderId: "…",
  appId: "…",
};
```

A configuração Web é pública e pode estar no repositório. Nunca coloques service-account JSON, passwords ou chaves privadas no código. A segurança depende de Auth e das rules.

### 2. Authentication

Em **Authentication → Sign-in method**, activa **Email/Password**. O utilizador só introduz username/password. Internamente o domínio `auth.weeklyfc.app` é mantido por compatibilidade com as contas existentes; não o alteres ou deixas de conseguir entrar nessas contas. Não é preciso criar uma caixa de correio.

Em **Authentication → Settings → Authorized domains**, adiciona `localhost`, `127.0.0.1` quando necessário e `SEU_USERNAME.github.io`. O hostname não inclui porta nem `/repositorio`.

### 3. Firestore

Cria uma base Firestore **Standard, Native mode**, com ID `(default)`. Escolhe uma região apropriada para o grupo. Publica `firestore.rules` na aba Rules ou através da CLI, abaixo. A publicação destas novas rules é obrigatória para os novos campos do perfil, rascunhos e avaliações da comunidade.

### 4. Storage

Activa o plano Blaze e **Storage → Get started**. Confirma que o nome do bucket corresponde a `storageBucket` em `config.js`. As regiões `us-central1`, `us-east1` e `us-west1` têm elegibilidade Always Free; buckets europeus têm preços diferentes. Não confundas isto com a região de Firestore/Functions. [Requisitos oficiais do Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

Publica `storage.rules`. Quando o Firebase pedir autorização para as rules consultarem Firestore, concede essa integração na consola. Os utilizadores só escrevem `profiles/{uid}/avatar`, um caminho fixo que substitui o avatar anterior. O browser aceita JPG, PNG, WebP até 5 MB, recorta ao centro e comprime a 512×512 WebP. As rules limitam o resultado a menos de 1 MB. URLs antigas mantêm-se legíveis; novos uploads usam o caminho fixo.

### 5. Publicar regras, índices e funções

Na raiz do projecto, usa uma consola:

```bash
npm install
npx firebase login
npx firebase use --add
npx firebase deploy --only firestore,storage,functions
```

Escolhe o teu projecto no `firebase use --add`. Já existe `firebase.json`: não precisas de executar `firebase init` e substituir ficheiros. Alternativa explícita:

```bash
npx firebase deploy --project SEU_PROJECT_ID --only firestore,storage,functions
```

As funções estão em `europe-west1`; o browser usa a mesma região em `js/db.js`. Não alteres uma sem alterar a outra. Podem ser solicitadas activaçōes de APIs Google Cloud/IAM no primeiro deploy; segue os passos da CLI/consola. `functions/index.js` usa credenciais automáticas do ambiente Firebase, nunca uma chave exportada.

Queries actuais usam filtros simples, com índices automáticos. `firestore.indexes.json` mantém índices compostos para possíveis consultas adicionais. Se aparecer `missing index`, segue o link Firebase e aguarda o índice ficar pronto. As funções podem demorar alguns segundos a actualizar os agregados após a submissão; os listeners actualizam as páginas de consulta.

### 6. Primeiro administrador e migração

Cria conta normalmente. Em **Firestore → users → {uid} → role**, muda `member` para `admin`. Termina e inicia sessão. No painel podes promover outros jogadores; o teu próprio acesso não pode ser removido pela app.

Para actualizar uma instalação existente:

1. Publica estas novas rules e funções.
2. Mantém `config.js` e o domínio técnico das contas.
3. Os campos novos são opcionais nas contas antigas: a missão **Completa o teu perfil** guia a migração, sem apagar dados.
4. Confirma que cada documento `users/{uid}` inclui `uid`, `username`, `role`, `disabled:false`, `country`, `countryCode` e `photoURL` (a versão anterior já os criava).
5. Abre **Admin → Recalcular liga** para criar agregados/histórico a partir dos votos existentes. Depois podes recalcular só um jogador.

As avaliações antigas sem `submittedAt` usam `updatedAt`/`createdAt` na reconstrução. Correcções à autoavaliação são consideradas correcções retroactivas do baseline, não novas versões da autoavaliação.

## Executar localmente e publicar

Abre a raiz com **Live Server**, ou:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080`. Não uses `file://`. Não é necessário `npm install` para abrir apenas o frontend após configurar Firebase.

No GitHub, cria repositório, adiciona os ficheiros, commit e push. Em **Settings → Pages → Deploy from branch → main → /root**. O site abre em `https://username.github.io/repositorio/`. Assets e módulos usam paths relativos; as rotas usam `#/`, por isso não há configuração especial de SPA. `node_modules`, `.env` e logs não devem ser publicados. As Functions publicam-se separadamente pelo passo anterior.

## Database Structure

```text
users/{uid}                         perfil, role, dados futebolísticos
  notifications/{notificationId}  notificações e estado read
  cardHistory/{2026-W41}           OVR, stats, base, especiais, cutoff
  cardState/current               comparação interna para notificações
initialRatings/{uid}               autoavaliação pública 0–20
communityRatings/{rater_target}    raw externo privado, parcial/submetido
communitySummaries/{uid}           count + médias sem identidades
games/{gameId}                     equipas, resultado, datas, estado
  feedback/{rater_target}          raw pós-jogo privado
gameSummaries/{gameId}             médias por jogador, contagem, MVP
cardThemes/{themeId}               temas experimentais admin-only
ratingCorrections/{id}             auditoria privada de correcções admin
```

Os raw externos só são lidos pelo autor/admin. Os agregados não contêm identidades dos avaliadores. A autoavaliação não é anónima e integra a informação pública da carta. Os perfis de jogador são visíveis a membros autenticados: considera isso ao introduzir informações pessoais.

Missões são derivadas, sem colecção duplicada. Notificações de missão usam IDs determinísticos; histórico lido não repete uma missão concluída. As missões activas são sempre a fonte de verdade, mesmo que uma notificação histórica continue no histórico.

## História e regras de negócio

O histórico combina baseline e votos submetidos até à semana de corte. Weeks usam Lisboa e segunda-feira; até dez anos de semanas são reconstruídos. Funções actualizam snapshots ao receber avaliações; entrar na Home preenche semanas em falta sem cron. Pode-se acrescentar Cloud Scheduler no futuro para snapshots sem visitas.

Os dados de evolução provêm de médias por jogo, não contadores editáveis. OVR/stats ficam entre 0–99. Awards são calculados no módulo partilhado `js/utils.js`, usado no browser e nas Functions. MVP permite empate no primeiro lugar, com pelo menos 3 votos e overall ≥4.8. N/A não é zero. Temas Card Lab não alteram ratings reais.

Uploads e autosave necessitam de ligação para a confirmação no servidor. A aplicação não promete gravação offline: mantém o rascunho em edição e mostra erro para tentar novamente. Não há base de dados em localStorage. Fechar o browser antes de uma gravação confirmar pode perder esse último campo; aguarda **Guardado**. Navegar internamente aguarda a fila de autosave.

## Testes e revisão

```bash
npm run check
npm test
npm run test:rules
npm run test:backend
npm run test:ui
```

No PowerShell com política restritiva, usa `npm.cmd` / `npx.cmd` em vez de `npm` / `npx`.

- Lógica: escalas, fronteiras, 20/80, N/A, estabilidade, 10 especiais, ISO/Lisboa, ranking e estatísticas.
- Rules: emulator Firestore; promoção indevida, outro perfil, ranges, raw privados, IDs duplicados, draft/submitted, fechado e snapshots forjados.
- Backend: Admin SDK no emulador, execução dos handlers; 3 votos → oficial, MVP, snapshots, eliminação completa, mensagens e temas. Não escreve no Firebase real.
- UI: Playwright, módulos de dados/autenticação interceptados **só pelo teste**. Testa navegação, equipas, autosave 5/12, feedback, perfil, notificações, ranking e Card Lab em desktop/mobile, com screenshots em `test-results/`. Usa Edge instalado no Windows; noutros sistemas instala Chromium com `npx playwright install chromium`.

Os testes locais não comprovam a configuração/IAM do teu projecto real. Após deploy, confirma o registo, avatar e submissões com contas reais no teu projecto.

## Desenvolvimento, reset e backups

Não há seed automático na produção. Os fixtures só existem nos testes. Cria membros pelo onboarding; elimina dados de teste manualmente na consola ou usa emuladores isolados. Eliminar um documento Firestore não elimina subcolecções: usa a acção Admin para jogos. Mantém os raw se pretendes reconstruir histórico. Não elimines o último administrador.

Um jogador sem carta deve terminar a autoavaliação; 3 votos externos tornam a carta oficial. **Recalcular liga** e **Recalcular histórico** exigem Functions publicadas. Fotografias podem ser substituídas no perfil.

Para backups, considera exportação Firestore para Cloud Storage e backups geridos. Estas funcionalidades podem ter custos; exporta antes de operações administrativas extensas. Não disponibilizamos um botão que apague toda a base.

## Troubleshooting

| Problema                                      | Como resolver                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fica no arranque                              | Confirma `export const firebaseConfig`, rede/CDN e console. O arranque apresenta retry em falhas de importação.                                                                                  |
| `auth/unauthorized-domain`                    | Adiciona o hostname local/GitHub nos Authorized domains.                                                                                                                                         |
| `permission-denied`                           | Publica as novas `firestore.rules`, confirma o documento `users` e sessão activa. Não relaxes as rules.                                                                                          |
| `storage/unauthorized`                        | Publica `storage.rules`, confirma bucket e path fixo; verifica MIME/tamanho e integração de rules com Firestore.                                                                                 |
| Avatar falha                                  | Storage requer Blaze; confirma que o bucket existe e corresponde ao config.                                                                                                                      |
| Carta não fica oficial / ranking não muda     | Confirma deploy de Functions e logs de `onCommunityRating` / `onFeedback`; usa Recalcular liga para dados antigos.                                                                               |
| Callable `not-found` / histórico indisponível | Publica Functions e confirma região `europe-west1`.                                                                                                                                              |
| Índice em falta                               | Segue o link de criação de índice e espera por Ready.                                                                                                                                            |
| Erro emulador / porta ocupada                 | Fecha outro emulador ou altera a porta do config de testes. Java 21 deve estar acessível.                                                                                                        |
| GitHub Pages 404                              | Confirma branch, pasta, paths relativos e que `index.html` está na raiz publicada.                                                                                                               |
| Conta sem perfil após falha no registo        | Confirma Firestore/rules. O Auth e Firestore são serviços distintos; um admin pode criar o documento público correspondente ao UID ou remover a conta incompleta na consola e repetir o registo. |

## Organização dos ficheiros

`app.js` coordena navegação e dashboard; `auth.js` / `onboarding.js` tratam a sessão; `db.js` contém acesso Firebase; `data.js` enriquece os jogadores; `missions.js`, `ratings.js`, `profile.js`, `games.js`, `notifications.js`, `admin.js` contêm os fluxos; `cards.js`, `ui.js`, `icons.js`, `assets.js` centralizam componentes; `utils.js` contém regras puras. `functions/index.js` publica os agregados e ferramentas administrativas; `tests/` e `scripts/` verificam o projecto.
