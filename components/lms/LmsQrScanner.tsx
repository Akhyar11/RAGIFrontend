'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

interface LmsQrScannerProps {
  onScan: (payload: string) => void | Promise<void>;
  buttonText?: string;
  className?: string;
}

export function LmsQrScanner({ onScan, buttonText = 'Kamera QR Scanner', className = '' }: LmsQrScannerProps) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const toggleScanner = async () => {
    if (isActive) {
      stopStream();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Kamera tidak tersedia di perangkat atau browser ini.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        const scanLoop = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = String(barcodes[0].rawValue);
              stopStream();
              await onScan(detected);
              return;
            }
          } catch {
            // lanjutkan frame berikutnya
          }
          if (streamRef.current) {
            requestAnimationFrame(scanLoop);
          }
        };
        requestAnimationFrame(scanLoop);
      }
    } catch {
      toast.error('Izin kamera ditolak atau kamera tidak ditemukan.');
      setIsActive(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Button
        type="button"
        variant="outline"
        icon={isActive ? <CameraOff size={16} /> : <QrCode size={16} />}
        onClick={toggleScanner}
      >
        {isActive ? 'Matikan Kamera' : buttonText}
      </Button>

      {isActive && (
        <div className="rounded-xl overflow-hidden border border-slate-300 bg-black aspect-video flex items-center justify-center relative shadow-inner">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 text-2xs text-white backdrop-blur">
              <Camera size={12} className="animate-pulse text-emerald-400" /> Arahkan ke QR code dosen
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
