# Checklist de testes iOS/iPadOS

Este documento distingue verificações automatizadas de validações que exigem macOS, simulador ou hardware. Não marques uma linha como aprovada por inferência: regista dispositivo, sistema operativo, build e resultado real.

## 1. Registo da execução

Preenche antes de começar:

```text
Versão / build:
Commit ou snapshot:
Data:
Responsável:
Firebase usado:
Website testado em:
iPhone + iOS:
iPad + iPadOS:
Xcode + macOS:
Notas/restrições:
```

Usa dados descartáveis claramente identificados para testes manuais e remove-os no fim. Os testes automatizados devem usar a configuração Firebase nula/mocks e nunca escrever no projeto real.

## 2. Matriz mínima

| Ambiente | Viewport/dispositivo | Cobertura obrigatória |
|---|---|---|
| Browser desktop | largura desktop | Regressão completa do website e impressão web. |
| Browser compacto | 320 px e 390 px | Layout móvel, swipe e ausência de scroll horizontal global. |
| Simulador | iPhone SE | Viewport pequeno, teclado, portrait e landscapes. |
| Simulador | iPhone moderno com notch | Safe areas, indicador inferior e rotação. |
| Simulador | iPad mini | Portrait/landscape, modais e largura regular. |
| Simulador | iPad Pro | Layout largo, portrait invertido e Stage Manager quando disponível. |
| iPad multitarefa | metade e cerca de um terço | Split View/Slide Over, resize contínuo e transição compacta. |
| iPhone físico | iOS 15.4+ suportado | Gestos, áudio, partilha, background e Firebase. |
| iPad físico | iPadOS 15.4+ suportado | Popovers, multitarefa, toque e periféricos disponíveis. |
| Dois clientes | website + dispositivo ou dois dispositivos | Realtime, conflitos, permissões e reconnect. |

Quando possível, repete num sistema mínimo suportado (15.4) e no sistema atual. Um simulador não valida Apple Pencil, AirPrint real, saída de áudio, destinos de partilha nem todas as características de memória/rede.

## 3. Verificações automatizadas

Dentro de `app`:

- [ ] `npm ci` termina sem alterar o lockfile.
- [ ] `npm run doctor` identifica corretamente sistema, Node, dependências, Firebase e presença/ausência de Xcode/projeto iOS.
- [ ] `npm run test:root` mantém todos os testes partilhados aprovados.
- [ ] `npm test` aprova adaptadores web/iOS, rede, ciclo de vida, áudio, URLs, exportação, cancelamento e listeners.
- [ ] `npm run build` gera `www` a partir de uma pasta limpa.
- [ ] Uma segunda execução de `npm run build` produz o mesmo conjunto/conteúdo de ficheiros.
- [ ] `npm run smoke` aprova 320 px, desktop e viewports representativos de iPad/Split View.
- [ ] O seletor completo e pesquisa de emojis funcionam com rede/CDNs bloqueadas.
- [ ] O teste abre com Firebase desativado e não faz pedidos/escritas ao projeto real.
- [ ] O scan do bundle não encontra gstatic, jsDelivr, `server.url`, `allowNavigation`, caminhos absolutos locais, chaves privadas ou credenciais administrativas.
- [ ] `www` contém apenas HTML/CSS/JS/assets e dados PT/EN necessários; não contém testes, docs, fontes, regras ou configs de desenvolvimento.
- [ ] `node --check`/bundle checks aprovam todos os JavaScript gerados.
- [ ] A árvore Git mostra apenas mudanças intencionais depois dos testes.

Num Mac:

- [ ] `npm run ios:create` cria o projeto apenas quando ausente e recusa sobrescrever um existente.
- [ ] `npm run sync:ios` resolve Swift Package Manager e aplica templates/configuração sem diff inesperado numa segunda execução.
- [ ] `xcodebuild` compila um destino Simulator iPhone.
- [ ] `xcodebuild` compila um destino Simulator iPad.
- [ ] Deployment target é 15.4 e `TARGETED_DEVICE_FAMILY` é `1,2`.
- [ ] Privacy manifest, AppIcon, splash, `ViewController` e `NativePrintPlugin` pertencem ao target App.
- [ ] A origem observada no WKWebView é `capacitor://localhost` e não existe URL remoto de arranque.

