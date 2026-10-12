# OVR, equipas equilibradas e cartas especiais

Este documento descreve o cálculo implementado no frontend e nas funções Firebase. As funções partilhadas estão em `js/utils.js` e `js/team-balance.js`. Os valores abaixo correspondem às regras atuais; o administrador pode alterar os pesos individuais dos atributos.

## 1. Atributos e pesos do OVR

A carta tem 12 atributos: Velocidade, Finalização, Passe, Drible, Defesa, Físico, Guarda-redes, Resistência, Visão de jogo, Posicionamento, Jogo de equipa e Compostura.

Cada atributo (s_k) está entre 0 e 99. O administrador define uma percentagem (w_{p,k}) para cada posição principal p, entre 0% e 100%, com até duas casas decimais:

$$
\forall p\in\{GR,DEF,ALA,MED,AV\},\quad\sum_{k=1}^{12}w_{p,k}=100.
$$

O OVR é:

$$
OVR=\operatorname{round}\left(\sum_{k=1}^{12}s_k\frac{w_{p,k}}{100}\right).
$$

Os pesos são específicos de cada atributo e posição principal. Mudar a posição principal muda o conjunto de pesos usado; posições secundárias não entram na conta. Um peso de 0% exclui esse atributo do OVR, mas o atributo continua na carta e pode dar um playstyle.

Exemplo: Velocidade 80 com peso 25%, Passe 60 com peso 75% e restantes atributos com peso 0%:

$$
OVR=\operatorname{round}(80\times0{,}25+60\times0{,}75)=65.
$$

Para evitar erros de ponto flutuante na soma das percentagens, o código converte os pesos para centésimos de percentagem, cuja soma deve ser 10000. A soma ponderada é dividida por 10000 e só depois arredondada.

Os valores iniciais, em %, são:

| Atributo       |      GR |     DEF |     ALA |     MED |      AV |
| -------------- | ------: | ------: | ------: | ------: | ------: |
| Velocidade     |       3 |       8 |      18 |       6 |      12 |
| Finalização    |       1 |       2 |      10 |       6 |      25 |
| Passe          |       8 |       8 |      12 |      22 |       5 |
| Drible         |       2 |       3 |      18 |      10 |      15 |
| Defesa         |       5 |      25 |       5 |       8 |       2 |
| Físico         |      10 |      15 |       8 |       5 |      10 |
| Guarda-redes   |      35 |       0 |       0 |       0 |       0 |
| Resistência    |       5 |      10 |      12 |      10 |       7 |
| Visão de jogo  |       5 |       5 |       5 |      15 |       4 |
| Posicionamento |      12 |      12 |       4 |       6 |      10 |
| Jogo de equipa |       6 |       7 |       4 |       8 |       3 |
| Compostura     |       8 |       5 |       4 |       4 |       7 |
| **Total**      | **100** | **100** | **100** | **100** | **100** |

Uma configuração global válida anterior é copiada para todas as posições, preservando os pesos já escolhidos até o admin os diferenciar. Sem configuração válida, são usados os valores iniciais acima. Sem posição reconhecida, usa-se a distribuição global de referência (aproximadamente uniforme). A auditoria guarda a posição e os pesos efetivamente usados em cada carta. As referências de OVR já guardadas em jogos encerrados permanecem fixas.

**Administração → Pesos do OVR → Guardar pesos e recalcular** guarda `settings/ovr` e recalcula cartas em evolução; snapshots fechados permanecem preservados. A escrita é feita pela função `saveOvrWeights`, que valida o total e exige um administrador ativo. O browser não pode escrever diretamente a configuração.

## 2. A base: autoavaliação e comunidade

A autoavaliação e cada avaliação da comunidade usam a escala 0–20. Para cada atributo, seja (a_k) a autoavaliação e (c_k) a média dos votos externos submetidos:

$$
I_k=\begin{cases}
a_k,&\text{sem votos externos;}\\
0{,}2a_k+0{,}8c_k,&\text{com pelo menos um voto externo.}
\end{cases}
$$

A base da carta, na escala 0–99, é:

