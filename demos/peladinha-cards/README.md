As cartas evoluem de quinta-feira às 20h até quarta-feira às 12h, na hora de Lisboa. O fecho preserva OVR, atributos, especiais, posição e imagem da carta. Durante a pausa, a carta permanece fechada; quinta às 20h nasce uma nova carta para cada jogador com autoavaliação completa, usando os dados e pesos atuais. `closeCardWeek` e `openCardWeek` são tarefas Cloud Scheduler; `ensureHistory` também recupera o estado sem refresh automático. `weeklyCards` fornece as cartas fechadas ao frontend. Mesmo admins não reescrevem snapshots fechados ao recalcular a liga. É necessário publicar as regras, funções e hosting (`npm.cmd run deploy`).

O Card Lab é um estúdio visual com 12 modelos iniciais, 12 paletas, 13 fundos, 12 conjuntos de detalhes, 9 formas, 9 marcas de água, 8 efeitos, 7 molduras e 5 composições combináveis. Cada grupo de texto tem uma escolha entre 8 fontes e tamanhos predefinidos; OVR e atributos são escolhidos em listas. A fotografia pode ser arrastada, redimensionada e ampliada com controlos separados. Inclui desfazer/refazer, composições guardadas no Firebase e importação/exportação de projetos JSON (versão 2, compatível com versão 1). O estúdio é independente das cartas reais. As novas opções requerem publicar também as Functions, que validam as composições guardadas.

Admins podem alternar entre as perspetivas Admin, DBS e Membro na seta abaixo do nome do perfil (também disponível no cabeçalho). A escolha recarrega a página e fica guardada apenas na sessão desse utilizador e browser. A role real no Firestore permanece admin; a interface aplica as permissões da perspetiva escolhida e permite regressar a Admin. Isto é uma pré-visualização da interface, não uma alteração das permissões do servidor. Ao perder a role real de admin ou terminar sessão, a perspetiva é limpa.

As novas avaliações 0–20 e 0–5 começam em zero; valores guardados e N/A são preservados. Não há submissão automática ao abrir um formulário. O perfil mostra a quantidade de avaliações externas 0–20 submetidas, sem incluir autoavaliação ou votos de jogos; editar um voto não aumenta esta contagem. Os jogos apresentam um painel único de equipas, com seleção do sorteio num popup, diferença e médias OVR, maior/menor OVR, líderes por posição principal e um capitão por equipa (maior OVR; em empate, UID por ordem lexicográfica). Nos jogos encerrados usam-se os OVR de referência guardados, quando disponíveis. Estas distinções são visuais e não alteram resultados, avaliações ou bónus.

A role **DBS** é atribuída e removida apenas por admins, em Administração → Jogadores. DBS pode editar todos os campos e equipas de qualquer jogo, incluindo rascunhos e jogos finalizados, encerrá-los e reabri-los. Não recebe acesso às páginas administrativas nem à atribuição de roles. As permissões são verificadas na interface, na gravação e nas regras Firestore. Publicar exige `npm.cmd run deploy` completo.

Cada jogo permite registar golos e assistências individuais nos participantes. O total de cada equipa não pode ultrapassar o resultado; os golos sem autor conhecido podem ficar sem atribuição. A aba Estatísticas e os perfis apresentam estes totais, contando apenas jogos finalizados. Golos e assistências dão bónus limitados aos atributos e a vitória reforça trabalho de equipa; a avaliação de Atitude (0–5) alimenta Resistência e Compostura. Fórmulas e limites em `OVR.md`. A lista de disponíveis usa duas colunas e scroll, com um máximo de seis linhas visíveis.

Os jogos incluem seleção automática de equipas com OVR equilibrado, médias/desvio visíveis e ajuste de resultado limitado a −3/+3 por equilíbrio. A referência é guardada pelo backend no encerramento. As fórmulas, exemplos, limites e critérios de cartas especiais estão em [OVR.md](./OVR.md). Publicar esta alteração exige `npm.cmd run deploy` completo.

A administração tem páginas próprias para Jogadores, Jogos, Pesos do OVR, Card Lab, Avaliações, Tickets, Mensagens e Manutenção. O painel inicial apresenta atalhos e o menu comum acompanha as páginas administrativas. Novas áreas são registadas no catálogo `ADMIN_AREAS` em `js/admin-menu.js`, usado pelo menu e pelos atalhos, e ligadas à respetiva rota. As páginas continuam protegidas por acesso de administrador.

As cartas mostram até 3 ícones de playstyle à esquerda quando os atributos correspondentes chegam a 90. Usam os 8 ícones disponíveis em `assets/playstyle`; os valores mais altos têm prioridade, com desempate pela ordem dos atributos na carta. Cartas históricas usam os seus próprios valores, e o Card Lab atualiza os ícones no preview.

## Cálculo OVR para administradores e publicação

**Admin → Jogadores → Cálculo OVR** (ou o botão no perfil) mostra os 12 valores da carta, pesos, produtos, soma, divisor e arredondamento. Podes selecionar a carta atual ou uma semana do histórico; a carta atual também apresenta a origem dos atributos. Novos snapshots guardam posição e detalhe da fórmula. Cartas antigas sem estes dados mostram o OVR original e identificam a falta dos pesos, sem inventar um cálculo histórico.

