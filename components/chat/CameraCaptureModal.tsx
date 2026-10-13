"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCw, Check, AlertCircle } from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (file: File) => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onPhotoCaptured,
}: CameraCaptureModalProps) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhotoDataUrl(null);
      setStreamError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      console.warn("Camera stream unavailable:", err);
      setStreamError("Unable to access camera. You can also upload a photo directly.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPhotoDataUrl(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const handleSend = () => {
    if (!photoDataUrl) return;

    // Convert base64 to File
    const arr = photoDataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const file = new File([u8arr], `camera_photo_${Date.now()}.jpg`, { type: mime });
    onPhotoCaptured(file);
    onClose();
  };

  const handleFallbackFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoCaptured(file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-white/20 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
              {photoDataUrl ? "Preview Photo" : "Capture Photo"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative w-full aspect-[4/3] my-4 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-white/10 shadow-inner">
          {streamError ? (
            <div className="p-6 text-center text-slate-300 flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-sm">{streamError}</p>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow">
                Choose Photo from Device
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFallbackFileInput}
                />
              </label>
            </div>
          ) : photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoDataUrl}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Actions */}
        <div className="w-full flex items-center justify-center gap-4 pt-2">
          {!photoDataUrl && !streamError && (
            <button
              type="button"
              onClick={handleCapture}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Camera className="w-5 h-5" />
              Capture Photo
            </button>
          )}

          {photoDataUrl && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-lg hover:shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                Send Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraCaptureModal;

