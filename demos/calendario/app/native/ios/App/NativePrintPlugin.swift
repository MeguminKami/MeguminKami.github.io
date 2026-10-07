import Capacitor
import UIKit
import WebKit

private enum NativePrintError: LocalizedError {
    case webViewUnavailable
    case noPrintablePages
    case cannotCreateDirectory(Error)
    case cannotWritePDF(Error)

    var errorDescription: String? {
        switch self {
        case .webViewUnavailable:
            return "A vista do calendário não está disponível para impressão."
        case .noPrintablePages:
            return "O calendário não produziu páginas para o PDF."
        case let .cannotCreateDirectory(error):
            return "Não foi possível preparar a pasta temporária: \(error.localizedDescription)"
        case let .cannotWritePDF(error):
            return "Não foi possível guardar o PDF temporário: \(error.localizedDescription)"
        }
    }
}

/// Renderer explícito para A4 horizontal, usando apenas APIs públicas do UIKit.
private final class A4LandscapePageRenderer: UIPrintPageRenderer {
    private let configuredPaperRect = CGRect(x: 0, y: 0, width: 841.89, height: 595.28)
    private lazy var configuredPrintableRect = configuredPaperRect.insetBy(dx: 28.35, dy: 28.35)

    override var paperRect: CGRect { configuredPaperRect }
    override var printableRect: CGRect { configuredPrintableRect }
}

@objc(NativePrintPlugin)
public final class NativePrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePrintPlugin"
    public let jsName = "NativePrint"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printCurrentView", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createPdf", returnType: CAPPluginReturnPromise)
    ]

    @objc public func printCurrentView(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let webView = self.bridge?.webView else {
                call.reject(
                    NativePrintError.webViewUnavailable.localizedDescription,
                    "PRINT_WEBVIEW_UNAVAILABLE"
                )
                return
            }

            let controller = UIPrintInteractionController.shared
            let printInfo = UIPrintInfo(dictionary: nil)
            printInfo.jobName = self.normalizedJobName(call.getString("jobName"))
            printInfo.outputType = .general
            printInfo.orientation = .landscape
            controller.printInfo = printInfo

            let formatter = webView.viewPrintFormatter()
            formatter.perPageContentInsets = UIEdgeInsets(top: 24, left: 24, bottom: 24, right: 24)
            controller.printFormatter = formatter

            let completion: UIPrintInteractionController.CompletionHandler = { _, completed, error in
                if let error {
                    call.reject(error.localizedDescription, "PRINT_FAILED", error)
                    return
                }

                // completed=false representa normalmente Cancelar e não é um erro.
                call.resolve(["completed": completed])
            }

            let presented: Bool
            if UIDevice.current.userInterfaceIdiom == .pad {
                let anchorView = self.bridge?.viewController?.view ?? webView
                let anchorRect = CGRect(
                    x: anchorView.bounds.midX,
                    y: anchorView.bounds.midY,
                    width: 1,
                    height: 1
                )
                presented = controller.present(
                    from: anchorRect,
                    in: anchorView,
                    animated: true,
                    completionHandler: completion
                )
            } else {
                presented = controller.present(animated: true, completionHandler: completion)
            }

            if !presented {
                call.reject(
                    "O sistema não conseguiu apresentar a interface de impressão.",
                    "PRINT_PRESENTATION_FAILED"
                )
            }
        }
    }

    @objc public func createPdf(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let webView = self.bridge?.webView else {
                call.reject(
                    NativePrintError.webViewUnavailable.localizedDescription,
                    "PDF_WEBVIEW_UNAVAILABLE"
                )
                return
            }

            do {
                let formatter = webView.viewPrintFormatter()
                formatter.perPageContentInsets = UIEdgeInsets(top: 24, left: 24, bottom: 24, right: 24)

                let pageRenderer = A4LandscapePageRenderer()
                pageRenderer.addPrintFormatter(formatter, startingAtPageAt: 0)
                pageRenderer.prepare(
                    forDrawingPages: NSRange(location: 0, length: pageRenderer.numberOfPages)
                )

                guard pageRenderer.numberOfPages > 0 else {
                    throw NativePrintError.noPrintablePages
                }

                let metadata: [String: Any] = [
                    kCGPDFContextTitle as String: self.normalizedJobName(call.getString("fileName")),
                    kCGPDFContextCreator as String: "O Que Vais Fazer?"
                ]
                let pdfRenderer = UIGraphicsPDFRenderer(
                    bounds: pageRenderer.paperRect,
                    format: self.pdfFormat(metadata: metadata)
                )
                let data = pdfRenderer.pdfData { context in
                    for pageIndex in 0 ..< pageRenderer.numberOfPages {
                        context.beginPage()
                        pageRenderer.drawPage(at: pageIndex, in: pageRenderer.paperRect)
                    }
                }

                let outputURL = try self.temporaryPDFURL(requestedName: call.getString("fileName"))
                do {
                    try data.write(to: outputURL, options: .atomic)
                } catch {
                    throw NativePrintError.cannotWritePDF(error)
                }

                call.resolve(["uri": outputURL.absoluteString])
            } catch let error as NativePrintError {
                call.reject(error.localizedDescription, "PDF_CREATE_FAILED", error)
            } catch {
                call.reject(error.localizedDescription, "PDF_CREATE_FAILED", error)
            }
        }
    }

    private func pdfFormat(metadata: [String: Any]) -> UIGraphicsPDFRendererFormat {
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = metadata
        return format
    }

    private func temporaryPDFURL(requestedName: String?) throws -> URL {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("OQueVaisFazer", isDirectory: true)

        do {
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        } catch {
            throw NativePrintError.cannotCreateDirectory(error)
        }

        let baseName = sanitizedBaseName(requestedName)
        let uniqueName = "\(baseName)-\(UUID().uuidString).pdf"
        return root.appendingPathComponent(uniqueName, isDirectory: false)
    }

    private func normalizedJobName(_ value: String?) -> String {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "O Que Vais Fazer?" : String(trimmed.prefix(120))
    }

    private func sanitizedBaseName(_ value: String?) -> String {
        let requested = value.map { ($0 as NSString).deletingPathExtension } ?? "calendario"
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        let scalars = requested.unicodeScalars.map { allowed.contains($0) ? Character(String($0)) : "-" }
        let result = String(scalars)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return result.isEmpty ? "calendario" : String(result.prefix(80))
    }
}