## 4. Instalação e arranque

- [ ] O ícone mostra o coração roxo/rosa com “+”, sem ícone Capacitor, transparência ou arte cortada.
- [ ] Splash usa o mesmo símbolo e não fica à espera do Firebase indefinidamente.
- [ ] Arranque com Internet mostra a interface antes/de forma independente do carregamento remoto.
- [ ] Arranque em modo de voo não mostra ecrã branco; emojis e assets locais continuam disponíveis.
- [ ] O estado offline/erro é anunciado sem apagar preferências locais.
- [ ] Fechar/abrir preserva acesso concedido, utilizador, sons e preferência da linha “agora”.
- [ ] Instalação/update não cria dados Firebase por si só.
- [ ] Barra de estado usa conteúdo escuro e não cobre o cabeçalho.

## 5. Acesso e identidades

- [ ] Código incorreto mantém o bloqueio, seleciona o campo e apresenta a mensagem existente.
- [ ] Código correto abre sem alterar texto/comportamento.
- [ ] Seleção João apresenta avatar/nome/faixa corretos.
- [ ] Seleção Sofia apresenta avatar/nome/faixa corretos.
- [ ] Trocar utilizador não altera a identidade de atividades antigas.
- [ ] “Voltar a bloquear” remove o acesso local e limpa dados visíveis como no website.
- [ ] Force quit e relaunch mantêm somente as preferências esperadas em `localStorage`.

## 6. Navegação e calendário

- [ ] Janela móvel contém sete dias e horários 07:00–24:00.
- [ ] Dia anterior/seguinte move corretamente.
- [ ] Semana anterior/seguinte move sete dias.
- [ ] Mês anterior/seguinte mantém a regra de clamp das datas.
- [ ] “Hoje” usa `Europe/Lisbon`, incluindo perto da meia-noite/mudança de hora.
- [ ] Calendário anual mostra os 12 meses, navega anos e abre a data escolhida.
- [ ] Swipe horizontal entre dias funciona no layout compacto e encaixa no dia.
- [ ] O swipe não deixa barra de scroll visível ou posição intermédia persistente.
- [ ] A linha da hora aparece no âmbito escolhido e atualiza sem recarregar.
- [ ] Fases do dia, labels, cores e fundo animado coincidem com o website.
- [ ] Reduced Motion desativa/reduz animações conforme existente.

## 7. Criar e editar atividades

- [ ] Toque/click na grelha abre criação na data e slot de 30 minutos corretos.
- [ ] Botão principal/FAB abre criação com valores predefinidos existentes.
- [ ] Cria atividade João, Sofia e casal.
- [ ] Atividade de casal ocupa as duas faixas sem sobreposição visual errada.
- [ ] Título, descrição, URL, datas, horas e limites mantêm validações/mensagens.
- [ ] Atividade que termina à meia-noite e atividade de vários dias segmentam corretamente.
- [ ] Guardar apresenta imediatamente o estado local/sincronização esperado.
- [ ] Abrir detalhes por toque não inicia drag involuntário.
- [ ] Editar preserva criador, versão e campos não alterados.
- [ ] Cancelar edição não grava mudanças.
- [ ] Cancelar atividade, reativar e remover obedecem às confirmações existentes.
- [ ] O utilizador sem permissão não consegue alterar/remover o que as regras de UI proíbem.
- [ ] O outro utilizador consegue criar/editar/remover o comentário único conforme regras atuais.

## 8. Recorrência e conflitos

