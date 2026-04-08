"use client";

import { useEffect, useRef, useState } from "react";

interface QRScannerProps {
  onResult: (batchId: string) => void;
  onClose:  () => void;
}

export default function QRScanner({ onResult, onClose }: QRScannerProps) {
  const [error, setError]     = useState<string>("");
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let scanner: { stop: () => Promise<void> } | null = null;

    const startScanner = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");

        const html5QrCode = new Html5Qrcode("qr-reader");
        scanner = html5QrCode;
        scannerRef.current = html5QrCode;

        if (!mountedRef.current) return;
        setLoading(false);

        await html5QrCode.start(
          { facingMode: "environment" }, // back camera on mobile
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Try to parse JSON payload from QRGenerator
            let batchId = decodedText;
            try {
              const payload = JSON.parse(decodedText);
              if (payload.batchId) batchId = payload.batchId;
              else if (payload.url) {
                // Extract from URL: /verify?batch=BATCH-001
                const url = new URL(payload.url);
                const fromUrl = url.searchParams.get("batch");
                if (fromUrl) batchId = fromUrl;
              }
            } catch {
              // Plain text batch ID — use as-is
            }
            onResult(batchId);
          },
          () => {} // ignore frame errors
        );
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const msg = (err as Error)?.message || "Camera access denied";
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setError("Camera permission denied. Please allow camera access and try again.");
        } else {
          setError(msg);
        }
        setLoading(false);
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      scanner?.stop().catch(() => {});
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner area */}
        {loading && (
          <div className="flex items-center justify-center h-64 bg-black/20 rounded-lg mb-4">
            <div className="text-center">
              <div className="spinner mx-auto mb-3" />
              <p className="text-sm text-text-secondary">Starting camera...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="h-64 flex flex-col items-center justify-center bg-black/20 rounded-lg mb-4 px-4">
            <div className="text-3xl mb-3">📷</div>
            <p className="text-sm text-danger text-center">{error}</p>
          </div>
        ) : (
          <div
            id="qr-reader"
            className="overflow-hidden rounded-lg mb-4"
            style={{ width: "100%" }}
          />
        )}

        <p className="text-xs text-muted text-center">
          Point your camera at the QR code on the medicine package
        </p>
      </div>
    </div>
  );
}
