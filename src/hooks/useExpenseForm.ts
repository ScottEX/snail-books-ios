import { useState, useCallback, useRef } from 'react';
import { t } from '../i18n';
import { api } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { PickedImage } from '../utils/imagePicker';
import { WriteSubmission } from '../utils/writeSubmission';

interface UseExpenseFormOptions {
  onExpenseHistory?: () => void;
  onExpenseAdded?: () => void;
  getPreviewUrl: (file: any) => string;
  revokePreviewUrl: (file: any) => void;
  clearUrlCache: () => void;
  onToast: (msg: string) => void;
}

export function useExpenseForm(options: UseExpenseFormOptions) {
  const { onExpenseHistory, onExpenseAdded, getPreviewUrl, revokePreviewUrl, clearUrlCache, onToast } = options;
  const sd = useServerDate();

  /* ── expense form state ── */
  const [selectedDate, setExpDate] = useState<string | null>(null);
  const expDate = selectedDate ?? (sd.ready ? sd.today : '');
  const [expDateErr, setExpDateErr] = useState(0);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('daily');
  const [payMethod, setPayMethod] = useState('payWechat');
  const [expNote, setExpNote] = useState('');
  const [expImages, setExpImages] = useState<PickedImage[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [isRefund, setIsRefund] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const submission = useRef(new WriteSubmission<Record<string, unknown>>()).current;

  /* ── image helpers ── */

  /** Validate and add images — matches web handleImageSelect (MIME + 10 MB + dedup) */
  const handleImageSelect = useCallback((files: PickedImage[]) => {
    const valid: PickedImage[] = [];
    for (const f of files) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type ?? '')) continue;
      if ((f.size ?? 0) > 10 * 1024 * 1024) continue;
      if (expImages.some(ei => ei.name === f.name && ei.size === f.size)) continue;
      valid.push(f);
    }
    if (valid.length > 0) setExpImages(prev => [...prev, ...valid]);
  }, [expImages]);

  const removeImage = useCallback((idx: number) => {
    setExpImages(prev => {
      if (prev[idx]) revokePreviewUrl(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }, [revokePreviewUrl]);

  /* ── reset form ── */
  const resetForm = useCallback(() => {
    setExpAmount('');
    setExpCategory('daily');
    setPayMethod('payWechat');
    setExpNote('');
    setExpDate(null);
    setExpImages([]);
    setExpDateErr(0);
    setLoadingExp(false);
    setUploadingImg(false);
    setIsRefund(false);
  }, []);

  /* ── submit ── */
  const missingRequiredFields = !expDate || !expCategory || !payMethod;
  const handleAddExpense = useCallback(async () => {
    const raw = parseFloat(expAmount.replace(/,/g, ''));
    if (submission.running || missingRequiredFields || !Number.isFinite(raw) || raw === 0) return;
    if (!isRefund && raw <= 0) return;
    if (sd.ready && sd.isFuture(expDate)) { return; }
    setLoadingExp(true);
    const fields = { type: 'expense', amount: raw * (isRefund ? -1 : 1),
      category: expCategory, account: payMethod, note: expNote, date: expDate };
    try {
      const saved = await submission.run([fields, expImages], async () => {
        if (expImages.length === 0) return { ...fields, images: [], thumb_images: [] };
        setUploadingImg(true);
        try {
          const result = await api.uploadExpenseImages(expImages);
          if (result.status !== 'ok') throw new Error(t('uploadFailed'));
          const images = result.images || [];
          return { ...fields, images, thumb_images: result.thumb_images?.length ? result.thumb_images : images };
        } finally { setUploadingImg(false); }
      }, api.createTransaction);
      if (saved?.status !== 'ok') throw new Error(saved?.message || t('toastSubmitFailed'));
      clearUrlCache();
      resetForm();
      onExpenseAdded?.();
      onExpenseHistory?.();
    } catch (error) { onToast(error instanceof Error ? error.message : t('toastSubmitFailed')); }
    finally { setLoadingExp(false); }
  }, [
    expAmount, expDate, expImages, expCategory, payMethod, expNote,
    isRefund, sd, missingRequiredFields, clearUrlCache, resetForm, onExpenseHistory, onExpenseAdded, onToast, submission,
  ]);

  /* ── derived ── */
  const amount = parseFloat(expAmount.replace(/,/g, ''));
  const isAmountInvalid = missingRequiredFields || !Number.isFinite(amount) || amount === 0 || loadingExp;
  const hasExpenseEdits = !!(expAmount || expNote || expImages.length || isRefund || expDateErr
    || (selectedDate !== null && selectedDate !== sd.today) || expCategory !== 'daily' || payMethod !== 'payWechat');

  return {
    expDate, setExpDate,
    expDateErr, setExpDateErr,
    expAmount, setExpAmount,
    expCategory, setExpCategory,
    payMethod, setPayMethod,
    expNote, setExpNote,
    expImages, setExpImages,
    uploadingImg,
    loadingExp,
    isRefund, setIsRefund,
    handleAddExpense,
    handleImageSelect,
    resetForm,
    removeImage,
    isAmountInvalid,
    hasExpenseEdits,
  };
}