- [ ] Testa cada opção atual de recorrência e os respetivos limites.
- [ ] Ocorrências aparecem nas datas certas e não são duplicadas entre janelas.
- [ ] Editar apenas uma ocorrência cria/aplica a exceção correta.
- [ ] Editar a série altera todas as ocorrências esperadas.
- [ ] Cancelar/remover apenas uma ocorrência não afeta a série indevidamente.
- [ ] Uma exceção continua aplicada depois de navegar, recarregar e usar outro cliente.
- [ ] Atividades sobrepostas mostram o layout/larguras corretos.
- [ ] Conflito de edição entre dois clientes apresenta o estado/mensagem existente.
- [ ] Depois do conflito, atualizar/repetir não perde silenciosamente dados.

## 9. Drag, resize e métodos de entrada

- [ ] Pressão longa inicia movimento; um scroll normal não move a atividade.
- [ ] Drag vertical respeita 07:00–24:00 e snap de 30 minutos.
- [ ] Drag horizontal muda data/faixa apenas quando permitido.
- [ ] Resize superior e inferior preserva duração mínima/limites/snap.
- [ ] Drag/resize de atividades de casal e de vários dias mantém segmentos coerentes.
- [ ] Largar fora/gesto cancelado restaura estado sem gravação parcial.
- [ ] A página não seleciona texto nem abre callout durante drag.
- [ ] Testa toque no iPhone e iPad.
- [ ] Testa Apple Pencil no Canvas e nos controlos onde aplicável.
- [ ] Testa rato/trackpad no iPad: click, hover não obrigatório, drag e scroll.
- [ ] Com VoiceOver, existe alternativa operável aos gestos que não são acessíveis.

## 10. Emojis, avatar e multimédia

- [ ] Botão Emoji abre o seletor completo offline.
- [ ] Pesquisa PT e fallback EN devolvem resultados coerentes.
- [ ] Selecionar emoji insere na posição do cursor em título e descrição.
- [ ] Shortcodes sugerem, navegam por teclado e substituem sem destruir texto.
- [ ] Fechar/reabrir seletor não duplica handlers ou componentes.
- [ ] Canvas do avatar aceita traços contínuos em escalas/orientações diferentes.
- [ ] Cores, espessura, borracha, undo, redo, limpar e guardar funcionam.
- [ ] Avatar respeita o limite/compactação atual e sincroniza no outro cliente.
- [ ] Sons on/off persistem e os mesmos eventos reproduzem os sons existentes.
- [ ] Primeiro som só ocorre depois de interação permitida pelo iOS.
- [ ] Background/foreground retoma o `AudioContext` sem áudio duplicado.
- [ ] Modo silencioso, volume e saída Bluetooth são observados e documentados, não confundidos com falha da app.

## 11. Exportação, impressão e links

Para um conjunto conhecido, compara os bytes/texto com os exportadores web:

- [ ] JSON preserva conteúdo, indentação, timezone e `exportedAt` esperado.
- [ ] CSV preserva cabeçalhos, quoting, acentos e novas linhas.
- [ ] ICS preserva eventos, recorrências/exceções, timezone e line endings.
- [ ] No website, os três formatos continuam a fazer download por Blob.
- [ ] No iOS/iPadOS, cada formato abre a folha de partilha com nome/tipo correto.
- [ ] Cancelar partilha não mostra erro; concluir não deixa ficheiro temporário permanente.
- [ ] No iPad, a folha de partilha é popover estável em portrait, landscape e Split View.
- [ ] “Imprimir” abre UI nativa; cancelar resolve sem erro falso.
- [ ] Impressão usa A4 horizontal e quebra em múltiplas páginas quando necessário.
- [ ] “Partilhar PDF” cria um PDF legível, abre Share e limpa o temporário.
- [ ] PDF preserva estilos de impressão, datas, atividades e não inclui controlos ocultos.
- [ ] AirPrint é validado num dispositivo/impressora reais ou fica explicitamente pendente.
- [ ] Links HTTPS válidos abrem no browser nativo e regressam à aplicação.
- [ ] Links HTTP válidos têm o comportamento definido; outros esquemas/URLs inválidos são bloqueados.
- [ ] Um link externo não substitui o conteúdo local nem deixa um WebView vazio.

## 12. Rede, Firebase e ciclo de vida

