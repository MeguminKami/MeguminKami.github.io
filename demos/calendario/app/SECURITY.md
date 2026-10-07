# Segurança e privacidade

## Resumo honesto

Esta aplicação preserva deliberadamente o modelo do website: código de acesso local, escolha João/Sofia no cliente, Firebase Authentication anónima e um `spaceId` fixo. Isto é adequado como barreira informal para um calendário privado de confiança, mas **não é autenticação forte nem isolamento multiutilizador**.

Não uses a aplicação atual para informação altamente sensível nem a publiques para uma audiência geral sem redesenhar identidade, autorização e regras Firestore.

## O que cada mecanismo protege

### Código de acesso local

- O JavaScript, o hash/valor de comparação e o fluxo de desbloqueio estão dentro do bundle instalado e do website público.
- Uma pessoa com acesso aos ficheiros, Web Inspector ou dispositivo comprometido pode inspecionar ou alterar esse código.
- O estado “acesso concedido” fica em armazenamento local e não é uma credencial emitida por um servidor.
- O código reduz apenas acesso casual à interface. Não protege diretamente os documentos Firestore.

### Firebase Authentication anónima

- Firebase atribui um UID técnico anónimo e permite que as regras exijam `request.auth != null`.
- Uma sessão anónima não prova que a pessoa é João ou Sofia.
- Escolher uma das identidades na interface é uma decisão client-side; um cliente modificado pode afirmar outra identidade.
- Reinstalar/limpar dados pode criar outro UID anónimo. Não existe recuperação de conta ou identidade verificável.

### `spaceId` fixo e regras atuais

- Todos os clientes configurados usam `spaces/joao-sofia` e os mesmos caminhos conhecidos.
- As regras validam autenticação, caminhos, tipos, limites e versões, mas não conseguem associar com segurança um UID anónimo a João/Sofia.
- Conhecer um identificador não deveria conceder acesso por si só, mas o modelo anónimo/fixo não separa várias famílias ou grupos públicos.
- Não alteres as regras para `allow read, write: if true` durante diagnóstico. Isso exporia dados diretamente.

## Configuração Firebase não é uma chave administrativa

Os campos Web `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` e `appId` identificam a aplicação Firebase e são normalmente distribuídos ao browser. A segurança deve vir de Authentication, regras Firestore, App Check quando adequado, quotas e monitorização — não de esconder esta configuração.

Nunca guardes neste repositório ou bundle:

- JSON de conta de serviço;
- credenciais Firebase Admin SDK;
- chaves privadas, passwords ou tokens pessoais;
- certificados Apple `.p12` e respetivas passwords;
- provisioning profiles, Apple IDs ou sessões do App Store Connect;
- ficheiros de configuração com acesso administrativo.

Se algum destes elementos for exposto, revoga/roda-o no fornecedor e investiga acessos; removê-lo apenas do commit mais recente não elimina o histórico.

## Distribuição e nível de risco

### Instalação privada em dispositivos controlados

É o cenário mais próximo do desenho atual. Limita quem recebe a build, protege os dispositivos com código/biometria, mantém o Firebase sob controlo e revoga dispositivos/certificados perdidos. Ainda assim, qualquer utilizador da build deve ser considerado tecnicamente capaz de observar o bundle e o espaço partilhado.

### TestFlight

TestFlight controla a distribuição da build, mas não corrige o modelo de autorização. Testers internos e externos recebem o mesmo cliente e podem inspecionar tráfego/código. Usa grupos mínimos, remove testers que deixaram de precisar e evita dados pessoais reais numa beta externa.

### App Store pública

A publicação permite a qualquer pessoa descarregar o cliente, obter uma sessão anónima e tentar interagir com os caminhos conhecidos. Com o desenho atual, isso cria risco material de leitura, spam, alteração, exaustão de quotas e abuso de dados partilhados. Uma política de privacidade não substitui controles técnicos.

Antes de uma publicação pública, implementa e testa a evolução abaixo ou limita efetivamente o backend a utilizadores convidados verificáveis.

## Evolução necessária para contas reais

