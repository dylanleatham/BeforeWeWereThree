import { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Mail } from 'lucide-react';
import type { Envelope, CreateEnvelopeRequest, UpdateEnvelopeRequest } from 'shared';
import { Button, Card, Heading, Text } from '../common';
import { EnvelopeForm } from './EnvelopeForm';
import { createEnvelope, updateEnvelope, deleteEnvelope } from '../../services/api';
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

  const handleCreate = useCallback(async (data: CreateEnvelopeRequest) => {
    setIsSaving(true);
    try {
      await createEnvelope(data);
      await onRefresh();
      setFormMode({ type: 'closed' });
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

  // Show form if in create/edit mode
  if (formMode.type !== 'closed') {
    return (
      <div className="envelope-manager">
        <EnvelopeForm
          envelope={formMode.type === 'edit' ? formMode.envelope : undefined}
          onSubmit={formMode.type === 'create' ? handleCreate : handleUpdate}
          onCancel={() => setFormMode({ type: 'closed' })}
          isLoading={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="envelope-manager">
      <header className="envelope-manager__header">
        <Heading level={2}>Envelope Management</Heading>
        <Button
          variant="primary"
          onClick={() => setFormMode({ type: 'create' })}
          disabled={isLoading}
        >
          <Plus size={18} />
          <span>Add Envelope</span>
        </Button>
      </header>

      {isLoading && envelopes.length === 0 ? (
        <div className="envelope-manager__loading">
          <Text color="muted">Loading envelopes...</Text>
        </div>
      ) : envelopes.length === 0 ? (
        <Card className="envelope-manager__empty">
          <Mail size={48} strokeWidth={1} />
          <Text color="muted">No envelopes yet. Create your first one!</Text>
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
                  <button
                    className="envelope-manager__btn"
                    onClick={() => setFormMode({ type: 'edit', envelope })}
                    aria-label={`Edit ${envelope.title}`}
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
                        Confirm
                      </button>
                      <button
                        className="envelope-manager__btn"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="envelope-manager__btn envelope-manager__btn--danger"
                      onClick={() => setDeleteConfirm(envelope.id)}
                      aria-label={`Delete ${envelope.title}`}
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
    </div>
  );
}
