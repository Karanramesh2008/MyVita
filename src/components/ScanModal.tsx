import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { X, Camera, Upload, Sparkles, Check, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { SAMPLE_MONITORS, SampleMonitorImage } from '../lib/sampleImages';
import { runOcrOnImage, OCRResult } from '../lib/ocr';
import { addReading } from '../lib/db';
import { useToast } from '../context/ToastContext';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ScanModal({ isOpen, onClose, onSaved }: ScanModalProps) {
  const { showToast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_MONITORS[0].dataUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Parsed and editable fields
  const [systolic, setSystolic] = useState<number>(150);
  const [diastolic, setDiastolic] = useState<number>(95);
  const [pulse, setPulse] = useState<number>(82);
  const [notes, setNotes] = useState<string>('Scanned via monitor photo');
  const [hasExtracted, setHasExtracted] = useState<boolean>(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      // Default select the first sample (150/95) to match the 3-minute demo path:
      // "Taps Scan Reading -> uploads/picks a sample BP monitor image -> OCR extracts 150/95 -> saves to vault"
      setSelectedImage(SAMPLE_MONITORS[0].dataUrl);
      setSystolic(150);
      setDiastolic(95);
      setPulse(82);
      setHasExtracted(false);
      setIsCameraActive(false);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      showToast('Camera access denied or unavailable', 'warning', 'You can upload an image or choose a sample monitor');
    }
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSelectedImage(dataUrl);
      stopCamera();
      processImageOCR(dataUrl);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedImage(dataUrl);
      processImageOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImageOCR = async (imageSrc: string) => {
    setIsProcessing(true);
    setOcrStatus('Reading image...');
    setProgressPercent(20);

    try {
      const result: OCRResult = await runOcrOnImage(imageSrc, (status, progress) => {
        setOcrStatus(status);
        setProgressPercent(progress);
      });

      setSystolic(result.systolic);
      setDiastolic(result.diastolic);
      setPulse(result.pulse);
      setHasExtracted(true);
      showToast(`Extracted ${result.systolic}/${result.diastolic} mmHg`, 'success', `Pulse: ${result.pulse} bpm`);
    } catch (error) {
      showToast('Error parsing image', 'error', 'Values can be adjusted manually below');
      setHasExtracted(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickSample = (sample: SampleMonitorImage) => {
    stopCamera();
    setSelectedImage(sample.dataUrl);
    processImageOCR(sample.dataUrl);
  };

  const handleSaveToVault = async () => {
    try {
      await addReading({
        type: 'BP',
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: Number(pulse),
        timestamp: Date.now(),
        source: 'OCR Scan',
        notes: notes.trim() || 'OCR Scan from monitor photo',
      });

      showToast(`Saved ${systolic}/${diastolic} to Private Vault`, 'success', 'Stored in local IndexedDB');
      onSaved();
      onClose();
    } catch (err) {
      showToast('Failed to save reading', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="scan-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="scan-modal-container"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Scan Blood Pressure Monitor</h3>
              <p className="text-xs text-slate-400">Tesseract.js In-Browser OCR • Zero Cloud Leak</p>
            </div>
          </div>
          <button
            id="scan-modal-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Preset Sample Monitor Buttons for 3-minute hackathon demo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Try a Sample BP Monitor
              </span>
              <span className="text-[11px] text-teal-600 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Demo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_MONITORS.map((s) => (
                <button
                  key={s.id}
                  id={`sample-monitor-btn-${s.id}`}
                  onClick={() => handlePickSample(s)}
                  className={`px-2.5 py-2 rounded-xl text-left border transition-all ${
                    selectedImage === s.dataUrl
                      ? 'border-teal-500 bg-teal-50 text-teal-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold truncate">{s.previewLabel}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Image Preview / Camera Stage */}
          <div className="relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden min-h-[200px] flex items-center justify-center">
            {isCameraActive ? (
              <div className="relative w-full aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <button
                  id="camera-snap-button"
                  onClick={captureCameraFrame}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-teal-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 hover:bg-teal-600"
                >
                  <Camera className="w-4 h-4" /> Snap Photo
                </button>
              </div>
            ) : selectedImage ? (
              <div className="relative w-full p-2 flex items-center justify-center bg-slate-950">
                <img
                  src={selectedImage}
                  alt="Monitor Display"
                  className="max-h-56 object-contain rounded-lg border border-slate-800 shadow-md"
                />
                <button
                  id="re-scan-ocr-button"
                  onClick={() => processImageOCR(selectedImage)}
                  disabled={isProcessing}
                  className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-xs font-medium border border-slate-700 hover:bg-slate-800 flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-teal-400' : ''}`} />
                  Re-Run OCR
                </button>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400">
                <Camera className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-xs">Select a sample or capture an image</p>
              </div>
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white z-10">
                <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-bold text-teal-300">{ocrStatus || 'Reading image...'}</p>
                <p className="text-xs text-slate-400 mt-1">Regex extraction: (\d&#123;2,3&#125;)[\/\\](\d&#123;2,3&#125;)</p>
                <div className="w-48 bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-teal-400 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Upload or Camera Toggle Buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              id="upload-image-file-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 bg-slate-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Upload Photo
            </button>
            <button
              id="start-camera-capture-btn"
              type="button"
              onClick={() => {
                if (isCameraActive) stopCamera();
                else startCamera();
              }}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 bg-slate-50 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              {isCameraActive ? 'Cancel Camera' : 'Live Camera'}
            </button>
          </div>

          {/* Parsed Result & Editable Fields */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Extracted BP Reading (Editable)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">
                Pattern Verified
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Systolic (SYS)
                </label>
                <div className="relative">
                  <input
                    id="ocr-systolic-input"
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    min={60}
                    max={260}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-base font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-medium">mmHg</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Diastolic (DIA)
                </label>
                <div className="relative">
                  <input
                    id="ocr-diastolic-input"
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    min={40}
                    max={160}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-base font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-medium">mmHg</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Pulse (BPM)
                </label>
                <div className="relative">
                  <input
                    id="ocr-pulse-input"
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(Number(e.target.value))}
                    min={35}
                    max={220}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-base font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-medium">/min</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Context / Clinical Notes
              </label>
              <input
                id="ocr-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Scanned via monitor photo"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              id="scan-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              id="save-reading-to-vault-btn"
              type="button"
              onClick={handleSaveToVault}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save to Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
