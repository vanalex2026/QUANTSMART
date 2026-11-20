import { verifyPdfSignalReceipt, type PdfSignalVerificationSource } from "./pdfSignalVerification.ts";
import type { PdfSignalDetectorInput } from "./pdfSignalDetector.ts";

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<{
    input: PdfSignalDetectorInput;
    source: PdfSignalVerificationSource;
  }>) => void;
  postMessage: (reply: {
    result: ReturnType<typeof verifyPdfSignalReceipt>;
  } | { error: string }) => void;
};

scope.onmessage = ({ data }) => {
  try {
    scope.postMessage({ result: verifyPdfSignalReceipt(data.input, data.source) });
  } catch {
    scope.postMessage({ error: "PDF_SIGNAL_VERIFICATION_FAILED" });
  }
};
