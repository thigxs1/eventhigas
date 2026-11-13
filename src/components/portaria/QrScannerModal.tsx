import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, QrCode, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeText, onlyDigits } from "@/lib/format";
import { GuestAvatar } from "./GuestAvatar";
import type { PortariaGuest } from "./types";

interface QrScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: PortariaGuest[];
  onConfirmCheckin: (guestId: string, fullName: string) => Promise<void> | void;
}

type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};

export function QrScannerModal({
  open,
  onOpenChange,
  guests,
  onConfirmCheckin,
}: QrScannerModalProps) {
  const [codeQuery, setCodeQuery] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      setCameraActive(false);
      setCameraError(null);
      setCodeQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !cameraActive) return;

    let stream: MediaStream | null = null;
    let rafId = 0;
    let stopped = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Câmera indisponível neste navegador. Use a busca manual abaixo.");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
          .BarcodeDetector;
        if (!Detector) {
          setCameraError(
            "Leitura óptica automática não suportada neste dispositivo. Digite o nome, CPF ou código do ingresso abaixo.",
          );
          return;
        }

        const detector = new Detector({ formats: ["qr_code"] });
        const scanLoop = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue?.trim();
            if (raw) {
              setCodeQuery(raw);
              setCameraActive(false);
              return;
            }
          } catch {
            // Ignora frame inválido
          }
          rafId = requestAnimationFrame(scanLoop);
        };
        rafId = requestAnimationFrame(scanLoop);
      } catch {
        setCameraError("Permissão de câmera negada ou câmera não detectada.");
      }
    }

    startCamera();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [open, cameraActive]);

  const matches = useMemo(() => {
    const q = codeQuery.trim();
    if (!q) return guests.slice(0, 6);
    const qNorm = normalizeText(q);
    const qDigits = onlyDigits(q);
    return guests
      .filter((g) => {
        if (g.id.toLowerCase() === q.toLowerCase()) return true;
        if (normalizeText(g.full_name).includes(qNorm)) return true;
        if (qDigits.length >= 3 && g.cpf?.includes(qDigits)) return true;
        if (qDigits.length >= 3 && g.phone?.includes(qDigits)) return true;
        return false;
      })
      .slice(0, 8);
  }, [guests, codeQuery]);

  async function handleValidate(guest: PortariaGuest) {
    setSubmittingId(guest.id);
    try {
      await onConfirmCheckin(guest.id, guest.full_name);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-elevated border-white/[0.1] bg-[#16161a]/95 text-white max-w-lg rounded-[24px] p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
              <QrCode className="size-5" aria-hidden="true" />
            </span>
            Leitor de QR Code &amp; Validação
          </DialogTitle>
          <DialogDescription className="text-white/55 text-xs sm:text-sm">
            Aponte a câmera para o QR Code do ingresso ou digite nome, CPF ou código.
          </DialogDescription>
        </DialogHeader>

        {/* Camera Viewport */}
        <div className="mt-2 rounded-[20px] bg-white/[0.03] border border-white/[0.08] overflow-hidden">
          {cameraActive ? (
            <div className="relative aspect-video bg-[#0d0d0f] flex items-center justify-center">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              {/* Scanning reticle */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="size-40 rounded-2xl border-2 border-[#FF6B00] shadow-[0_0_24px_rgba(255,107,0,0.5)]" />
              </div>
              <button
                type="button"
                onClick={() => setCameraActive(false)}
                aria-label="Parar câmera"
                className="absolute top-3 right-3 size-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/90">Câmera da Portaria</div>
                <div className="text-xs text-white/50 mt-0.5">
                  {cameraError ?? "Ative a câmera para ler QR Codes instantaneamente."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setCameraActive(true);
                }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#FF6B00] hover:bg-[#ff7b1c] text-white text-xs font-semibold shrink-0 shadow-[0_0_20px_rgba(255,107,0,0.35)] cursor-pointer"
              >
                <Camera className="size-4" aria-hidden="true" />
                Ativar Câmera
              </button>
            </div>
          )}
        </div>

        {/* Code / Name Search Input */}
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40"
            aria-hidden="true"
          />
          <input
            type="text"
            value={codeQuery}
            onChange={(e) => setCodeQuery(e.target.value)}
            placeholder="Código QR, nome do convidado ou CPF…"
            autoFocus
            className="w-full h-11 pl-10 pr-4 rounded-[16px] text-sm text-white placeholder:text-white/40 bg-white/[0.04] border border-white/[0.08] focus:outline-none focus:border-[#FF6B00]/60"
          />
        </div>

        {/* Instant Matching Guest List */}
        <div className="mt-2 max-h-[240px] overflow-y-auto space-y-1.5 pr-1">
          {matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/45">
              Nenhum convidado corresponde a "{codeQuery}".
            </div>
          ) : (
            matches.map((g) => {
              const remaining = g.ticket_quantity - g.checked_in_count;
              const fullyIn = remaining <= 0;
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GuestAvatar
                      name={g.full_name}
                      ticketType={g.ticket_type}
                      validated={g.checked_in_count > 0}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white/95 truncate">
                        {g.full_name}
                      </div>
                      <div className="text-[11px] text-white/50 capitalize">
                        {g.ticket_type} · {g.checked_in_count}/{g.ticket_quantity} presentes
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={fullyIn || submittingId === g.id}
                    onClick={() => handleValidate(g)}
                    className={
                      fullyIn
                        ? "h-8 px-3 rounded-full text-xs font-medium bg-white/[0.05] text-white/45 cursor-not-allowed"
                        : "h-8 px-3.5 rounded-full text-xs font-semibold bg-[#FF6B00] hover:bg-[#ff7b1c] text-white inline-flex items-center gap-1 cursor-pointer shadow-[0_0_16px_rgba(255,107,0,0.3)]"
                    }
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    {fullyIn ? "Completo" : submittingId === g.id ? "…" : "Validar"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
