# O que vais fazer?

Um calendário partilhado, romântico e responsivo para João e Sofia organizarem atividades individuais e de casal. O frontend é inteiramente estático e foi preparado para GitHub Pages; a sincronização em tempo real é feita por Firebase Authentication anónima e Cloud Firestore.

## Funcionalidades

- janela móvel de sete dias, das 07:00 às 24:00, em intervalos de uma hora;
- navegação por dia, semana, mês e regresso imediato a Hoje;
- no telemóvel, um dia por ecrã com passagem por gesto lateral, encaixe automático e sem barra de deslocamento visível;
- atividades de João, Sofia e casal, com as de casal fundidas sobre as duas faixas;
- criação pela grelha ou pelo botão principal e menu por clique esquerdo para editar, cancelar ou remover;
- drag, drop e redimensionamento com rato ou toque e snap de uma hora;
- recorrência diária, semanal, dias úteis, dias escolhidos e mensal, com data final ou número de ocorrências;
- edição de uma ocorrência ou da série completa sem criar documentos futuros;
- comentário único do outro utilizador;
- emojis no título/descrição, shortcodes `:` e menu local pesquisável em português e inglês;
- avatares desenhados, vetoriais e sincronizados;
- exportação JSON, CSV e ICS e vista de impressão/PDF;
- sons discretos desligáveis, fundo animado leve e suporte para movimento reduzido;
- navegação por teclado, foco visível, diálogos e mensagens acessíveis;
- pré-visualização interativa de 320, 390 e 430 px para testar o telemóvel a partir do PC;
- estados de carregamento, sincronização, offline, conflito e erro de configuração.

## Estrutura

```text
calendario/
├── index.html                 interface e diálogos
├── css/                       design, calendário, responsividade e impressão
├── js/core/                   regras puras de datas, recorrência, layout e exportação
├── js/services/               preferências locais e acesso ao Firebase
├── js/ui/                     componentes e interações do navegador
├── data/                      sugestões iniciais de emojis
├── assets/                    sprite SVG de ícones
├── tests/                     testes unitários Node
├── firestore.rules            regras mínimas do Firestore
└── firebase.json              configuração da Firebase CLI
```

Não existe processo de compilação nem dependência de Node.js em produção. O projeto usa:

- Firebase JavaScript SDK 12.15.0, carregado do CDN oficial da Google;
- catálogo pesquisável local de emojis; a base bilingue 1.8.0 é consultada progressivamente para shortcodes menos comuns;
- formas de ícones Lucide, sob licença ISC, reunidas num sprite SVG local.

## Execução local

Os módulos ES precisam de ser servidos por HTTP; abrir `index.html` através de `file://` não é suficiente.

Na pasta `calendario/`, usa uma destas opções:

```powershell
npx serve .
```

ou, se tiveres Python disponível:

```powershell
python -m http.server 8080
```

Depois abre o endereço indicado pelo comando. Sem configuração Firebase, o ecrã, seleção de utilizador e calendário abrem normalmente, mas a interface mostra “Falta configurar o Firebase” e não permite guardar.

O código de entrada é `1005`.

## Configurar o Firebase

### 1. Criar o projeto e a aplicação Web