$$
B_k=\operatorname{round}\left(\frac{99}{20}\operatorname{clamp}(I_k,0,20)\right).
$$

A carta exige os 12 atributos da autoavaliação preenchidos. É provisória até ter pelo menos 3 avaliações externas submetidas; a partir daí é oficial. Um voto editado continua a ser um único voto.

## 3. Sorteio automático de equipas

Na página de um jogo editável e ainda não encerrado:

1. Escolher os participantes em **Escolher jogadores**. Jogadores sem carta completa ficam fora do sorteio.
2. Clicar em **Sortear equipas equilibradas**.
3. Sortear novamente se se pretender outra combinação, ou ajustar manualmente.
4. Guardar o jogo para confirmar a composição. O sorteio por si só não guarda nada.

O sorteio aceita entre 2 e 60 jogadores diferentes. Divide-os em grupos com tamanhos que diferem no máximo por um jogador. Os primeiros cinco de cada grupo são titulares; os restantes são suplentes. Com menos de dez participantes, há menos de cinco titulares por equipa.

São geradas **600 propostas** usando embaralhamento Fisher–Yates. Para cada proposta, calculam-se as médias de todos os participantes e as médias dos titulares:

$$
\mu_T=\frac{1}{n_T}\sum_{i\in T}OVR_i,
\qquad
\mu_{T,\mathrm{tit}}=\frac{1}{n_{T,\mathrm{tit}}}\sum_{i\in T_{\mathrm{tit}}}OVR_i.
$$

A qualidade da proposta é medida por:

$$
Q=\max\left(|\mu_A-\mu_B|,\ |\mu_{A,\mathrm{tit}}-\mu_{B,\mathrm{tit}}|\right).
$$

Se (Q_{\min}) for o menor valor encontrado, as propostas elegíveis são:

$$
Q\leq Q_{\min}+1.
$$

As composições repetidas são removidas e escolhe-se aleatoriamente uma proposta elegível. Quando existem alternativas elegíveis, evita-se repetir a composição anterior. A ordem dos nomes dentro do mesmo grupo não conta como uma nova combinação; trocar titulares por suplentes conta.

O objetivo é equilibrar tanto o plantel completo como os titulares, mantendo variedade. Não é uma pesquisa exaustiva: não promete encontrar o ótimo matemático global, nem uma diferença absoluta sempre inferior a 1. Com poucos jogadores ou OVR muito diferentes, algum desequilíbrio é inevitável. O algoritmo não impõe posições nem minutos jogados.

## 4. Diferença e desvio mostrados no jogo

A média principal inclui **titulares e suplentes**, pois todos podem receber avaliações e contam como participantes. As médias dos titulares são mostradas separadamente.

A diferença absoluta entre equipas é:

$$
D=|\mu_A-\mu_B|.
$$

O desvio médio mostrado usa as duas equipas com igual peso. Seja (m=(\mu_A+\mu_B)/2):

$$
MAD=\frac{|\mu_A-m|+|\mu_B-m|}{2}=\frac{D}{2}.
$$

Isto descreve a diferença **entre as médias das equipas**, não a dispersão dos jogadores dentro de cada equipa. Por exemplo, médias 60 e 70 dão diferença 10 e desvio médio 5.

Antes do encerramento, são valores de prévia calculados com as cartas atuais. Ao processar o encerramento, o backend calcula e guarda uma referência em `gameBalances/{gameId}`. O cálculo exclui o próprio jogo e os jogos encerrados posteriormente, usando as avaliações anteriores disponíveis no momento do processamento. Os feedbacks de jogos anteriores só entram se tiverem sido submetidos até à data de encerramento do jogo de referência.

O registo guarda os OVR individuais, médias, cobertura de cartas, pesos do OVR usados, ajustes, composição das equipas e data de encerramento. As alterações posteriores nas cartas ou nos pesos não modificam este registo. Corrigir só o resultado mantém a referência; mudar a composição ou reabrir e voltar a encerrar exige uma nova referência. Reabrir remove o registo anterior; eliminar o jogo também o remove.

