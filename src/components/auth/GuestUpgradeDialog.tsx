'use client';

import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface GuestUpgradeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GuestUpgradeDialog({ open, onClose }: GuestUpgradeDialogProps) {
  const router = useRouter();

  return (
    <ConfirmDialog
      open={open}
      title="Create a free account"
      description="Guests can add one task. Create an account or sign in to add more, and the task you just wrote is saved for you."
      confirmLabel="Continue"
      cancelLabel="Not now"
      onConfirm={() => router.push('/auth?mode=signup')}
      onCancel={onClose}
    />
  );
}
