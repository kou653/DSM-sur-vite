import { useEffect, useState } from "react";

function parsePayload(payload) {
  if (!payload.trim()) {
    return {};
  }

  return JSON.parse(payload);
}

function JsonCrudSection({
  title,
  records,
  loading,
  errorMessage,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  createTemplate,
  canManage = true,
  getRecordLabel,
}) {
  const [createPayload, setCreatePayload] = useState(
    JSON.stringify(createTemplate, null, 2)
  );
  const [editingId, setEditingId] = useState(null);
  const [editingPayload, setEditingPayload] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCreatePayload(JSON.stringify(createTemplate, null, 2));
  }, [createTemplate]);

  async function handleCreate(event) {
    event.preventDefault();

    if (!onCreate) {
      return;
    }

    setActionError("");
    setSubmitting(true);

    try {
      await onCreate(parsePayload(createPayload));
      setCreatePayload(JSON.stringify(createTemplate, null, 2));
      await onRefresh();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Creation impossible avec ce payload."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(recordId) {
    if (!onUpdate) {
      return;
    }

    setActionError("");
    setSubmitting(true);

    try {
      await onUpdate(recordId, parsePayload(editingPayload));
      setEditingId(null);
      setEditingPayload("");
      await onRefresh();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Mise a jour impossible avec ce payload."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(recordId) {
    if (!onDelete) {
      return;
    }

    setActionError("");
    setSubmitting(true);

    try {
      await onDelete(recordId);
      await onRefresh();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Suppression impossible pour cet enregistrement."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(record) {
    setEditingId(record.id);
    setEditingPayload(JSON.stringify(record.raw, null, 2));
    setActionError("");
  }

  if (!canManage) {
    return null;
  }

  return (
    <section className="crud-section">
      <div className="crud-header">
        <div>
          <p className="eyebrow">CRUD admin</p>
          <h3>{title}</h3>
        </div>

        <button
          type="button"
          className="secondary-action"
          onClick={onRefresh}
          disabled={loading || submitting}
        >
          Actualiser
        </button>
      </div>

      {onCreate ? (
        <form className="crud-form" onSubmit={handleCreate}>
          <label className="filter-field">
            <span>Payload creation JSON</span>
            <textarea
              value={createPayload}
              onChange={(event) => setCreatePayload(event.target.value)}
              rows={10}
            />
          </label>

          <button type="submit" className="primary-action" disabled={submitting}>
            Creer
          </button>
        </form>
      ) : null}

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}

      <div className="crud-list">
        {records.map((record) => (
          <article key={record.id} className="crud-item">
            <div className="crud-item-header">
              <strong>{getRecordLabel(record)}</strong>
              <div className="crud-actions">
                {onUpdate ? (
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => startEditing(record)}
                    disabled={submitting}
                  >
                    Modifier
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => handleDelete(record.id)}
                    disabled={submitting}
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
            </div>

            {editingId === record.id && onUpdate ? (
              <div className="crud-editor">
                <textarea
                  value={editingPayload}
                  onChange={(event) => setEditingPayload(event.target.value)}
                  rows={10}
                />
                <div className="crud-actions">
                  <button
                    type="button"
                    className="primary-action"
                    onClick={() => handleUpdate(record.id)}
                    disabled={submitting}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => {
                      setEditingId(null);
                      setEditingPayload("");
                    }}
                    disabled={submitting}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <pre className="json-preview">
                {JSON.stringify(record.raw, null, 2)}
              </pre>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default JsonCrudSection;