A referência é calculada pelo Firebase e não pode ser manipulada por escrita direta do browser. A criação é assíncrona: se ainda não estiver disponível depois de encerrar, aparece um aviso. Navegar novamente para o jogo ou atualizar manualmente permite consultar o registo, sem refresh automático da página.

Jogos antigos sem referência guardada têm ajuste zero; não se inventam OVR passados usando as cartas atuais. Se faltar uma carta completa em qualquer equipa, as médias conhecidas podem ser mostradas, mas **ambas as equipas recebem ajuste zero**. Um registo incompatível com a composição ou com a data de encerramento também não é usado.

## 5. Ajuste de equilíbrio: equipa mais fraca e mais forte

Para uma equipa (T), a diferença com sinal é a média do adversário menos a própria média:

$$
d_T=\mu_{\mathrm{adversário}}-\mu_T.
$$

O ajuste é aditivo, medido em pontos da contribuição do jogo na escala 0–99:

$$
b_T=\operatorname{clamp}(0{,}15d_T,-3,+3).
$$

Assim:

- Equipas com a mesma média recebem 0.
- A equipa mais fraca recebe um ajuste positivo.
- A equipa mais forte recebe um ajuste negativo.
- Uma diferença de 10 OVR dá ±1,5 pontos.
- Uma diferença de 20 OVR ou superior atinge o limite de ±3 pontos.
- Os dois ajustes são simétricos: (b_A=-b_B).

Se (r_T=+1) numa vitória, (0) num empate e (-1) numa derrota, o ajuste total do resultado é:

$$
\Delta_T=5r_T+b_T.
$$

| Resultado | Equipa mais fraca, ajuste máximo | Equilíbrio | Equipa mais forte, ajuste máximo |
| --------- | -------------------------------: | ---------: | -------------------------------: |
| Vitória   |                               +8 |         +5 |                               +2 |
| Empate    |                               +3 |          0 |                               −3 |
| Derrota   |                               −2 |         −5 |                               −8 |

Uma derrota da equipa mais fraca é menos penalizada, mas não se transforma numa recompensa apenas por perder. Uma derrota da favorita pesa mais. Uma vitória da equipa mais fraca é mais valorizada; a vitória da favorita recebe um ganho menor. No empate, a equipa mais fraca supera a expectativa e a favorita fica abaixo dela.

**Estes valores não são pontos adicionados diretamente ao OVR final.** Ajustam primeiro a contribuição de cada atributo desse jogo; depois são diluídos pela base e pelos restantes jogos. Uma boa avaliação pode continuar a melhorar a carta mesmo numa derrota, e uma avaliação fraca pode piorá-la mesmo numa vitória. A diferença de golos não altera o ajuste.

## 5.1. Golos, assistências e trabalho de equipa

No resultado de cada jogo, o responsável regista os golos e assistências de titulares e suplentes. Admin e DBS podem corrigir também jogos finalizados; o criador edita enquanto o jogo não estiver finalizado. Cada quantidade é um inteiro não negativo. O total de golos atribuídos e o total de assistências de uma equipa não podem exceder o resultado dessa equipa. É possível deixar golos sem autor conhecido. As regras Firestore verificam também que cada autor pertence à equipa correta.

O campo opcional `performance` guarda listas de IDs por equipa, com uma ocorrência por golo ou assistência. Jogos antigos sem o campo contam zero golos e assistências individuais; o resultado coletivo permanece disponível. Estatísticas acumuladas só contam jogos finalizados. Corrigir as listas ou o resultado recalcula os atributos e o histórico, preservando a referência OVR se as equipas não mudarem.

Sejam $g$ os golos, $a$ as assistências e $v=1$ para uma vitória, $v=0$ nos restantes resultados. Os bónus na **contribuição desse jogo**, em pontos 0–99, são:

| Atributo           | Bónus $b_{g,k}$ |
| ------------------ | --------------- |
| Finalização        | $\min(6,2g)$    |
| Passe              | $\min(6,2a)$    |
| Drible             | $\min(4,g+a)$   |
| Trabalho de equipa | $3v$            |
| Restantes          | $0$             |

