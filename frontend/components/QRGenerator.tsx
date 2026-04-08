"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { APP_NETWORK_NAME } from "@/lib/types";

interface QRGeneratorProps {
  batchId:         string;
  medicineName:    string;
  contractAddress: string;
}

export default function QRGenerator({
  batchId,
  medicineName,
  contractAddress,
}: QRGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // The QR code encodes a verification URL — patients scan this on their phone
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify?batch=${encodeURIComponent(batchId)}`
      : `https://medichain.vercel.app/verify?batch=${encodeURIComponent(batchId)}`;

  // The QR data payload
  const qrData = JSON.stringify({
    batchId,
    contract: contractAddress,
    network: APP_NETWORK_NAME,
    url: verifyUrl,
  });

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const size = 300;
    canvas.width = size;
    canvas.height = size + 60; // extra space for label

    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#0D1528";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to image
    const svgBlob = new Blob([svg.outerHTML], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      // Label
      ctx.fillStyle = "#F1F5F9";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(medicineName, size / 2, size + 22);
      ctx.fillStyle = "#94A3B8";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText(batchId, size / 2, size + 42);

      const link = document.createElement("a");
      link.download = `medichain-${batchId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
  };

  return (
    <div className="card text-center">
      <h3 className="text-base font-semibold text-text-primary mb-4">
        QR Code — Scan to Verify
      </h3>

      {/* QR Code */}
      <div
        ref={qrRef}
        className="inline-block p-4 bg-white rounded-xl mx-auto mb-4"
      >
        <QRCodeSVG
          value={qrData}
          size={200}
          level="H"
          includeMargin={false}
          fgColor="#0A0F1E"
          bgColor="#FFFFFF"
        />
      </div>

      {/* Batch info */}
      <p className="text-sm font-medium text-text-primary mb-1">{medicineName}</p>
      <p className="text-xs text-muted font-mono mb-5">{batchId}</p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleDownload}
          className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PNG
        </button>
        <button
          onClick={handleCopyLink}
          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Link
        </button>
      </div>

      {/* URL preview */}
      <p className="mt-3 text-xs text-muted break-all">{verifyUrl}</p>
    </div>
  );
}