O projeto inclui agora Firebase Hosting e comandos `npm.cmd run deploy`, `deploy:frontend` e `deploy:backend`. Segue [DEPLOY.md](./DEPLOY.md) para autenticar e publicar a versão completa. A URL GitHub Pages continua a precisar da sua própria publicação.

As notificações marcadas como lidas desaparecem do sino e da página de notificações. O estado lido permanece guardado para impedir que notificações antigas voltem a aparecer.

## Atualização: OVR, avaliações e estatísticas

O OVR é a soma dos 12 atributos multiplicados pelas percentagens da posição principal, arredondada apenas no fim. O admin escolhe GR, DEF, ALA, MED ou AV em Administração → Pesos do OVR e define cada peso entre 0% e 100%, com até duas casas decimais; cada posição deve somar exatamente 100%. Os valores iniciais por posição estão em [OVR.md](./OVR.md). Pesos globais antigos válidos são copiados para todas as posições até o admin os diferenciar. Guardar persiste `settings/ovr` através de `saveOvrWeights` e recalcula a carta em evolução; cartas fechadas são preservadas. Só o backend pode escrever a configuração; membros ativos podem lê-la. Mudar a posição principal recalcula o OVR. Cartas históricas fechadas mantêm o detalhe original. Referências guardadas de jogos encerrados permanecem fixas.

Cada jogo fechado contribui com +5 por vitória, 0 por empate e −5 por derrota, mais um ajuste de equilíbrio de −3 a +3 calculado com o OVR de referência das equipas guardado no jogo. A contribuição dos atributos fica limitada a 0–99. O ajuste é diluído pela base (peso 3) e pelos jogos (peso 1 cada), sem depender da diferença de golos ou da quantidade de votos. Sem rating numa dimensão, usa a base como referência para o ajuste; N/A nunca é tratado como zero. As estrelas e os prémios continuam a usar as avaliações originais.

Missões verificam todos os colegas sem avaliação submetida pelo membro, incluindo jogadores já oficiais. Pelo perfil de outro jogador, o membro pode adicionar ou editar a própria avaliação da comunidade; um voto editado mantém-se submetido e não aumenta a contagem de avaliadores. Feedback pós-jogo continua bloqueado após envio.

O ecrã `#/statistics` apresenta totais da liga e estatísticas por jogador, com ordenação. Golos a favor/sofridos são colectivos, não golos individuais.

Para ativar esta atualização, publica o frontend e `firestore:rules,functions`; depois usa **Admin → Recalcular liga** para atualizar o histórico existente.

# Peladinhas Cards

## Tickets de apoio

Na navegação, **Tickets** permite criar pedidos com título e mensagem obrigatórios, consultar o histórico e conversar em tempo real. Membros só acedem aos seus tickets; admins acedem a todos e podem responder em conjunto. Cada mensagem guarda a identidade e o papel do autor no momento do envio. Todos os admins activos e o membro recebem notificações de novidades (excepto o próprio autor). Membros e admins podem fechar definitivamente: não existe reabertura nem envio posterior, mesmo via chamadas directas. O histórico permanece disponível. Mensagens não são editáveis nem elimináveis pelo cliente.

Os dados ficam em `tickets/{id}` e `tickets/{id}/messages/{id}`. Escritas passam pela callable `ticketAction`; os triggers `onTicketMessage` e `onTicketClosed` geram notificações persistentes. Para activar, publica frontend, regras e Functions: `npx.cmd firebase deploy --only "firestore:rules,functions"`.

## Temas de cores

Cada Peladinha pode ter um vídeo do YouTube: adiciona o link no formulário do jogo para o visualizar dentro do site. Aceita watch, youtu.be, Shorts e live; guarda apenas `youtubeVideoId`. O criador edita enquanto o jogo não estiver encerrado; depois apenas o admin. Links vazios removem o vídeo. A reprodução depende das permissões de incorporação do autor; existe um link alternativo para o YouTube. Publica as novas `firestore.rules` para permitir este campo opcional (jogos antigos continuam compatíveis).

O ícone de paleta ao lado das notificações abre o selector de temas: **Club Original**, **Volt Arena** (violeta/lima), **Champions Night** (azul/ciano) e **Ultimate 20** (cinzento/rosa, com botões secundários preto/dourado). As três novas paletas são inspirações originais no ambiente dos jogos FIFA, sem assets oficiais. A escolha aplica-se imediatamente e fica guardada neste browser em localStorage, apenas como preferência visual; não guarda dados da liga nem altera a raridade das cartas. Também está disponível antes de iniciar sessão.

Uma liga de futebol entre amigos, com cartas originais, avaliações da comunidade e evolução semanal. Interface em português de Portugal, tema escuro, mobile e desktop. O frontend é HTML/CSS/JavaScript ES Modules: abre com Live Server e publica directamente no GitHub Pages, sem build.

