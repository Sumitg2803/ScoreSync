import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader-region',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        // Stop scanner on success
        scanner.clear().catch(() => {});
        onScanSuccess(decodedText);
      },
      () => {
        // Scan failure (ignore in progress)
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 relative flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-base text-[#1E1B4B]">Scan Game QR Code</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4">
          <div id="qr-reader-region" className="w-full overflow-hidden rounded-2xl" />
        </div>

        <p className="text-xs text-center text-slate-500 font-medium">
          Point your camera at the Host's QR code to join automatically.
        </p>
      </div>
    </div>
  );
};
