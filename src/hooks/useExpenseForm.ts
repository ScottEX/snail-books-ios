import { useState, useEffect, useCallback } from 'react';
import { t } from '../i18n';
import { api } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { PickedImage } from '../utils/imagePicker';

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
  const [expDate, setExpDate] = useState('');
  useEffect(() => { if (sd.ready && expDate === '') setExpDate(sd.today); }, [sd.ready, sd.today, expDate]);
  const [expDateErr, setExpDateErr] = useState(0);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('daily');
  const [payMethod, setPayMethod] = useState('payWechat');
  const [expNote, setExpNote] = useState('');
  const [expImages, setExpImages] = useState<PickedImage[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [isRefund, setIsRefund] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);

  /* ── image helpers ── */
  const validateImages = useCallback((files: any[]) => {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    return files.filter(f => {
      if (!ALLOWED.includes(f.type || '')) return false;
      if ((f.size || 0) > 10 * 1024 * 1024) return false;
      if (expImages.some((ei: any) => ei.name === f.name && ei.size === f.size)) return false;
      return true;
    });
  }, [expImages]);

  const removeImage = useCallback((idx: number) => {
    setExpImages(prev => {
      if (prev[idx]) revokePreviewUrl(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }, [revokePreviewUrl]);

  /* ── submit ── */
  const handleAddExpense = useCallback(async () => {
    const raw = parseFloat(expAmount.replace(/,/g, ''));
    if (!expAmount || raw === 0) return;
    if (!isRefund && raw <= 0) return;
    if (sd.ready && sd.isFuture(expDate)) { return; }
    setLoadingExp(true);
    try {
      let imageUrls: string[] = [];
      let thumbUrls: string[] = [];
      const validImages = validateImages(expImages);
      if (validImages.length > 0) {
        setUploadingImg(true);
        const result = await api.uploadExpenseImages(validImages);
        setUploadingImg(false);
        if (result.status !== 'ok') {
          onToast(t('uploadFailed'));
          setLoadingExp(false);
          return;
        }
        imageUrls = result.images || [];
        thumbUrls = (result.thumb_images && result.thumb_images.length > 0)
          ? result.thumb_images
          : imageUrls;
      }
      await api.createTransaction({
        type: 'expense',
        amount: parseFloat(expAmount.replace(/,/g, '')) * (isRefund ? -1 : 1),
        category: expCategory,
        account: payMethod,
        note: expNote,
        date: expDate,
        images: imageUrls,
        thumb_images: thumbUrls,
      });
      clearUrlCache();
      setExpAmount('');
      setExpCategory('daily');
      setPayMethod('payWechat');
      setExpNote('');
      setExpDate(sd.today || '');
      setExpImages([]);
      setIsRefund(false);
      onExpenseAdded?.();
      onExpenseHistory?.();
    } catch { onToast(t('toastSubmitFailed')); }
    setLoadingExp(false);
  }, [
    expAmount, expDate, expImages, expCategory, payMethod, expNote,
    isRefund, sd, validateImages, clearUrlCache, onExpenseHistory, onExpenseAdded, onToast,
  ]);

  /* ── derived ── */
  const isAmountInvalid = !expAmount || parseFloat(expAmount.replace(/,/g, '')) === 0 || loadingExp;

  return {
    expDate, setExpDate,
    expDateErr, setExpDateErr,
    expAmount, setExpAmount,
    expCategory, setExpCategory,
    payMethod, setPayMethod,
    expNote, setExpNote,
    expImages, setExpImages,
    uploadingImg, setUploadingImg,
    loadingExp,
    isRefund, setIsRefund,
    handleAddExpense,
    removeImage,
    isAmountInvalid,
  };
}
