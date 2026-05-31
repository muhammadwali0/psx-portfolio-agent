import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDown, Share2, Loader2, Check, XCircle } from 'lucide-react';
import { generatePortfolioPDF } from '../../utils/pdfGenerator';
import { useStore } from '../../store/store';
import type { AgentRun } from '../../api/types';

interface Props {
  run: AgentRun;
}

export default function PortfolioExport({ run }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const shariahMode = useStore((s) => s.shariahMode);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const pdf = generatePortfolioPDF(run);
      const filename = `PSX_Portfolio_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      setDownloaded(true);
      showToast("PDF exported successfully", "success");
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('PDF generation failed:', err);
      showToast("PDF export failed", "error");
    } finally {
      setDownloading(false);
    }
  }, [run]);

  const copyToClipboardFallback = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard writeText failed, trying execCommand fallback:', err);
      }
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve) => {
      try {
        const successful = document.execCommand('copy');
        textArea.remove();
        resolve(successful);
      } catch (err) {
        textArea.remove();
        resolve(false);
      }
    });
  };

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const shareUrl = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: "Portfolio Report",
          text: "Check out my portfolio performance",
          url: shareUrl
        });
        showToast("Shared successfully", "success");
      } else {
        const copied = await copyToClipboardFallback(shareUrl);
        if (copied) {
          showToast("Link copied to clipboard", "success");
        } else {
          showToast("Failed to copy link", "error");
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
        showToast("Share failed", "error");
      }
    } finally {
      setSharing(false);
    }
  }, []);

  return (
    <div className="flex gap-2 relative">
      {/* Download PDF — primary CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleDownload}
        disabled={downloading}
        className={`flex-1 py-3.5 rounded-2xl font-heading font-bold text-[13px] flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 ${
          shariahMode
            ? 'bg-gradient-to-r from-shariah to-green-400 text-surface-primary shadow-lg shadow-shariah/20'
            : 'btn-gold'
        }`}
      >
        {downloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating…
          </>
        ) : downloaded ? (
          <>
            <Check className="w-4 h-4" />
            Downloaded
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            Export PDF
          </>
        )}
      </motion.button>

      {/* Share — secondary */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleShare}
        disabled={sharing}
        className="w-14 py-3.5 rounded-2xl glass-strong flex items-center justify-center hover:bg-psx-500/10 transition-colors"
      >
        {sharing ? (
          <Loader2 className="w-4 h-4 text-psx-200 animate-spin" />
        ) : (
          <Share2 className="w-4 h-4 text-psx-200" />
        )}
      </motion.button>

      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl shadow-elevated backdrop-blur-xl border z-50 flex items-center gap-2 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-profit/10 border-profit/20 text-profit'
                : 'bg-loss/10 border-loss/20 text-loss'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
