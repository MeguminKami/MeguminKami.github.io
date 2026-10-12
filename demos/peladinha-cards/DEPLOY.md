# Publicar Peladinhas Cards

O projeto configurado é **pedalinhas-cards** (a grafia é a do projeto existente). Os scripts leem `js/config.js` e usam `--project` explicitamente, sem depender de um alias ativo.

## Primeira publicação no Firebase Hosting

Na pasta deste projeto, com Node.js 22:

```powershell
npm.cmd install
npx.cmd firebase login --reauth
npm.cmd run deploy
```

`deploy` verifica a sintaxe, executa os testes de lógica e publica **Hosting, regras/índices Firestore, Storage e Functions**. O Hosting prepara uma pasta com apenas `index.html`, `js`, `css` e `assets`: não publica código de servidor, testes ou ficheiros internos. Não é preciso executar `firebase init`.

Depois de o comando terminar com sucesso, abre **https://pedalinhas-cards.web.app**. Confirma que esse domínio está autorizado em Firebase Authentication → Settings → Authorized domains. Faz login como administrador e executa **Recalcular liga** uma vez para atualizar históricos antigos e gravar o detalhe do cálculo OVR.

Verifica registo/login, upload de fotografia, guardar uma avaliação, tickets e cálculo OVR. Os testes locais não confirmam IAM nem o estado real do projeto Firebase.

## Atualizações seguintes

```powershell
npm.cmd run deploy
```

Para alterações exclusivamente de interface, com backend e regras já atualizados:

```powershell
npm.cmd run deploy:frontend
```

Se mantiveres o site no GitHub Pages, publica o frontend pelo fluxo habitual de GitHub e atualiza o Firebase com:

```powershell
npm.cmd run deploy:backend
```

Publicar no Firebase Hosting não atualiza a URL de GitHub Pages. Usa a URL Firebase para alojar frontend e backend no mesmo projeto.

O Hosting envia `Cache-Control: no-cache, max-age=0, must-revalidate`, para revalidar os ficheiros quando forem pedidos novamente após uma publicação. Um separador que já tem a aplicação carregada precisa de ser recarregado. Alterar ficheiros locais não publica automaticamente: executa o comando após cada atualização.

## Verificar a instalação existente

```powershell
npx.cmd firebase functions:list --project pedalinhas-cards
npx.cmd firebase hosting:sites:list --project pedalinhas-cards
```

Nesta revisão, a CLI tinha uma conta guardada mas ambas as consultas falharam por autenticação. Não foi possível confirmar a versão online, e não foi feita publicação em produção. O histórico PowerShell disponível não continha comandos Firebase; o README anterior já documentava `firebase login`, `firebase use --add` e `firebase deploy --only firestore,storage,functions`.

A verificação pública confirmou que o site em `https://meguminkami.github.io/demos/peladinha-cards/` responde, mas o novo módulo `js/ovr-audit.js` ainda devolve 404. `https://pedalinhas-cards.web.app/` também devolveu 404. A configuração de Hosting preparada localmente ainda precisa de publicação.
