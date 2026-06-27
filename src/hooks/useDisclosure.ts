import { useState, useCallback } from 'react';

/**
 * Boolean toggle hook — replaces the ad-hoc useState(true)/setShow(false) pair
 * used for opening/closing modals and popovers.
 */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((v) => !v), []);
  return { open, onOpen, onClose, onToggle, setOpen } as const;
}
