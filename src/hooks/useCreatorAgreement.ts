import { useState, useRef, useCallback } from 'react';
import {
  creatorAgreementService,
  isCreatorAgreementCached,
  setCreatorAgreementCached,
} from '../services/CreatorAgreementService';

// Re-export for BecomeCreatorModal (existing import path).
export { isCreatorAgreementCached };

export function useCreatorAgreement() {
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementSubmitting, setAgreementSubmitting] = useState(false);
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null);

  /**
   * Call before any first-time creator action.
   * Returns true if the user has already accepted (or just accepted now).
   * Returns false if the user dismissed the modal.
   */
  const requestAgreement = useCallback(async (): Promise<boolean> => {
    if (isCreatorAgreementCached()) return true;

    try {
      const accepted = await creatorAgreementService.hasAcceptedAgreement();
      if (accepted) return true;
    } catch {
      // If the check fails, don't block the user (offline / API unavailable).
      return true;
    }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setShowAgreement(true);
    });
  }, []);

  const handleAgreed = useCallback(async () => {
    setAgreementSubmitting(true);
    try {
      const ok = await creatorAgreementService.acceptAgreement();
      if (!ok) {
        // Best-effort — allow proceed if API fails so user isn't hard-blocked offline.
        setCreatorAgreementCached(true);
      }
    } finally {
      setAgreementSubmitting(false);
    }
    setShowAgreement(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setShowAgreement(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return {
    requestAgreement,
    agreementVisible: showAgreement,
    agreementSubmitting,
    onAgreed: handleAgreed,
    onDismiss: handleDismiss,
  };
}
