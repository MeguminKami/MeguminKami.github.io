# Avisos de software de terceiros

Esta distribuição inclui software e dados de terceiros no bundle local. Este ficheiro é um inventário informativo, não substitui os textos de licença existentes nos pacotes instalados. O build deve preservar comentários legais e os ficheiros `LICENSE` de cada distribuição quando a licença o exigir.

## Dependências de runtime

| Componente | Versão | Licença declarada pelo projeto | Utilização |
|---|---:|---|---|
| `@capacitor/core` | 8.4.1 | MIT | Bridge e runtime Capacitor. |
| `@capacitor/ios` | 8.4.1 | MIT | Plataforma iOS/iPadOS e Swift Package Manager. |
| `@capacitor/app` | 8.1.0 | MIT | Foreground/background. |
| `@capacitor/browser` | 8.0.3 | MIT | Browser nativo para links externos. |
| `@capacitor/filesystem` | 8.1.2 | MIT | Ficheiros temporários de exportação. |
| `@capacitor/keyboard` | 8.0.5 | MIT | Integração/resize do teclado. |
| `@capacitor/network` | 8.0.1 | MIT | Alterações de conectividade. |
| `@capacitor/share` | 8.0.1 | MIT | Folha de partilha nativa. |
| `@capacitor/splash-screen` | 8.0.1 | MIT | Splash nativo. |
| `@capacitor/status-bar` | 8.0.2 | MIT | Barra de estado. |
| `firebase` | 12.15.0 | Apache-2.0 | Authentication anónima e Cloud Firestore Web SDK. |
| `emoji-picker-element` | 1.29.1 | Apache-2.0 | Componente e base de pesquisa de emojis. |
| `emoji-picker-element-data` | 1.8.0 | Apache-2.0 | Dados locale PT/EN empacotados. |
| Formas de ícones Lucide | snapshot local | ISC | Símbolos adaptados no sprite `assets/icons.svg`. |

Capacitor e os plugins oficiais são Copyright Ionic/Contributors. Firebase JavaScript SDK é Copyright Google LLC/Contributors. `emoji-picker-element` é Copyright Nolan Lawson/Contributors. As formas dos ícones são inspiradas no projeto [Lucide](https://lucide.dev), distribuído sob licença ISC. Consulta os respetivos pacotes/repositórios para textos e atribuições completos.

Os glifos de emoji apresentados são renderizados pelo sistema operativo; a aparência e os direitos do desenho pertencem ao fornecedor da plataforma. O pacote de dados é gerado a partir de Emojibase/Unicode CLDR; confirma também os avisos incluídos no pacote e a [Unicode License](https://www.unicode.org/license.txt) aplicável aos dados de origem.

## Dependências de desenvolvimento

Não são carregadas pela aplicação em runtime, mas são usadas para criar/verificar a distribuição:

| Componente | Versão | Licença | Utilização |
|---|---:|---|---|
| `@capacitor/cli` | 8.4.1 | MIT | Criar/sincronizar/abrir projetos. |
| `@capacitor/assets` | 3.0.5 | MIT | Gerar AppIcon e splash. |
| `esbuild` | 0.25.8 | MIT | Bundle JavaScript local. |

O Xcode, SDKs Apple, simuladores e ferramentas de assinatura são disponibilizados sob os acordos da Apple e não são redistribuídos por este repositório.

## Código nativo local

`native/ios/App/NativePrintPlugin.swift` é código deste projeto. Usa apenas APIs públicas UIKit, WebKit e Capacitor; não incorpora um plugin de impressão de terceiros.

## Como verificar antes de distribuir

Depois de `npm ci`, confirma as versões/licenças reais instaladas:

```sh
npm ls --depth=0
npm query ':root > *' --json
```

Revê também:

```text
node_modules/<pacote>/LICENSE*
node_modules/<pacote>/package.json
app/ios/ (pacotes Swift resolvidos pelo Xcode)
```

Se atualizares, adicionares ou removeres uma dependência:

1. confirma a licença e compatibilidade com distribuição App Store;
2. atualiza versão e atribuição neste ficheiro;
3. preserva o texto legal exigido no bundle/arquivo de distribuição;
4. revê App Privacy e `PrivacyInfo.xcprivacy`;
5. volta a verificar que o bundle não carrega código a partir de CDNs.

Os ficheiros SVG do ícone/splash são derivados do `assets/favicon.svg` do próprio projeto e não acrescentam conteúdo gráfico de terceiros.