A vitória mantém o ajuste geral de +5, acrescido de +3 apenas em trabalho de equipa. Estes bónus são aplicados antes do limite 0–99 e antes da média com a base e outros jogos; não são somados diretamente ao OVR. Muitos golos num só jogo não ultrapassam os limites de +6 em finalização/passe e +4 em drible. A performance e os restantes fatores continuam a poder melhorar ou piorar a carta.

## 6. Como as estrelas entram nos atributos

Depois do encerramento, colegas participantes avaliam o jogador de 0 a 5 estrelas nas dimensões de performance geral, ataque, passe, defesa, físico, guarda-redes e atitude. As médias usam apenas votos submetidos e valores numéricos; guarda-redes N/A não é zero. Não há autoavaliação pós-jogo.

A conversão das estrelas é:

$$
F(x)=\operatorname{round}\left(\frac{99}{5}\operatorname{clamp}(x,0,5)\right).
$$

As dimensões correspondem aos atributos assim:

| Dimensão     | Atributos                            |
| ------------ | ------------------------------------ |
| Ataque       | Finalização, Drible                  |
| Passe        | Passe, Visão de jogo, Jogo de equipa |
| Defesa       | Defesa, Posicionamento               |
| Físico       | Velocidade, Físico                   |
| Guarda-redes | Guarda-redes                         |
| Atitude      | Resistência, Compostura              |

Se (p_{g,k}) for a média da dimensão correspondente no jogo (g), e (o_g) a performance geral:

$$
R_{g,k}=0{,}9F(p_{g,k})+0{,}1F(o_g).
$$

Atitude é obrigatória nos novos votos e começa em 0. Nos votos antigos sem atitude, não se inventa uma nota: resistência mantém a dimensão físico e compostura mantém ataque até haver uma média de atitude válida nesse jogo. Zero é uma nota válida e participa na média.

Na ausência de performance geral numérica, usa-se a dimensão principal em seu lugar. A contribuição final do jogo é:

$$
G_{g,k}=\operatorname{round}\left(\operatorname{clamp}(R_{g,k}+\Delta_T+b_{g,k},0,99)\right).
$$

Se a dimensão estiver N/A ou sem votos e houver um ajuste ou bónus diferente de zero, usa-se a base (B_k) como referência para o ajuste:

$$
G_{g,k}=\operatorname{round}\left(\operatorname{clamp}(B_k+\Delta_T+b_{g,k},0,99)\right).
$$

Se não houver dimensão válida **nem ajuste nem bónus**, esse jogo não entra na média desse atributo. Portanto um empate com equipas iguais e sem avaliações não altera a carta; um empate desequilibrado pode contribuir com o ajuste de expectativa.

A base tem peso 3 e cada contribuição válida de um jogo tem peso 1:

$$
s_k=\operatorname{round}\left(\frac{3B_k+\sum_{g\in V_k}G_{g,k}}{3+|V_k|}\right).
$$

Um jogo conta uma vez, independentemente de receber um voto ou dez votos. O número de votos melhora a informação da média, sem multiplicar o peso do jogo na carta. Com base 60, uma única contribuição 63 resulta em ((3\times60+63)/4=60{,}75\), ou atributo 61.

Depois dos atributos, aplica-se a fórmula ponderada do OVR da secção 1. **Admin → Jogadores → Cálculo OVR** mostra valores, pesos, contribuições e arredondamentos da carta atual ou histórica.

## 7. Cartas base

A família e raridade dependem do OVR final:

| OVR   | Carta base   |
| ----- | ------------ |
| 0–49  | Bronze comum |
| 50–64 | Bronze rara  |
| 65–69 | Silver comum |
| 70–74 | Silver rara  |
| 75–84 | Gold comum   |
| 85–99 | Gold rara    |

## 8. Cartas especiais por performance

As cartas especiais usam as **médias originais das estrelas**, sem boost de equilíbrio. O ajuste não fabrica uma avaliação de 5 estrelas, nem altera a opinião dos colegas. Jogos sem performance geral numérica não entram na sequência destas cartas.

