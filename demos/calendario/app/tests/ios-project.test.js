import test from "node:test";
import assert from "node:assert/strict";
import { iosProjectInternals } from "../scripts/ios-project.mjs";

const project = `
/* Begin PBXBuildFile section */
/* End PBXBuildFile section */
/* Begin PBXFileReference section */
/* End PBXFileReference section */
AAAA /* App */ = {
  isa = PBXGroup;
  children = (
  );
  path = App;
  sourceTree = "<group>";
};
BBBB = {
  isa = PBXSourcesBuildPhase;
  buildActionMask = 2147483647;
  files = (
  );
};
CCCC = {
  isa = PBXResourcesBuildPhase;
  buildActionMask = 2147483647;
  files = (
  );
};
PRODUCT_BUNDLE_IDENTIFIER = old.identifier;
IPHONEOS_DEPLOYMENT_TARGET = 14.0;
TARGETED_DEVICE_FAMILY = 1;
SUPPORTS_MACCATALYST = YES;
`;

test("configura o projeto universal e inclui os ficheiros nativos uma única vez", () => {
  const settings = { appId: "com.example.calendar", deploymentTarget: "15.4", targetedDeviceFamily: "1,2", supportsMacCatalyst: false };
  const configured = iosProjectInternals.configureProject(project, settings);
  assert.match(configured, /PRODUCT_BUNDLE_IDENTIFIER = com\.example\.calendar;/u);
  assert.match(configured, /IPHONEOS_DEPLOYMENT_TARGET = 15\.4;/u);
  assert.match(configured, /TARGETED_DEVICE_FAMILY = "1,2";/u);
  assert.match(configured, /SUPPORTS_MACCATALYST = NO;/u);
  assert.match(configured, /ViewController\.swift in Sources/u);
  assert.match(configured, /NativePrintPlugin\.swift in Sources/u);
  assert.match(configured, /PrivacyInfo\.xcprivacy in Resources/u);
  assert.equal(configured.match(/\/\* ViewController\.swift in Sources \*\//gu)?.length, 2);
  assert.equal(iosProjectInternals.configureProject(configured, settings), configured);
});

test("num projeto com grupos sincronizados não injeta referências manuais", () => {
  const synchronized = `${project}\nPBXFileSystemSynchronizedRootGroup`;
  const configured = iosProjectInternals.configureProject(synchronized, { appId: "com.example.calendar", deploymentTarget: "15.4", targetedDeviceFamily: "1,2", supportsMacCatalyst: false });
  assert.doesNotMatch(configured, /ViewController\.swift/u);
  assert.doesNotMatch(configured, /NativePrintPlugin\.swift/u);
});

test("liga o storyboard ao controlador que regista o plugin local", () => {
  const storyboard = `
<document>
  <viewController id="BYZ-38-t0r" customClass="CAPBridgeViewController" customModule="Capacitor" sceneMemberID="viewController"/>
</document>`;
  const configured = iosProjectInternals.configureMainStoryboard(storyboard, "App");
  assert.match(configured, /customClass="ViewController" customModule="App" customModuleProvider="target"/u);
  assert.doesNotMatch(configured, /customClass="CAPBridgeViewController"/u);
  assert.equal(iosProjectInternals.configureMainStoryboard(configured, "App"), configured);
});

test("rejeita um storyboard cuja estrutura inicial seja desconhecida", () => {
  assert.throws(
    () => iosProjectInternals.configureMainStoryboard("<document/>", "App"),
    /Main\.storyboard não contém o CAPBridgeViewController inicial/u
  );
});

test("atualiza e acrescenta valores Info.plist preservando o documento", () => {
  let plist = `<?xml version="1.0"?><plist><dict><key>UIRequiresFullScreen</key><true/><key>CFBundleName</key><string>App</string></dict></plist>`;
  plist = iosProjectInternals.setPlistValue(plist, "UIRequiresFullScreen", false);
  plist = iosProjectInternals.setPlistValue(plist, "CFBundleDisplayName", "O Que Vais Fazer?");
  plist = iosProjectInternals.setPlistValue(plist, "UISupportedInterfaceOrientations~ipad", ["UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft"]);
  assert.match(plist, /<key>UIRequiresFullScreen<\/key>\s*<false\/>/u);
  assert.match(plist, /<key>CFBundleDisplayName<\/key>\s*<string>O Que Vais Fazer\?<\/string>/u);
  assert.match(plist, /<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>[\s\S]*UIInterfaceOrientationLandscapeLeft/u);
});

test("normaliza caminhos SPM gerados no Windows para Swift no Mac", () => {
  const source = '.package(name: "CapacitorApp", path: "..\\..\\..\\node_modules\\@capacitor\\app")';
  assert.equal(
    iosProjectInternals.normalizeSwiftPackagePaths(source),
    '.package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app")'
  );
});