- [ ] Autenticação anónima conclui em `capacitor://localhost`.
- [ ] Leitura inicial carrega settings, perfis, atividades e overrides existentes.
- [ ] Listeners realtime recebem criação, edição e remoção feitas no website.
- [ ] Uma alteração na app aparece no website sem refresh manual.
- [ ] Transações mantêm versão/conflito e as regras não foram alteradas.
- [ ] Ativa modo de voo: UI anuncia offline/cache e ações não desaparecem silenciosamente.
- [ ] Desativa modo de voo: reconecta, sincroniza uma vez e resolve o estado.
- [ ] Alterna Wi-Fi/dados móveis e rede sem Internet; Network e Firestore podem mostrar estados diferentes sem mensagem enganadora.
- [ ] Vai ao background durante pelo menos um minuto e regressa: hora/rede atualizam, seleção/sessão mantêm-se e dados recuperam.
- [ ] Repete background/foreground dez vezes e confirma que cada evento remoto é processado uma vez.
- [ ] Mudança de dia/fuso do sistema é tratada segundo `Europe/Lisbon` sem duplicar datas.
- [ ] Lock do ecrã e memory pressure não causam ecrã branco no regresso.

## 13. Layout universal e teclado

- [ ] iPhone portrait/landscape respeita notch, Dynamic Island e indicador inferior.
- [ ] iPad suporta portrait, portrait invertido e ambos os landscapes.
- [ ] Layout iPad regular aproveita a largura sem ampliar desproporcionalmente a UI móvel.
- [ ] Split View metade e um terço, Slide Over e resize contínuo alternam para compacto sem reload.
- [ ] Stage Manager redimensiona sem scroll horizontal global, conteúdo cortado ou diálogo perdido.
- [ ] Modais têm largura/altura máxima, scroll interno e botões alcançáveis.
- [ ] Seletor de emojis cabe com teclado aberto e nas larguras estreitas do iPad.
- [ ] Teclado não cobre título, descrição, datas, recorrência ou botões de guardar.
- [ ] Focar campos faz scroll apenas do contentor necessário; fechar teclado restaura layout.
- [ ] Hardware keyboard: Tab/Shift+Tab, Enter, Escape e setas funcionam onde suportado.
- [ ] Dynamic Type em pelo menos tamanhos Normal, Extra Large e maior tamanho utilizável não perde ações essenciais.
- [ ] Não existe scroll horizontal da página em 320 px nem nas configurações iPad testadas.
- [ ] A pré-visualização móvel continua visível, abre iframe local, roda/recarrega e fecha.

## 14. Acessibilidade

- [ ] VoiceOver anuncia bloqueio, seleção de utilizador, navegação, atividade, estado de ligação e mensagens ARIA.
- [ ] Ordem de foco de todos os diálogos é lógica, foco fica contido e regressa ao acionador ao fechar.
- [ ] Controlos só com ícone têm nome acessível e alvo tátil adequado.
- [ ] Não depende apenas de cor para utilizador, conflito, cancelamento ou erro.
- [ ] Contraste e zoom de texto não ocultam informação essencial.
- [ ] Reduce Motion é respeitado em fundo, transições e feedback.
- [ ] Bold Text/Increase Contrast não causam bloqueios graves.
- [ ] Orientação não é bloqueada sem necessidade funcional.

## 15. Critério de aprovação

Uma build candidata só está aprovada quando:

- todos os testes automatizados passam numa instalação limpa;
- website, iPhone e iPad mantêm as funcionalidades acima;
- não há regressões bloqueantes em Split View/teclado/safe areas;
- Firebase foi validado entre pelo menos dois clientes sem alterar schema/regras;
- exportações são equivalentes e impressão/PDF/partilha foram testados fisicamente;
- não existem recursos runtime remotos salvo as APIs Firebase;
- todas as pendências estão registadas com dispositivo, passos e erro, sem afirmar que passaram.

Anexa ao relatório final: saída dos comandos, screenshots sem dados privados, versões, itens não testados e links para bugs encontrados.
