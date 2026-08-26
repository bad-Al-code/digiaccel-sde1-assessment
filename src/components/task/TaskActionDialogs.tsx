'use client';

import { GuestUpgradeDialog } from '@/components/auth/GuestUpgradeDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TaskFormSheet } from './TaskFormSheet';
import type { TaskActions } from './useTaskActions';

export function TaskActionDialogs({ actions }: { actions: TaskActions }) {
  return (
    <>
      <ConfirmDialog
        open={actions.pendingDelete !== null}
        title="Delete this task?"
        description={`"${actions.pendingDelete?.title ?? ''}" will be removed permanently.`}
        confirmLabel="Delete"
        tone="destructive"
        busy={actions.deleting}
        onConfirm={() => void actions.confirmDelete()}
        onCancel={actions.cancelDelete}
      />

      <ConfirmDialog
        open={actions.pendingUpdate !== null}
        title="Save changes?"
        description="This will update the task with the details you entered."
        confirmLabel="Save changes"
        busy={actions.updating}
        onConfirm={() => void actions.confirmUpdate()}
        onCancel={actions.cancelUpdate}
      />

      <GuestUpgradeDialog open={actions.guestLimitHit} onClose={actions.dismissGuestLimit} />

      <TaskFormSheet
        open={actions.sheetOpen}
        task={actions.editing}
        defaultDate={actions.defaultDate}
        submitting={actions.submitting}
        onClose={actions.closeSheet}
        onSubmit={(payload) => void actions.submit(payload)}
      />
    </>
  );
}