A sequência é ordenada por data de encerramento. Nas cartas históricas, só entram jogos e feedbacks disponíveis até à semana consultada.

| Carta especial        | Condição implementada                                                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forma lendária        | Últimos 5 jogos válidos: média geral ≥4,5 e todos ≥4.                                                                                                                                                          |
| Cinco estrelas        | Últimos 3 jogos válidos: a mesma dimensão de feedback tem exatamente 5 em todos os três. Pode incluir performance geral ou guarda-redes.                                                                       |
| Melhor em campo / MVP | Pelo menos 3 avaliações submetidas para o jogador nesse jogo, média geral ≥4,8 e igual à maior média geral do jogo. Empates no máximo permitem vários MVP. Basta ter um jogo com MVP no histórico considerado. |
| Hot streak            | Últimos 3 jogos válidos: performance geral ≥4,2 em todos.                                                                                                                                                      |
| In form               | Últimos 2 jogos válidos: performance geral ≥4 em ambos.                                                                                                                                                        |
| Playmaker             | Nos últimos 3 jogos com dimensão passe numérica e performance geral válida: média de passe ≥4,7.                                                                                                               |
| Sniper                | Idem para ataque: média ≥4,7.                                                                                                                                                                                  |
| The wall              | Idem para defesa: média ≥4,7.                                                                                                                                                                                  |
| Engine                | Idem para físico: média ≥4,7.                                                                                                                                                                                  |
| Mãos seguras          | Entre os últimos até 3 jogos com guarda-redes numérico e performance geral válida, pelo menos 2 têm guarda-redes ≥4,7.                                                                                         |

Podem existir várias especiais elegíveis ao mesmo tempo. O desenho da carta usa a primeira segundo esta prioridade: Forma lendária → Cinco estrelas → MVP → Hot streak → In form → Playmaker → Sniper → The wall → Engine → Mãos seguras. As condições são reavaliadas quando o histórico é recalculado; uma carta de sequência pode deixar de ser elegível quando entram novas performances.

O mínimo de 3 votos é específico do MVP. As restantes especiais usam as médias disponíveis dos jogos válidos; não exigem automaticamente 3 votos por jogo. O ranking semanal é separado e exige pelo menos 2 votos por jogo para considerar a performance; sem informação suficiente usa o OVR como referência.

## 9. Playstyles

Um atributo com valor ≥90 dá acesso ao ícone correspondente, quando existe um asset. Atualmente existem ícones para os primeiros oito atributos da lista. A carta mostra no máximo 3, escolhendo os maiores valores; empates seguem a ordem dos atributos. Cartas históricas usam os seus valores guardados. Playstyles são indicadores visuais, não acrescentam pontos ao OVR.

## 10. Aplicação e verificações

Publicar a alteração completa com `npm.cmd run deploy`: são necessários frontend, funções e regras Firestore que permitam ler `gameBalances` e impeçam escrita direta. Recalcular a liga aplica a nova lógica às cartas, mantendo referências de equilíbrio já guardadas e ajuste zero nos jogos antigos sem referência.

Os testes cobrem variedade dos sorteios, titulares e suplentes, ausência de duplicados, diferenças de OVR, limites e simetria do boost, efeitos de vitória/empate/derrota, N/A, estabilidade da referência, recálculo no backend, permissões e interface desktop/mobile.

## 9. Fecho e abertura das cartas semanais

Hora local: **Europe/Lisbon**, incluindo mudanças de horário de verão/inverno. O ciclo abre **quinta-feira às 20h** e fecha **quarta-feira seguinte às 12h**. O identificador é a semana ISO da quinta-feira de abertura. A pausa decorre entre quarta às 12h e quinta às 20h.

Enquanto aberto, a carta evolui pelos dados atuais, mantendo a base de peso 3 e jogos de peso 1. No fecho, o snapshot guarda e bloqueia OVR, atributos, especiais, posição, pesos/fórmula e aparência. O backend não reescreve snapshots bloqueados, mesmo quando um admin corrige um jogo, uma avaliação ou os pesos. Os dados originais podem ser corrigidos, mas os efeitos entram apenas numa carta aberta ou no ciclo seguinte.

