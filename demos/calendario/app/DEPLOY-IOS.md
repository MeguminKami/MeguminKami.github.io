# Compilar, instalar e publicar em iOS/iPadOS

Este guia parte do princípio de que o repositório já contém a implementação web e a pasta `app`. Não executa qualquer publicação automaticamente. Os passos de Xcode, assinatura, simulador e dispositivo continuam pendentes até serem feitos num Mac.

## 1. Pré-requisitos

1. Usa um Mac suportado pela versão de Xcode escolhida. Para submissões atuais é necessário Xcode 26 ou superior com o SDK iOS 26; consulta sempre a tabela [Xcode support](https://developer.apple.com/support/xcode/) porque cada atualização pode exigir um macOS mais recente.
2. Instala o Xcode pela App Store ou pelo portal Apple Developer. Abre-o uma vez, aceita a licença e deixa instalar os componentes.
3. Em Xcode, abre **Settings > Locations** e seleciona a versão instalada em **Command Line Tools**. Confirma no Terminal:

   ```sh
   xcode-select -p
   xcodebuild -version
   ```

4. Instala Node.js 22 ou superior e confirma:

   ```sh
   node --version
   npm --version
   ```

5. Cria ou usa uma conta Apple ID. Uma conta gratuita permite testes limitados no teu dispositivo, mas a assinatura expira rapidamente e várias capacidades/distribuição não estão disponíveis.
6. Adere ao Apple Developer Program para TestFlight, App Store, distribuição continuada e gestão completa de certificados/perfis.
7. Para testes físicos, prepara um iPhone e um iPad com iOS/iPadOS 15.4 ou superior e um cabo de dados. Depois da primeira ligação, podes ativar **Connect via network** no Xcode.
8. Confirma no projeto Firebase existente:

   - Authentication anónima está ativa;
   - Cloud Firestore existe e tem as regras atuais publicadas;
   - a configuração em `js/config.js` é a pretendida;
   - os caminhos continuam sob `spaces/joao-sofia` e não será usado um projeto de produção alheio para testes destrutivos.

Não são necessários CocoaPods, Firebase nativo nem `GoogleService-Info.plist`; o projeto usa Capacitor com Swift Package Manager e Firebase Web SDK.

## 2. Preparar o projeto num Mac

1. Copia a pasta sem excluir ficheiros versionados ou clona o repositório. Exemplo:

   ```sh
   git clone URL_DO_REPOSITORIO portfolio
   ```

2. Abre **Terminal**.
3. Entra na pasta da aplicação. Ajusta o início do caminho à localização real:

   ```sh
   cd portfolio/demos/calendario/app
   ```

4. Instala exatamente o lockfile:

   ```sh
   npm ci
   ```

5. Executa o diagnóstico:

   ```sh
   npm run doctor
   ```

   Resolve todos os erros. Avisos sobre projeto iOS ausente são esperados apenas antes do passo 7.

6. Executa testes e cria o bundle local:

   ```sh
   npm run verify
   npm run build
   ```

7. Se `app/ios` não existir, cria-o uma vez:

   ```sh
   npm run ios:create
   ```

   Não uses este comando para “refazer” um projeto existente; ele recusa sobrescrever `ios`. Mantém alterações nativas nos templates versionados ou aplica-as conscientemente no projeto Xcode.

8. Sincroniza o bundle, pacotes Swift, configuração universal e fontes nativos:

   ```sh
   npm run sync:ios
   ```

9. Abre o projeto no Xcode:

   ```sh
   npm run ios:open
   ```

10. No navegador do Xcode, seleciona o projeto **App** e o target **App**. Confirma:

    - deployment target 15.4;
    - **Supported Destinations** inclui iPhone e iPad;
    - portrait e ambos os landscapes no iPhone;
    - portrait, portrait invertido e ambos os landscapes no iPad;
    - **Requires Full Screen** está desligado para permitir multitarefa no iPad;
    - os pacotes Swift terminaram de resolver sem erro.

## 3. Definir o Bundle ID antes de registar a app

1. Escolhe um identificador reverse-DNS que controles e que seja globalmente único.
2. Em `app/capacitor.config.json`, altera apenas `appId` e, se necessário, `appName`.
3. Dentro de `app`, executa:

   ```sh
   npm run ios:configure
   npm run sync:ios
   ```

4. No Xcode, confirma o mesmo valor em **App > Signing & Capabilities > Bundle Identifier**.
5. Só depois cria o App ID no portal Apple/App Store Connect.

Não reutilizes um Bundle ID de outra aplicação e não o mudes depois de publicar uma versão que pretendes atualizar.

## 4. Instalar diretamente num iPhone ou iPad

1. Liga o dispositivo ao Mac, desbloqueia-o e confirma **Confiar neste computador** no dispositivo e no Finder, se solicitado.
2. No Xcode, abre **Window > Devices and Simulators** e aguarda que o dispositivo fique disponível. Se aparecer “Preparing device”, deixa o processo terminar.
3. Em iOS/iPadOS 16 ou superior, depois da primeira tentativa de desenvolvimento ativa **Settings > Privacy & Security > Developer Mode**. O dispositivo reinicia; confirma a ativação.
4. Seleciona **App > Signing & Capabilities**:

   - ativa **Automatically manage signing**;
   - escolhe a tua **Team**;
   - confirma um Bundle Identifier único;
   - aguarda a criação do development certificate e provisioning profile.

5. No seletor de destino da barra superior, escolhe o iPhone ou iPad ligado, não “Any iOS Device”.
6. Executa **Product > Run** (`⌘R`). Mantém o dispositivo desbloqueado durante a instalação.
7. Se usares uma conta gratuita, pode ser necessário autorizar o programador em **Settings > General > VPN & Device Management**. O perfil e a app expiram; recompila quando necessário.
8. Faz testes reais, não apenas de arranque:

   - entra com o código e escolhe João/Sofia;
   - confirma autenticação anónima e dados Firestore;
   - cria uma atividade de teste identificável e confirma-a no website;
   - valida toque, pressão longa, drag, resize e Canvas;
   - muda de rede e regressa do background;
   - exporta, cancela e conclui a folha de partilha;
   - imprime/cria PDF;
   - repete em iPhone e iPad, incluindo Split View.

9. Remove os dados manuais de teste que criaste. Os testes automatizados não devem tocar no Firebase real.

### Erros comuns de assinatura

- **Signing requires a development team:** escolhe uma Team no target, não apenas no projeto.
- **No profiles for…:** confirma rede, Bundle ID único, assinatura automática e sessão Apple em **Xcode > Settings > Accounts**; usa **Download Manual Profiles** se necessário.
- **A valid signing certificate was not found:** em **Manage Certificates**, cria um Apple Development certificate. Não copies a chave privada para o Git.
- **Maximum number of registered devices:** remove dispositivos antigos no portal ou espera pela renovação anual; não contornes a quota com outra identidade.
- **Developer Mode disabled:** ativa-o no dispositivo e reinicia.
- **Untrusted Developer:** autoriza o perfil nas definições do dispositivo quando aplicável.

## 5. Distribuir com TestFlight

É necessária adesão ativa ao Apple Developer Program.

1. No portal Apple Developer, confirma um explicit App ID igual ao Bundle ID definitivo.
2. Em [App Store Connect](https://appstoreconnect.apple.com/), abre **Apps > + > New App**.
3. Escolhe iOS, nome, idioma principal, Bundle ID e um SKU interno. O Bundle ID não pode ser trocado mais tarde.
4. No Xcode, usa assinatura automática com a Team correta. Em **General**, define:

   - **Version**: versão pública, por exemplo `1.0.0`;
   - **Build**: inteiro sempre crescente, por exemplo `1`.

5. Executa antes do arquivo, em `app`:

   ```sh
   npm run verify
   npm run sync:ios
   ```

6. No Xcode seleciona **Any iOS Device (arm64)** ou destino equivalente e escolhe **Product > Archive**.
7. No Organizer, seleciona o arquivo e usa **Validate App**. Corrige erros de assinatura, ícones, privacy manifest ou metadados.
8. Escolhe **Distribute App > App Store Connect > Upload**, mantém a assinatura automática e conclui o upload.
9. Aguarda o processamento no App Store Connect. Pode demorar; verifica também o email do Account Holder para erros.
10. Em **TestFlight**, preenche **What to Test**, contacto e notas. Inclui o código/instruções necessárias para abrir a aplicação e explica que os dados são partilhados entre João/Sofia.
11. Adiciona testers internos. Para externos, cria um grupo e envia a build para Beta App Review; fornece todas as instruções de acesso e uma forma de testar sem depender de conhecimento privado.
12. Distribui primeiro a um grupo pequeno e executa `TESTING-IOS.md` em iPhone e iPad.

Para uma atualização, aumenta sempre **Build**. O mesmo número de build não pode ser enviado novamente para a mesma versão.

## 6. Publicar na App Store

1. Usa o ícone final gerado a partir do coração com “+”; confirma que não tem transparência nem o ícone genérico Capacitor.
2. Prepara screenshots reais para os tamanhos de iPhone e iPad pedidos no App Store Connect. Devem mostrar a versão submetida, sem dados pessoais reais.
3. Preenche nome/subtítulo, descrição, palavras-chave, categoria e copyright.
4. Publica uma **Support URL** funcional com contacto e instruções úteis.
5. Publica uma **Privacy Policy URL** acessível sem login. A política deve descrever Firebase Authentication anónima, Firestore, conteúdo introduzido pelos utilizadores, retenção e pedidos de eliminação.
6. Em **App Privacy**, responde segundo o comportamento da build e as definições Apple. Revê pelo menos identificador anónimo, atividades/comentários/avatar como conteúdo do utilizador e qualquer diagnóstico efetivamente recolhido. A aplicação não deve declarar tracking se não o faz.
7. Preenche a classificação etária honestamente. Revê conteúdo introduzido pelos utilizadores e acesso partilhado, ainda que a audiência seja privada.
8. Responde às perguntas de criptografia. Firebase usa HTTPS/TLS; confirma a isenção aplicável à build e à jurisdição em vez de adivinhar.
9. Em **App Review Information**, fornece:

   - contacto disponível;
   - código e passos exatos para entrar;
   - qual identidade escolher;
   - indicação de que a autenticação Firebase é anónima;
   - rede necessária para sincronização;
   - passos para criar dados de teste sem expor dados privados.

10. Revê o risco da App Store Review Guideline 4.2. Uma app que pareça apenas um website pode ser rejeitada por funcionalidade mínima. Esta implementação reduz o risco com bundle offline, ficheiros/partilha nativos, impressão/PDF, ciclo de vida, rede, safe areas, teclado e layout universal; isso não garante aprovação. Explica utilidade e integração nas notas de revisão.
11. Seleciona a build processada, completa preços/disponibilidade e resolve todos os avisos.
12. Escolhe lançamento manual, automático após aprovação ou faseado, conforme pretenderes.
13. Usa **Add for Review** e depois **Submit for Review**. Não publiques antes de validar a build TestFlight em dispositivos reais.

## 7. Atualizar uma versão existente

1. Altera os ficheiros partilhados na raiz; não edites `app/www`.
2. Na raiz `demos/calendario`, executa:

   ```sh
   npm test
   npm run smoke
   npm run smoke:calendar
   ```

3. Entra em `app`:

   ```sh
   cd app
   ```

4. Gera e verifica:

   ```sh
   npm run verify
   npm run build
   npm run sync:ios
   ```

5. Abre o Xcode:

   ```sh
   npm run ios:open
   ```

6. Aumenta **Version** quando houver nova versão pública e aumenta sempre **Build**.
7. Repete testes em simulador e dispositivos físicos.
8. Executa **Product > Archive**, valida e envia.
9. Distribui primeiro em TestFlight ou seleciona a build na nova versão da App Store.

## 8. Resolução de problemas

### Ecrã branco

- Executa `npm run build` e confirma que `www/index.html` e `www/js/web.js` existem.
- Executa `npm run sync:ios`; um build sem sync deixa o Xcode com conteúdo antigo.
- No simulador/dispositivo ligado ao Safari, ativa **Develop > [dispositivo] > O Que Vais Fazer?** e verifica a consola.
- Confirma que `capacitor.config.json` usa `webDir: "www"` e não contém `server.url`.
- Procura imports/CDNs rejeitados pelo build; não “resolve” apontando para o website remoto.

### Assets ou módulos não encontrados

- Usa caminhos relativos e respeita maiúsculas/minúsculas; macOS e o bundle podem distinguir nomes que o Windows tolera.
- Não edites/copies manualmente para `www`; limpa, volta a gerar e sincroniza:

  ```sh
  npm run clean
  npm run build
  npm run sync:ios
  ```

### Firebase não configurado

- Confirma `js/config.js`, sem valores `SUBSTITUIR` e com `spaceId` esperado.
- Volta a executar build/sync depois da correção.
- A configuração Firebase Web é pública por natureza; nunca uses uma chave de conta de serviço.

### `permission-denied`

- Confirma Authentication anónima ativa e utilizador autenticado.
- Compara as regras publicadas com `firestore.rules` sem as relaxar apenas para testar.
- Confirma que os documentos estão em `spaces/joao-sofia` e cumprem schema/tamanhos/versão.
- Consulta os logs apenas com uma conta autorizada e não publiques regras durante este fluxo.

### Origem não autorizada

- Regista o erro exato e confirma que a build usa `capacitor://localhost`.
- Confirma definições relevantes de Authentication/domínios no Firebase. A autenticação anónima normalmente não redireciona, mas mudanças futuras de provider podem exigir configuração adicional.
- Não muda `iosScheme`, hostname ou `allowNavigation` como atalho sem rever implicações.

### Falha de rede ou sincronização

- Confirma Internet no Safari do mesmo dispositivo e volta a abrir a app.
- Alterna modo de voo e verifica se a UI passa por offline/reconnect sem duplicar dados.
- O plugin Network indica conectividade, não disponibilidade do Firestore; consulta a mensagem Firebase.
- Confirma data/hora automáticas e ausência de VPN, proxy ou filtro DNS que bloqueie Google APIs.

### Exportação ou folha de partilha

- Confirma permissões e logs dos plugins Filesystem/Share após `npm run sync:ios`.
- Testa uma conclusão e um cancelamento; cancelar deve ser silencioso.
- No simulador, os destinos de partilha são limitados. Confirma num dispositivo físico.
- Verifica que o URI é `file://`, que o ficheiro existe antes de partilhar e é removido depois.

### Impressão ou PDF

- Confirma que `NativePrintPlugin.swift` pertence ao target App e aparece em **Compile Sources**.
- Confirma o registo em `ViewController.capacitorDidLoad()` e o nome JavaScript `NativePrint`.
- AirPrint exige uma impressora acessível; usa a pré-visualização/PDF para separar problemas de rendering de problemas da impressora.
- No iPad, confirma que a janela aparece como popover e não há outro modal a ser apresentado.

### Sem áudio

- Toca primeiro na interface; o iOS só permite iniciar/retomar `AudioContext` após interação.
- Confirma a opção de sons, volume, modo silencioso e saída Bluetooth.
- Vai ao background e regressa; o contexto deve ser retomado sem criar outro.

### Teclado cobre formulários

- Confirma os plugins Keyboard e configuração de resize depois de sync.
- Testa portrait, landscape, Split View e Dynamic Type.
- Fecha o teclado e verifica foco/scroll do diálogo. Regista modelo, versão e campo afetado antes de alterar CSS global.

### Gestos, drag ou Canvas não funcionam

- Distingue scroll curto de pressão longa; mantém o dedo/caneta imóvel até iniciar movimento.
- Testa sem VoiceOver e depois com VoiceOver, pois os gestos do leitor têm prioridade.
- Confirma `touch-action`, Pointer Events e consola do WKWebView.
- Repete com toque, Apple Pencil e trackpad/rato onde disponíveis.

### `npm ci`/`npm install` falha

- Confirma Node 22+, acesso ao registry e integridade do lockfile.
- Não uses `sudo npm`; corrige a instalação/permissões do Node.
- Se o lockfile e `package.json` divergem, identifica a alteração no Git; não apagues o lockfile para esconder o problema.
- Em rede empresarial, confirma proxy/CA com o administrador em vez de desativar TLS.

### `cap sync ios` falha

- Executa primeiro `npm run build` e `npm run doctor`.
- Confirma que `ios/` existe; caso não exista, usa `npm run ios:create` num Mac.
- Confirma que todas as dependências Capacitor usam o mesmo major e volta a resolver pacotes no Xcode.
- Não corras `cap add ios` repetidamente sobre um projeto existente.

### Xcode não compila

- Confirma Xcode/Command Line Tools selecionados e aceita a licença.
- Em **File > Packages**, usa **Resolve Package Versions**; evita **Reset Package Caches** salvo se houver corrupção comprovada.
- Lê o primeiro erro de compilação, não apenas o último. Confirma deployment target 15.4 e Swift dos templates no target.
- Limpa DerivedData pelo Xcode apenas depois de guardar o diagnóstico; não apagues fontes/projeto.

### Bundle ID já utilizado

- Escolhe outro identificador que controles em `capacitor.config.json`.
- Executa `npm run ios:configure` e `npm run sync:ios`.
- Confirma que App ID, Xcode e App Store Connect coincidem. Não tentes apropriar um ID de outra equipa.

### Assinatura continua a falhar

- Confirma Team, assinatura automática, sessão Apple, certificado válido e dispositivo registado.
- Verifica se o Bundle ID pertence à mesma Team e se o perfil inclui o dispositivo/capacidades.
- Não guardes `.p12`, provisioning profiles, Apple IDs ou passwords no repositório.

### A build não aparece no App Store Connect

- Aguarda o processamento e procura emails sobre rejeição automática.
- Confirma o Bundle ID, Team e conta App Store Connect corretos.
- O número de build tem de ser maior e único para essa versão.
- Revê **Agreements, Tax and Banking**, permissões da conta, export compliance e erros no Organizer/upload logs.
- Se a Apple rejeitou o binário, corrige e envia um novo build; o mesmo número não pode ser reutilizado.
