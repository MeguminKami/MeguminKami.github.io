# Templates nativos iOS/iPadOS

Esta pasta é a fonte versionada para as personalizações aplicadas ao projeto Capacitor. Não é um segundo projeto Xcode e não deve ser aberta diretamente no Xcode.

- `App/ViewController.swift` regista o plugin local.
- `App/NativePrintPlugin.swift` implementa impressão e PDF com APIs públicas do UIKit/WebKit.
- `App/PrivacyInfo.xcprivacy` declara o acesso a timestamps usado pelo Filesystem.
- `config/` descreve deployment target, família universal, multitarefa e orientações.
- `assets/` contém os SVG de origem derivados de `assets/favicon.svg`.

`npm run ios:create` gera `app/ios` e aplica estes ficheiros. `npm run ios:configure` volta a validar e aplicar a configuração após mudanças de nome ou App ID. Não edites simultaneamente um ficheiro gerado e o respetivo template: a fonte de verdade é esta pasta.

O plugin expõe ao JavaScript:

```ts
printCurrentView({ jobName?: string }): Promise<{ completed: boolean }>
createPdf({ fileName?: string }): Promise<{ uri: string }>
```

Um cancelamento da janela de impressão resolve com `completed: false`. O PDF é escrito numa pasta temporária e o adaptador JavaScript é responsável por o partilhar e eliminar. No iPad, a janela de impressão é apresentada por um popover ancorado no controlador principal.
