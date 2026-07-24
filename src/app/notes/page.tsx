'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { todayIso } from '@/lib/members';

type NoteRow = {
  id: string;
  meeting_date: string;
  title: string;
  content: string;
  created_by_email: string | null;
  created_at: string;
  updated_by_email: string | null;
  updated_at: string;
};

type NoteFormState = {
  meeting_date: string;
  title: string;
  content: string;
};

const emptyForm: NoteFormState = {
  meeting_date: todayIso(),
  title: '',
  content: '',
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const nameFromEmail = (email: string) => email.split('@')[0];

const PREVIEW_LIMIT = 400;
const isLongContent = (content: string) => content.length > PREVIEW_LIMIT || content.split('\n').length > 8;
const previewContent = (content: string) => content.slice(0, PREVIEW_LIMIT).trimEnd() + '…';

export default function NotesPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<NoteFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NoteFormState>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [viewingNote, setViewingNote] = useState<NoteRow | null>(null);

  useEffect(() => {
    if (!viewingNote) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [viewingNote]);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('meeting_notes')
      .select('*')
      .order('meeting_date', { ascending: false })
      .order('created_at', { ascending: false });
    setNotes((data as NoteRow[]) ?? []);
  };

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        router.replace('/login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      setCanWrite(roleData?.role === 'cg' || roleData?.role === 'secretaire');
      setReady(true);

      await fetchNotes();
      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { error: insertError } = await supabase.from('meeting_notes').insert({
      meeting_date: form.meeting_date,
      title: form.title.trim(),
      content: form.content.trim(),
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message || 'Could not save this note.');
      return;
    }

    setForm(emptyForm);
    setIsAdding(false);
    await fetchNotes();
  };

  const startEdit = (note: NoteRow) => {
    setEditingId(note.id);
    setEditForm({ meeting_date: note.meeting_date, title: note.title, content: note.content });
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError('');

    const { error: updateError } = await supabase
      .from('meeting_notes')
      .update({
        meeting_date: editForm.meeting_date,
        title: editForm.title.trim(),
        content: editForm.content.trim(),
      })
      .eq('id', id);

    setEditSaving(false);

    if (updateError) {
      setEditError(updateError.message || 'Could not save your changes.');
      return;
    }

    setEditingId(null);
    await fetchNotes();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error: deleteError } = await supabase.from('meeting_notes').delete().eq('id', id);
    setDeletingId(null);
    setConfirmDeleteId(null);

    if (!deleteError) {
      setViewingNote(prev => (prev?.id === id ? null : prev));
      await fetchNotes();
    }
  };

  if (!ready) {
    return (
      <main className="page-shell">
        <div className="section-header section-header--wrap">
          <h1>Meeting Notes</h1>
        </div>
        <section className="panel accent-red" aria-label="Meeting notes loading">
          <p style={{ color: '#76716c' }}>Loading...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="section-header section-header--wrap">
        <h1>Meeting Notes</h1>
        {canWrite && (
          <button
            className="button button--primary"
            type="button"
            onClick={() => {
              setIsAdding(v => !v);
              setForm(emptyForm);
              setError('');
            }}
          >
            {isAdding ? 'Close' : 'New Entry'}
          </button>
        )}
      </div>

      {!canWrite && (
        <p style={{ color: '#76716c', fontSize: 13, marginBottom: 16 }}>
        </p>
      )}

      {isAdding && canWrite && (
        <section className="panel form-card accent-red" aria-label="New meeting note" style={{ marginBottom: 20 }}>
          <div className="form-card__header">
            <h2>New Entry</h2>
          </div>
          <form onSubmit={handleAddNote}>
            {error && <p className="form-error">{error}</p>}
            <div className="form-grid">
              <label>
                Meeting date
                <input
                  type="date"
                  value={form.meeting_date}
                  onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))}
                  required
                />
              </label>
              <label>
                Title
                <input
                  type="text"
                  placeholder="e.g. Weekly Leaders Meeting"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>
              Summary / points discussed
              <textarea
                rows={8}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                required
                style={{ width: '100%', marginTop: 6, resize: 'vertical' }}
              />
            </label>
            <button className="button button--primary" type="submit" disabled={saving} style={{ marginTop: 16 }}>
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </section>
      )}

      {loading ? (
        <section className="panel accent-red" aria-label="Meeting notes loading">
          <p style={{ color: '#76716c' }}>Loading notes...</p>
        </section>
      ) : notes.length === 0 ? (
        <section className="panel accent-red" aria-label="No meeting notes">
          <p style={{ color: '#76716c' }}>No meeting notes yet.</p>
        </section>
      ) : (
        notes.map(note => (
          <section className="panel accent-red note-card" key={note.id} aria-label="Meeting note">
            {editingId === note.id ? (
              <form onSubmit={e => handleSaveEdit(e, note.id)}>
                {editError && <p className="form-error">{editError}</p>}
                <div className="form-grid">
                  <label>
                    Meeting date
                    <input
                      type="date"
                      value={editForm.meeting_date}
                      onChange={e => setEditForm(f => ({ ...f, meeting_date: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Title
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </label>
                </div>
                <label style={{ display: 'block', marginTop: 12 }}>
                  Summary / points discussed
                  <textarea
                    rows={8}
                    value={editForm.content}
                    onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                    required
                    style={{ width: '100%', marginTop: 6, resize: 'vertical' }}
                  />
                </label>
                <div className="form-actions">
                  <button className="button button--primary" type="submit" disabled={editSaving}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={cancelEdit} disabled={editSaving}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="note-card__header">
                  <div>
                    <p className="eyebrow">{formatDate(note.meeting_date)}</p>
                    {note.title && <h2 className="note-card__title">{note.title}</h2>}
                  </div>
                  {canWrite && (
                    <div className="note-card__actions">
                      {confirmDeleteId === note.id ? (
                        <>
                          <button
                            className="button button--danger button--small"
                            type="button"
                            disabled={deletingId === note.id}
                            onClick={() => handleDelete(note.id)}
                          >
                            {deletingId === note.id ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            className="button button--secondary button--small"
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="button button--secondary button--small" type="button" onClick={() => startEdit(note)}>
                            Edit
                          </button>
                          <button
                            className="button button--secondary button--small"
                            type="button"
                            onClick={() => setConfirmDeleteId(note.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p
                  className={`note-card__content ${isLongContent(note.content) ? 'note-card__content--clickable' : ''}`}
                  onClick={() => { if (isLongContent(note.content)) setViewingNote(note); }}
                >
                  {isLongContent(note.content) ? previewContent(note.content) : note.content}
                </p>
                {isLongContent(note.content) && (
                  <button
                    type="button"
                    className="button button--secondary button--small"
                    style={{ marginTop: 8 }}
                    onClick={() => setViewingNote(note)}
                  >
                    Read full note
                  </button>
                )}
                <p className="note-card__meta">
                  {note.updated_by_email && note.updated_at !== note.created_at
                    ? `Last edited by ${nameFromEmail(note.updated_by_email)} on ${formatTimestamp(note.updated_at)}`
                    : note.created_by_email
                      ? `Written by ${nameFromEmail(note.created_by_email)} on ${formatTimestamp(note.created_at)}`
                      : null}
                </p>
              </>
            )}
          </section>
        ))
      )}

      {viewingNote && (
        <div className="history-overlay" onClick={() => setViewingNote(null)}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <p className="eyebrow">{formatDate(viewingNote.meeting_date)}</p>
                {viewingNote.title && <h2>{viewingNote.title}</h2>}
              </div>
              <button className="history-close" type="button" onClick={() => setViewingNote(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="history-modal__body">
              <p className="note-card__content">{viewingNote.content}</p>
              <p className="note-card__meta">
                {viewingNote.updated_by_email && viewingNote.updated_at !== viewingNote.created_at
                  ? `Last edited by ${nameFromEmail(viewingNote.updated_by_email)} on ${formatTimestamp(viewingNote.updated_at)}`
                  : viewingNote.created_by_email
                    ? `Written by ${nameFromEmail(viewingNote.created_by_email)} on ${formatTimestamp(viewingNote.created_at)}`
                    : null}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