As tarefas Firebase `closeCardWeek` (`0 12 * * 3`) e `openCardWeek` (`0 20 * * 4`) usam o fuso de Lisboa e percorrem os jogadores ativos. A abertura cria a nova carta de cada jogador com autoavaliação completa, com a base, resultados e avaliações acumulados disponíveis nesse momento. Não se reiniciam os atributos a zero. Perfis sem autoavaliação completa mantêm a carta pendente.

O cliente lê os snapshots públicos em `weeklyCards` durante a pausa; as regras não permitem ao browser alterar o conteúdo ou desbloquear cartas. `ensureHistory` recupera bloqueios/aberturas caso uma tarefa tenha atrasado. A recuperação preserva o último snapshot produzido; não recalcula uma carta já fechada com dados posteriores. O ciclo anterior continua disponível no histórico. Não há refresh automático da página.

## Ausências consecutivas

Só contam jogos finalizados depois da criação da conta (ou da autoavaliação, se faltar essa data). Jogos abertos, rascunhos e datas futuras não contam. A sequência é a dos jogos mais recentes da liga sem participação; ser titular ou suplente reinicia-a.

Para `n` ausências seguidas, a penalização em pontos de OVR é:

```text
P(n) = 0,                                      n < 4
P(n) = min(10, round(2 + (n − 4) × 8 / 3)),      n ≥ 4
OVR final = max(0, OVR calculado − P(n))
```

4 jogos: −2; 5: −5; 6: −7; 7 ou mais: −10. A penalização é aplicada ao OVR, sem modificar atributos nem votos. Ao regressar, deixa de se aplicar; a evolução normal dos jogos continua. O perfil apresenta a penalização e o administrador vê o OVR base e a dedução. O sorteio usa o OVR final e a referência de equilíbrio de um jogo usa apenas as ausências anteriores à sua finalização. Finalizar, reabrir ou eliminar jogos recalcula também os jogadores ausentes. Cartas de semanas fechadas permanecem imutáveis.

## Ganho acelerado até 70

Jogo de equipa, posicionamento, compostura e visão de jogo recebem o dobro do ganho positivo de cada jogo enquanto o atributo está abaixo de 70. A parte acima de 70 segue o ritmo normal. As descidas e os restantes atributos não são duplicados; autoavaliação e votos da comunidade mantêm o peso original. A regra aplica-se ao atributo antes do cálculo do OVR.

Os jogos são processados cronologicamente. Seja `N_i` a média normal do atributo depois do jogo `i`, e `A_i` o valor com aceleração. Inicialmente ambos correspondem à base. Para cada jogo com contribuição válida:

```text
d_i = N_i − N_(i−1)
b_i = min(max(d_i, 0), max(70 − A_(i−1), 0) / 2)
A_i = clamp(A_(i−1) + d_i + b_i, 0, 99)
```

O bónus `b_i` só existe para os quatro atributos indicados. Por exemplo, em 60 um ganho normal de 3 passa a 6; em 69 um ganho normal de 2 passa a 2,5 (o primeiro meio ponto leva a 70 ao dobro do ritmo, e o restante ganha normalmente). Em 70 ou acima, não há bónus novo. O arredondamento é feito apenas no valor final da carta. A auditoria apresenta a média normal e o bónus adicional acumulado. A mesma fórmula é usada no frontend, nos históricos e na referência OVR das equipas; semanas já fechadas mantêm-se imutáveis.

## Fotografia da carta semanal

O admin pode editar apenas a fotografia e o seu enquadramento durante a semana aberta, através do botão “Editar foto de carta” no perfil do jogador. Admin → Cartas serve apenas para consultar tipos padrão e criados, com a opção de usar um jogador na pré-visualização. A edição da fotografia não altera atributos, OVR, raridade ou prémios especiais. Os ajustes são independentes da fotografia do perfil e identificados por jogador e semana. O histórico e a carta publicada guardam a imagem e os ajustes; ao fechar a semana, tornam-se imutáveis com o resto da carta. Na semana seguinte, aplica-se a fotografia do perfil, salvo nova edição do admin.