1. Cria um projeto na [Consola Firebase](https://console.firebase.google.com/).
2. Adiciona uma aplicação Web ao projeto.
3. Em **Authentication → Sign-in method**, ativa **Anonymous/Anónimo**.
4. Em **Firestore Database**, cria uma base de dados.
5. Escolhe uma região próxima dos utilizadores. A região não altera o fuso funcional da aplicação, que é sempre `Europe/Lisbon`.

### 2. Preencher a configuração

Abre `js/config.example.js`, copia o objeto de exemplo para `js/config.js` e substitui os valores pelos apresentados nas definições da aplicação Web Firebase:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

export const spaceId = "joao-sofia";
```

As chaves de configuração Web do Firebase identificam o projeto, mas **não são segredos administrativos**. Não coloques credenciais de contas de serviço, chaves privadas ou Firebase Admin SDK neste repositório.

### 3. Publicar as regras

Podes copiar `firestore.rules` para o separador **Rules** do Firestore e publicar, ou usar a Firebase CLI a partir desta pasta:

```powershell
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules
```

As regras exigem uma conta anónima Firebase, limitam os caminhos e validam tipos, tamanhos e versões. Não conseguem saber se quem escolheu “João” é realmente o João. Essa regra é deliberadamente aplicada no cliente.

### 4. Domínios autorizados

Em Authentication, confirma que o domínio local usado para testes e o domínio `utilizador.github.io` estão autorizados. O domínio padrão do projeto Firebase costuma ser adicionado automaticamente.

## Modelo de dados e sincronização

Os dados ficam sob estes caminhos:

```text
spaces/joao-sofia/settings/general
spaces/joao-sofia/profiles/{joao|sofia}
spaces/joao-sofia/activities/{id}
spaces/joao-sofia/occurrenceOverrides/{serie_data}
```

Cada alteração existente é executada numa transação com um número de versão. Se outro dispositivo tiver alterado o mesmo documento, a aplicação não sobrepõe silenciosamente a versão que estava no ecrã: mostra um conflito e mantém os dados recebidos do servidor.

Recorrências são regras guardadas num único documento. Apenas as ocorrências dos sete dias visíveis são calculadas no browser. Uma alteração a uma ocorrência cria um pequeno documento de exceção; não são criadas milhares de atividades futuras.

Os avatares são listas compactas de traços normalizados e não imagens carregadas pelo utilizador. Antes de guardar, os pontos são limitados ao canvas e compactados automaticamente para respeitar o máximo de 180 KB. O leitor continua compatível com desenhos guardados no formato anterior.

## Permissões e código de acesso

O código `1005` é convertido para SHA-256 antes de ser comparado. Depois de aceite, apenas a indicação de acesso concedido fica no armazenamento local. “Voltar a bloquear” remove essa indicação e limpa o calendário do ecrã.

Isto é apenas uma barreira contra acesso casual. O hash e todo o JavaScript são públicos e podem ser inspecionados ou alterados no browser. A autenticação anónima também não prova a identidade João/Sofia. Para dados sensíveis ou uma aplicação pública seria necessário usar contas reais, associar cada conta a uma identidade e reforçar as regras Firestore.

As regras informais da interface são:

- numa atividade individual, apenas o criador lógico pode editar, cancelar, remover, mover ou redimensionar;
- numa atividade de casal, ambos podem fazer essas alterações;
- apenas a outra pessoa pode escrever o comentário único;
- apenas o autor do comentário pode editá-lo ou apagá-lo.

## Publicar no GitHub Pages

1. Confirma que todos os ficheiros permanecem dentro de `calendario/`.
2. Envia o repositório para o GitHub.
3. Em **Settings → Pages**, escolhe **Deploy from a branch**, a branch pretendida e a raiz `/`.
4. Abre a subpasta publicada:

```text
https://UTILIZADOR.github.io/REPOSITORIO/calendario/
```

Se o repositório for o site pessoal `UTILIZADOR.github.io`, o endereço será `https://UTILIZADOR.github.io/calendario/`.

Os caminhos da aplicação são relativos, portanto continuam válidos nessa subpasta. O ficheiro `.nojekyll` evita processamento Jekyll desnecessário.

## Testar em dois dispositivos

1. Abre exatamente o mesmo endereço nos dois dispositivos.
2. Introduz `1005` em ambos.
3. Escolhe João num dispositivo e Sofia no outro.
4. Cria uma atividade, comenta, move-a e altera um avatar.
5. Confirma que cada alteração aparece no outro dispositivo sem recarregar.
6. Desliga temporariamente a rede e confirma o estado “Sem ligação” e a reversão de uma alteração não guardada.

## Ver o telemóvel no PC

Abre **Definições → Pré-visualização móvel**. A moldura permite:

- alternar entre 320, 390 e 430 px;
- rodar entre retrato e paisagem;
- recarregar e utilizar a aplicação dentro do ecrã simulado.

A pré-visualização usa um `iframe` com a largura real indicada, por isso ativa as mesmas regras responsivas de um telemóvel. É interativa e usa os mesmos dados Firebase: qualquer alteração que guardes dentro da moldura é real.

## Exportação

Em **Definições → Exportar**:

- JSON preserva documentos, recorrências, exceções, perfis e definições;
- CSV cria linhas para atividades/séries e exceções;
- ICS inclui `Europe/Lisbon`, RRULE, exceções, descrições, locais, links e cancelamentos;
- Imprimir abre a impressão nativa, que pode guardar a vista em PDF.

Não existe importação.

## Testes automatizados

É necessário Node.js apenas para os testes:

```powershell
npm test
```

No Windows com uma política PowerShell restritiva, usa:

```powershell
npm.cmd test
```

Os testes cobrem datas, eixo visível, snap, validação de limites, atividades de vários dias, recorrências, exceções, sobreposições, faixas, permissões, comentários, shortcodes e exportações.

Existe ainda um smoke test opcional que serve a aplicação localmente, abre o Microsoft Edge em modo headless e confirma a grelha no desktop e a 320 px:

```powershell
npm run smoke
```

No Windows com a mesma restrição PowerShell, usa `npm.cmd run smoke`. A captura de diagnóstico é guardada apenas na pasta temporária do sistema.

## Checklist manual

- desktop largo: sete dias lado a lado e coluna horária fixa;
- tablet: duas datas visíveis e scroll horizontal com snap;
- 320 px: uma data utilizável, botões e texto sem ficarem demasiado pequenos;
- rato: criação, hover, drag e as duas pegas de resize;
- toque: toque para detalhes, pressão curta para mover e pegas de resize;
- teclado: navegação da grelha, Enter/Espaço, diálogos, foco, emoji com Tab/setas/Escape;
- movimento reduzido: fundo sem deslocação e transições reduzidas;
- atividades João/Sofia/casal, simultâneas, canceladas, recorrentes e de vários dias;
- comentário criado, editado e apagado apenas por quem tem permissão;
- JSON, CSV, ICS e impressão;
- dois dispositivos, offline temporário e conflito de edição;
- consola sem erros durante utilização normal.

## Resolução de problemas

**“Falta configurar o Firebase”**  
`js/config.js` ainda contém `firebaseConfig = null` ou valores incompletos.

**“O Firebase recusou a operação”**  
Confirma Authentication anónima, publicação de `firestore.rules`, projeto correto em `config.js` e domínio autorizado.

**O site fica sem estilos ou módulos no GitHub Pages**  
Abre o endereço com `/calendario/` no final e confirma que a pasta foi enviada completa, incluindo `.nojekyll`.

**O catálogo externo de emojis não carrega**  
O menu com pesquisa e os emojis frequentes funcionam localmente, sem rede. Apenas a procura progressiva de shortcodes menos comuns depende do acesso ao jsDelivr.

**Uma edição foi revertida**  
O dispositivo ficou offline, as regras recusaram a escrita ou outro dispositivo alterou a mesma versão. O aviso apresentado distingue estes casos.

**O desenho do avatar é recusado**  
O editor tenta primeiro compactar e simplificar os pontos sem alterar visualmente a forma. Se mesmo assim ultrapassar 180 KB, usa Desfazer em alguns traços muito densos e volta a guardar.

## Atualizar bibliotecas

As versões estão fixas em `js/services/firebase-client.js` e `js/ui/emoji-picker.js`. Ao atualizá-las:

1. consulta as notas de lançamento oficiais;
2. altera uma dependência de cada vez;
3. executa `npm test`;
4. repete a checklist de emojis, autenticação e sincronização em dois dispositivos;
5. confirma que os URLs CDN continuam a aceitar módulos ES e CORS.