## O que existe

- **Player profiles**: identidade, fotografia, país, nascimento, altura, peso, pé, posições, número, cidade e estilo de jogo. Username permanente; idade calculada a partir do nascimento.
- **Onboarding**: conta e confirmação de password → dados obrigatórios → fotografia opcional → missão de autoavaliação. Contas antigas recebem uma missão para completar o perfil.
- **Weekly Top 3 / ranking**: média das performances da semana, considerando jogos com pelo menos dois ratings recebidos. Desempate por OVR; jogadores sem ratings semanais usam OVR como referência. Ciclo de quinta às 20h a quarta às 12h em `Europe/Lisbon`; o identificador usa a semana ISO da quinta de abertura.
- **Mission Engine**: `COMPLETE_PROFILE`, `SELF_INITIAL_RATING`, `GAME_FEEDBACK`, `RATE_NEW_PLAYER`. Missões derivadas novamente ao iniciar sessão, navegar e concluir acções. Listeners actualizam novidades sem destruir formulários em edição.
- **New player ratings**: rascunhos 0–20 com autosave; um voto externo por colega. Uma carta é provisória até receber 3 avaliações completas. Desde o primeiro voto externo completo, usa 20% autoavaliação + 80% média externa; sem votos externos, usa apenas a autoavaliação. Com 3 votos externos, passa a oficial. Configuração central em `js/utils.js`.
- **Cartas**: 12 atributos, OVR, 6 raridades normais e 10 especiais, três tamanhos e frames originais em CSS. Baseline com peso 3 e cada jogo agregado com peso 1. Guarda-redes N/A não vale zero.
- **Jogos**: rascunho, aberto e fechado; drag-and-drop desktop e botões/selects mobile; máximo 5 titulares/equipa; suplentes; resultados; feedback parcial persistente e submissão pós-jogo bloqueada para membros.
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

O histórico guarda apenas a carta do ciclo ativo. Snapshots existentes de ciclos anteriores são bloqueados sem modificar os seus valores. Correções posteriores entram na carta em evolução ou, durante a pausa, no ciclo seguinte.

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

Os dados da liga, missões e notificações são verificados ao navegar entre páginas ou atualizar manualmente. Alterações no Firebase e voltar ao separador não provocam refresh automático da página.

Ausências consecutivas em jogos finalizados reduzem apenas o OVR: 4 jogos −2, 5 −5, 6 −7 e 7 ou mais −10. Participar como titular ou suplente reinicia a sequência. Não contam jogos anteriores à criação da conta. Perfil e auditoria mostram a dedução; semanas fechadas mantêm os valores guardados. Consulte `OVR.md` para a fórmula. Esta atualização requer publicar frontend e Functions (`npm run deploy`).

Jogo de equipa, posicionamento, compostura e vis?o de jogo recebem o dobro dos ganhos positivos dos jogos at? 70. A parte do ganho acima de 70 e as descidas mant?m o ritmo normal. O b?nus ? explicado na auditoria do administrador e em `OVR.md`; a f?rmula ? partilhada com as Functions.

A área **Admin → Cartas** (`#/admin/card-types`) apresenta o catálogo completo dos 16 tipos padrão e dos tipos criados e guardados no Card Lab (`cardThemes`). O admin pode escolher um jogador para pré-visualizar a sua identidade, fotografia, posição e atributos em qualquer tipo; esta escolha é apenas visual e não atribui cartas nem altera o perfil. Os modelos criados mantêm as suas cores, formas, efeitos, marcas de água e composição. Sem jogador selecionado, usa-se um perfil de exemplo. A fotografia semanal continua a ser editada pelo botão “Editar foto de carta” no perfil.

No perfil de cada jogador, o botão exclusivo do admin **Editar foto de carta** abre a edição da fotografia semanal (`#/admin/card-photo/{uid}`). O admin pode carregar uma fotografia para a carta semanal e ajustar posição, tamanho, zoom, rotação, enquadramento e recorte inferior. A fotografia do perfil não é alterada. As imagens são comprimidas para WebP, mantendo proporções e transparência, e enviadas por uma Function que valida o admin, o jogador e a semana aberta antes do upload. Cada upload usa um ficheiro novo em Storage; as permissões existentes de Storage permanecem iguais. `weeklyCardPhotos/{uid}_{weekId}` é escrito apenas pelo servidor, e os históricos guardam a imagem e os ajustes usados nessa semana. Semanas fechadas bloqueiam também esta edição; uma semana nova volta à fotografia do perfil até haver um novo ajuste. O botão “Usar fotografia do perfil” remove a personalização da semana atual.

Publicar esta funcionalidade requer frontend, regras Firestore e Functions: `npm run deploy`.

Todas as silhuetas incluem o mesmo ret?ngulo de prote??o para o conte?do. OVR, posi??o, pa?s, nome e atributos t?m posi??es fixas entre tipos de carta, incluindo modelos do Card Lab; os recortes s?o detalhes exteriores. As composi??es antigas continuam v?lidas, mas j? n?o deslocam os blocos de texto.
