# Aplicação iOS/iPadOS — O Que Vais Fazer?

Esta pasta transforma o website estático da raiz numa aplicação Capacitor universal para iPhone e iPad. A aplicação carrega uma cópia local e reproduzível do frontend; não abre o website público dentro de um `WKWebView` remoto.

## Arquitetura

Há uma única implementação das regras do calendário:

```text
raiz do projeto             fonte principal do website e regras partilhadas
        │
        ├── npm test        testes do comportamento partilhado
        │
        └── app/npm run build
                 │
                 ├── app/src        entrada e adaptador Capacitor
                 └── app/www        bundle local gerado; nunca editar à mão
                           │
                           └── app/ios        projeto Xcode gerado/sincronizado
```

- A raiz continua a servir o website normal e a usar o adaptador web.
- `src/` liga a mesma aplicação aos plugins oficiais Capacitor.
- `native/ios/` guarda os templates Swift, configuração universal, privacy manifest e SVG de origem. Estes ficheiros são aplicados pelo processo de criação/configuração do projeto.
- `www/` e os artefactos Xcode são resultados de build. Apagar `www/` é seguro: `npm run build` volta a criá-lo.
- A configuração Firebase, o `spaceId`, o modelo Firestore e o fuso `Europe/Lisbon` são partilhados com o website.

O bundle nativo inclui Firebase 12.15.0, o seletor de emojis 1.29.1 e os dados PT/EN 1.8.0. Não depende de gstatic ou jsDelivr para arrancar. As operações Firebase continuam, naturalmente, a precisar de rede.

## Requisitos

- Node.js 22 ou superior; é recomendada a mesma versão LTS em Windows e macOS.
- npm incluído com o Node.
- Para gerar, compilar, assinar ou executar iOS: um Mac com Xcode 26 ou superior e Command Line Tools selecionadas.
- Para dispositivo físico: iPhone/iPad com iOS/iPadOS 15.4 ou superior.

O build web, os testes JavaScript e verificações estáticas funcionam em Windows. Xcode, simuladores, assinatura e execução física só podem ser validados num Mac.

## Primeira preparação

Executa os comandos a partir de `demos/calendario/app`:

```sh
npm ci
npm run doctor
npm run verify
```

`doctor` é apenas diagnóstico: verifica Node, dependências, fontes web, configuração Firebase, sistema operativo e presença do projeto iOS sem modificar ficheiros.

Num Mac, se `ios/` ainda não existir:

```sh
npm run ios:create
npm run sync:ios
npm run ios:open
```

`ios:create` recusa substituir um projeto existente. Usa Swift Package Manager, copia os templates nativos e configura um target universal iPhone/iPad com deployment target 15.4.

## Comandos do dia a dia

Todos estes comandos são executados dentro de `app`:

| Comando | Efeito |
|---|---|
| `npm run doctor` | Diagnóstico não destrutivo do ambiente e projeto. |
| `npm run clean` | Remove apenas `www` e caches geradas conhecidos. Não remove `ios`. |
| `npm run build` | Gera o bundle local determinístico em `www`. |
| `npm test` | Executa os testes específicos da aplicação/adaptadores. |
| `npm run test:root` | Executa os testes partilhados na raiz. |
| `npm run smoke` | Testa o bundle compilado num browser suportado. |
| `npm run verify` | Executa testes, build e verificações estáticas disponíveis. |
| `npm run assets:ios` | Gera ícones e splash iOS a partir dos SVG versionados. |
| `npm run ios:create` | Cria uma vez o projeto Xcode, aplica templates e gera AppIcon/splash. |
| `npm run ios:configure` | Reaplica nome, App ID, orientações e configuração universal. |
| `npm run sync:ios` | Faz build, `cap sync ios`, reaplica configuração e regenera AppIcon/splash. |
| `npm run ios:open` | Abre o projeto iOS no Xcode; requer macOS. |
| `npm run ios:run` | Compila/executa através do Capacitor; requer macOS/Xcode. |

## Depois de alterar o website

1. Na raiz `demos/calendario`, executa `npm test` e os smoke tests relevantes.
2. Entra em `app`.
3. Executa `npm run build` para atualizar `www`.
4. Executa `npm test` ou, preferencialmente, `npm run verify`.
5. Num Mac, executa `npm run sync:ios`.
6. Abre o Xcode com `npm run ios:open` e testa iPhone e iPad.

Não copies manualmente módulos para `www`, não edites o bundle gerado e não uses symlinks. O script de build usa uma lista fechada de recursos e rejeita CDNs, `server.url` e caminhos absolutos acidentais.

## Nome e App ID

Antes de criar o registo na Apple, altera `appName` e `appId` em `capacitor.config.json`. O App ID deve usar reverse-DNS e ser único, por exemplo `pt.exemplo.oquevaisfazer`.

Depois executa:

```sh
npm run ios:configure
npm run sync:ios
```

Confirma no Xcode, em **App > Signing & Capabilities**, que o Bundle Identifier é exatamente o mesmo. Alterá-lo depois de publicar cria, na prática, uma aplicação diferente; decide o identificador definitivo antes do primeiro registo no App Store Connect.

## Integrações nativas

- **Filesystem + Share:** JSON, CSV e ICS são escritos temporariamente e enviados para a folha de partilha. Cancelar não mostra um erro.
- **Impressão/PDF:** `native/ios/App/NativePrintPlugin.swift` imprime o `WKWebView` ou cria PDF A4 horizontal. No iPad, a apresentação é ancorada como popover.
- **Browser:** apenas links `http:` e `https:` são entregues ao browser nativo.
- **Network:** informa a UI; o estado Firestore continua a ser a autoridade sobre sincronização.
- **App:** ao voltar do background atualiza hora/rede e retoma áudio, sem duplicar subscrições.
- **Keyboard/Status Bar/Splash:** integram a UI existente com safe areas e viewport nativo.

O PDF e as exportações são temporários e devem ser removidos pelo adaptador depois de a folha de partilha terminar.

## Atualizar dependências

As versões são exatas de propósito. Não executes uma atualização global sem revisão:

1. Consulta as release notes do Capacitor, de cada plugin, Firebase e emoji picker.
2. Atualiza em conjunto `@capacitor/core`, `@capacitor/cli` e `@capacitor/ios` para a mesma versão estável.
3. Mantém os plugins oficiais no mesmo major do Capacitor.
4. Recria o lockfile apenas através do npm; não o edites manualmente.
5. Executa `npm run verify` em Windows/macOS.
6. Num Mac, executa `npm run sync:ios` e compila os simuladores iPhone/iPad.
7. Repete a checklist de `TESTING-IOS.md` num dispositivo físico antes de distribuir.

Atualizar Firebase ou os dados de emojis pode mudar o bundle. Confirma sempre que o scan de recursos remotos continua limpo e atualiza `THIRD-PARTY-NOTICES.md` se a versão ou licença mudar.

## Documentos seguintes

- [DEPLOY-IOS.md](./DEPLOY-IOS.md): instalação direta, TestFlight e App Store.
- [TESTING-IOS.md](./TESTING-IOS.md): matriz e checklist manual.
- [SECURITY.md](./SECURITY.md): limites reais do modelo de acesso atual.
- [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md): dependências e licenças.

Nenhum comando deste projeto publica, cria contas ou faz deploy das regras Firebase automaticamente.
