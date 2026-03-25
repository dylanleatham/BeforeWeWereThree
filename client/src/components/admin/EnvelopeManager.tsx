import { useState, useCallback, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, Users, CheckCircle, RotateCcw } from 'lucide-react';
import type { Envelope, CreateEnvelopeRequest, UpdateEnvelopeRequest } from 'shared';
import { Button, Card, Heading, Text } from '../common';
import { EnvelopeForm } from './EnvelopeForm';
import { FriendManager } from './FriendManager';
import { createEnvelope, updateEnvelope, deleteEnvelope, resetSession, resetEnvelopeApi, closeBabymoon, reopenBabymoon, getBabymoonStatus } from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './EnvelopeManager.css';

interface EnvelopeManagerProps {
  envelopes: Envelope[];
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

type FormMode = { type: 'closed' } | { type: 'create' } | { type: 'edit'; envelope: Envelope };

/**
 * Admin interface for managing envelopes
 * Per ADMIN-05: Admin can create and edit envelopes
 */
export function EnvelopeManager({
  envelopes,
  onRefresh,
  isLoading = false,
}: EnvelopeManagerProps) {
  const [formMode, setFormMode] = useState<FormMode>({ type: 'closed' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resealConfirm, setResealConfirm] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [babymoonClosedAt, setBabymoonClosedAt] = useState<string | null>(null);

  useEffect(() => {
    getBabymoonStatus().then((status) => {
      setBabymoonClosedAt(status.closedAt);
    }).catch(() => {
      // Silently ignore — status will remain null
    });
  }, []);

  const handleResetSession = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await resetSession();
      if (result.success) {
        setResetConfirm(false);
        alert(STRINGS.MANAGER_RESET_SUCCESS(result.data));
        // Refresh envelope list since statuses were reset
        await onRefresh();
      } else {
        alert(STRINGS.MANAGER_RESET_ERROR(result.error?.message ?? 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  }, [onRefresh]);

  const handleCloseBabymoon = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await closeBabymoon();
      if (result.success) {
        setCompleteConfirm(false);
        setBabymoonClosedAt(result.data.closedAt);
      } else {
        alert(STRINGS.COMPLETE_ERROR(result.error?.message ?? 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleReopenBabymoon = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await reopenBabymoon();
      if (result.success) {
        setBabymoonClosedAt(null);
      } else {
        alert(STRINGS.COMPLETE_REOPEN_ERROR(result.error?.message ?? 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleCreate = useCallback(async (data: CreateEnvelopeRequest) => {
    setIsSaving(true);
    try {
      await createEnvelope(data);
      await onRefresh();
      setFormMode({ type: 'closed' });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create envelope');
    } finally {
      setIsSaving(false);
    }
  }, [onRefresh]);

  const handleUpdate = useCallback(
    async (data: CreateEnvelopeRequest) => {
      if (formMode.type !== 'edit') return;

      setIsSaving(true);
      try {
        await updateEnvelope(formMode.envelope.id, data as UpdateEnvelopeRequest);
        await onRefresh();
        setFormMode({ type: 'closed' });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to update envelope');
      } finally {
        setIsSaving(false);
      }
    },
    [formMode, onRefresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setIsSaving(true);
      try {
        await deleteEnvelope(id);
        await onRefresh();
        setDeleteConfirm(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete envelope');
      } finally {
        setIsSaving(false);
      }
    },
    [onRefresh]
  );

  const handleResetEnvelope = useCallback(
    async (id: string) => {
      setIsSaving(true);
      try {
        const result = await resetEnvelopeApi(id);
        if (result.success) {
          setResealConfirm(null);
          await onRefresh();
        } else {
          alert(result.error?.message ?? 'Failed to reset envelope');
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to reset envelope');
      } finally {
        setIsSaving(false);
      }
    },
    [onRefresh]
  );

  const formatType = (type: string) =>
    type
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  // Compute disabled types (singleton: gender-reveal)
  const disabledTypes = envelopes.some((e) => e.type === 'gender-reveal')
    ? ['gender-reveal']
    : [];

  // Show form if in create/edit mode
  if (formMode.type !== 'closed') {
    return (
      <div className="envelope-manager">
        <EnvelopeForm
          envelope={formMode.type === 'edit' ? formMode.envelope : undefined}
          onSubmit={formMode.type === 'create' ? handleCreate : handleUpdate}
          onCancel={() => setFormMode({ type: 'closed' })}
          isLoading={isSaving}
          disabledTypes={formMode.type === 'create' ? disabledTypes : []}
        />
      </div>
    );
  }

  return (
    <div className="envelope-manager">
      <header className="envelope-manager__header">
        <Heading level={2}>{STRINGS.MANAGER_HEADING}</Heading>
        <Button
          variant="primary"
          onClick={() => setFormMode({ type: 'create' })}
          disabled={isLoading}
        >
          <Plus size={18} />
          <span>{STRINGS.MANAGER_ADD_BUTTON}</span>
        </Button>
      </header>

      {isLoading && envelopes.length === 0 ? (
        <div className="envelope-manager__loading">
          <Text color="muted">{STRINGS.MANAGER_LOADING}</Text>
        </div>
      ) : envelopes.length === 0 ? (
        <Card className="envelope-manager__empty">
          <Mail size={48} strokeWidth={1} />
          <Text color="muted">{STRINGS.MANAGER_EMPTY}</Text>
        </Card>
      ) : (
        <ul className="envelope-manager__list">
          {envelopes.map((envelope) => (
            <li key={envelope.id} className="envelope-manager__item">
              <Card className="envelope-manager__card">
                <div className="envelope-manager__info">
                  <span className="envelope-manager__order">#{envelope.order}</span>
                  <div className="envelope-manager__details">
                    <span className="envelope-manager__name">{envelope.title}</span>
                    <span className="envelope-manager__type">{formatType(envelope.type)}</span>
                  </div>
                  <span
                    className={`envelope-manager__status envelope-manager__status--${envelope.status}`}
                  >
                    {envelope.status}
                  </span>
                </div>
                <div className="envelope-manager__actions">
                  {envelope.status !== 'sealed' && envelope.type !== 'friend-letter' && (
                    resealConfirm === envelope.id ? (
                      <>
                        <button
                          className="envelope-manager__btn envelope-manager__btn--warning"
                          onClick={() => handleResetEnvelope(envelope.id)}
                          disabled={isSaving}
                        >
                          {STRINGS.MANAGER_RESET_ENVELOPE_CONFIRM}
                        </button>
                        <button
                          className="envelope-manager__btn"
                          onClick={() => setResealConfirm(null)}
                          disabled={isSaving}
                        >
                          {STRINGS.MANAGER_CANCEL}
                        </button>
                      </>
                    ) : (
                      <button
                        className="envelope-manager__btn"
                        onClick={() => setResealConfirm(envelope.id)}
                        aria-label={STRINGS.MANAGER_ARIA_RESET_ENVELOPE(envelope.title)}
                        disabled={isSaving}
                      >
                        <RotateCcw size={18} />
                      </button>
                    )
                  )}
                  <button
                    className="envelope-manager__btn"
                    onClick={() => setFormMode({ type: 'edit', envelope })}
                    aria-label={STRINGS.MANAGER_ARIA_EDIT(envelope.title)}
                    disabled={isSaving}
                  >
                    <Edit2 size={18} />
                  </button>
                  {deleteConfirm === envelope.id ? (
                    <>
                      <button
                        className="envelope-manager__btn envelope-manager__btn--danger"
                        onClick={() => handleDelete(envelope.id)}
                        disabled={isSaving}
                      >
                        {STRINGS.MANAGER_CONFIRM}
                      </button>
                      <button
                        className="envelope-manager__btn"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={isSaving}
                      >
                        {STRINGS.MANAGER_CANCEL}
                      </button>
                    </>
                  ) : (
                    <button
                      className="envelope-manager__btn envelope-manager__btn--danger"
                      onClick={() => setDeleteConfirm(envelope.id)}
                      aria-label={STRINGS.MANAGER_ARIA_DELETE(envelope.title)}
                      disabled={isSaving}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Friend Letters Management */}
      <FriendManager />

      {/* Complete Experience */}
      <section className="envelope-manager__tools">
        <Heading level={3}>{STRINGS.COMPLETE_HEADING}</Heading>
        <Card className="envelope-manager__tool-card">
          <div className="envelope-manager__tool-info">
            <CheckCircle size={20} />
            <div>
              <Text>{STRINGS.COMPLETE_HEADING}</Text>
              <Text variant="small" color="muted">
                {babymoonClosedAt
                  ? STRINGS.COMPLETE_STATUS(new Date(babymoonClosedAt).toLocaleDateString())
                  : STRINGS.COMPLETE_DESCRIPTION}
              </Text>
            </div>
          </div>
          {babymoonClosedAt ? (
            <Button
              variant="secondary"
              onClick={handleReopenBabymoon}
              disabled={isSaving}
            >
              {STRINGS.COMPLETE_REOPEN}
            </Button>
          ) : completeConfirm ? (
            <div className="envelope-manager__actions">
              <button
                className="envelope-manager__btn envelope-manager__btn--danger"
                onClick={handleCloseBabymoon}
                disabled={isSaving}
              >
                {STRINGS.COMPLETE_CONFIRM}
              </button>
              <button
                className="envelope-manager__btn"
                onClick={() => setCompleteConfirm(false)}
                disabled={isSaving}
              >
                {STRINGS.MANAGER_CANCEL}
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => setCompleteConfirm(true)}
              disabled={isSaving}
            >
              {STRINGS.COMPLETE_BUTTON}
            </Button>
          )}
        </Card>
      </section>

      {/* Debug/Test Tools */}
      <section className="envelope-manager__tools">
        <Heading level={3}>{STRINGS.MANAGER_TOOLS_HEADING}</Heading>
        <Card className="envelope-manager__tool-card">
          <div className="envelope-manager__tool-info">
            <Users size={20} />
            <div>
              <Text>{STRINGS.MANAGER_RESET_TITLE}</Text>
              <Text variant="small" color="muted">
                {STRINGS.MANAGER_RESET_DESCRIPTION}
              </Text>
            </div>
          </div>
          {resetConfirm ? (
            <div className="envelope-manager__actions">
              <button
                className="envelope-manager__btn envelope-manager__btn--danger"
                onClick={handleResetSession}
                disabled={isSaving}
              >
                {STRINGS.MANAGER_RESET_CONFIRM}
              </button>
              <button
                className="envelope-manager__btn"
                onClick={() => setResetConfirm(false)}
                disabled={isSaving}
              >
                {STRINGS.MANAGER_CANCEL}
              </button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setResetConfirm(true)}
              disabled={isSaving}
            >
              {STRINGS.MANAGER_RESET_BUTTON}
            </Button>
          )}
        </Card>
      </section>
    </div>
  );
}
