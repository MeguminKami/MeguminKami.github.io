import Capacitor
import UIKit

/// Bridge utilizado pela aplicação universal (iPhone e iPad).
///
/// O projeto Capacitor gerado deve usar esta classe como o controlador inicial.
/// O registo por instância mantém o plugin local fora de qualquer pacote remoto.
final class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativePrintPlugin())
    }
}