Esta migração não faz parte da conversão Capacitor porque mudaria o comportamento e os dados existentes. Um projeto futuro deve:

1. Escolher um provider de identidade verificável, como Sign in with Apple, email link ou contas Firebase geridas.
2. Criar um processo de convite/adesão server-side, não decidido apenas pelo cliente.
3. Modelar espaços com membros e papéis ligados a `request.auth.uid`.
4. Reescrever regras para autorizar leitura/escrita por membership e papel, incluindo comentários e identidade do criador.
5. Impedir o cliente de escolher arbitrariamente campos de autoria; usar funções/backend confiável onde necessário.
6. Migrar `joao-sofia` com plano de rollback, backups e validação de todos os documentos/overrides.
7. Tratar contas desativadas, saída de membro, recuperação, exportação e eliminação de dados.
8. Considerar App Check, quotas, alertas e logging conforme o modelo de ameaça; App Check complementa, não substitui Authentication/regras.
9. Atualizar website e app ao mesmo tempo para não deixar um cliente antigo com permissões incompatíveis.
10. Testar regras no Emulator Suite e revisão cruzada antes de publicar.

## Dados e privacidade

A aplicação pode tratar no Firestore:

- UID anónimo e metadados técnicos Firebase;
- atividades, datas, descrições, URLs, recorrências e estados;
- comentários;
- perfis João/Sofia e desenhos de avatar;
- settings partilhados e versões para conflitos.

As preferências de acesso, utilizador, som e apresentação ficam localmente no WebView. Exportações e PDFs são criados em cache temporária para a folha de partilha e devem ser apagados depois. O destinatário escolhido pelo utilizador passa a controlar a cópia partilhada.

O privacy manifest incluído declara a categoria de timestamp necessária ao Filesystem. Não é uma declaração completa de App Privacy: antes de TestFlight externo/App Store, revê os SDK efetivamente empacotados, a política publicada, retenção, eliminação e respostas no App Store Connect.

Não estão intencionalmente incluídos analytics, publicidade ou tracking. Confirma esta afirmação de novo sempre que adicionares um SDK.

## Rede, links e conteúdo ativo

- O conteúdo da aplicação arranca de `capacitor://localhost`; não existe `server.url` ou allowlist para substituir a app por um site remoto.
- Dependências JavaScript de runtime ficam no bundle. Firebase continua a comunicar por HTTPS com serviços Google.
- Só URLs externas HTTP/HTTPS validadas são abertas no browser nativo. Esquemas arbitrários devem ser rejeitados.
- Texto/URLs introduzidos pelo utilizador não devem ser inseridos como HTML não confiável.
- O indicador Network não prova que Firestore está disponível; mensagens de sincronização devem refletir o estado Firebase real.

## Recomendações operacionais

### Ferramentas de build

Em 14-07-2026, `npm audit --omit=dev` não reporta vulnerabilidades nas dependências de produção. O audit completo reporta dependências transitivas antigas sem correção disponível dentro de `@capacitor/assets@3.0.5`; essa ferramenta só deve processar os SVG versionados deste repositório e nunca arquivos ou projetos não confiáveis. Revê novamente o audit e atualiza a ferramenta logo que exista uma versão oficial compatível.

- Mantém Node, Capacitor, Firebase e Xcode em versões suportadas, atualizando apenas com testes.
- Revê regularmente regras Firestore e alertas/quota do projeto.
- Usa dados descartáveis em testes; testes automatizados devem ter `firebaseConfig=null` ou mocks.
- Revê `git diff`, bundle e lockfile antes de distribuir.
- Não publiques logs/screenshots com atividades, comentários, configuração de conta ou identificadores reais.
- Em caso de dispositivo perdido, revoga a assinatura/perfil quando aplicável e avalia exposição dos dados; o código local não é proteção suficiente.
- Faz backups e testa recuperação antes de qualquer migração de schema/regras.

## Comunicar um problema

Comunica vulnerabilidades em privado ao responsável pelo repositório, com versão, ambiente, impacto e passos mínimos. Não abras uma issue pública que inclua dados pessoais, tokens ou um método de acesso ainda explorável.
