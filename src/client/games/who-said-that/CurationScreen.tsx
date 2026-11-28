import { useEffect, useState } from 'react';
import type { ContentStatus } from '../../../shared/games/who-said-that/community';
import { GameFrame } from './CaseCards';
import { primaryButton, secondaryButton } from './presentation';
import { gameErrorMessage, gameRequest } from './api';

type Preview = { body: string; answer: string; review: string };
const field =
  'min-h-11 w-full rounded-lg border border-[var(--line)] px-3 py-2';

export function CurationScreen({ onHome }: { onHome: () => void }) {
  const [status, setStatus] = useState<ContentStatus | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void gameRequest<ContentStatus>('/curation', undefined, controller.signal)
      .then(setStatus)
      .catch((err) => {
        if (!controller.signal.aborted) setError(gameErrorMessage(err));
      });
    return () => controller.abort();
  }, []);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (err) {
      setError(gameErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameFrame title="Content curation" onHome={onHome}>
      {status ? (
        <p className="notice text-sm">
          {status.daily} Daily · {status.party} Party ·{' '}
          {status.distinctDailyPacks} distinct Daily packs
          {!status.entries.length && (
            <span className="block mt-1">No approved comments yet.</span>
          )}
        </p>
      ) : (
        !error && (
          <p className="notice" role="status">
            Loading the approved bank…
          </p>
        )
      )}
      <form
        className="desk-form"
        onChange={() => setPreview(null)}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void run(async () => {
            const fields = {
              comment: data.get('comment'),
              pool: data.get('pool'),
              difficulty: data.get('difficulty'),
              distractors: data.get('distractors'),
              explanation: data.get('explanation'),
              consentReference: data.get('consentReference'),
              permissionConfirmed: data.get('permissionConfirmed') === 'on',
            };
            if (preview) {
              const review = preview.review;
              setPreview(null);
              setStatus(
                await gameRequest<ContentStatus>('/curation', {
                  ...fields,
                  type: 'approve',
                  review,
                })
              );
              setNotice('Case approved.');
            } else
              setPreview(
                await gameRequest<Preview>('/curation', {
                  ...fields,
                  type: 'review',
                })
              );
          });
        }}
      >
        <label>
          Reddit comment ID or link
          <input name="comment" className={field} maxLength={500} required />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            Pool
            <select name="pool" className={field}>
              <option value="daily">Daily</option>
              <option value="party">Party</option>
            </select>
          </label>
          <label>
            Difficulty
            <select name="difficulty" className={field}>
              <option value="medium">Medium</option>
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
        <label>
          Three distractors, comma separated
          <input
            name="distractors"
            className={field}
            maxLength={100}
            required
          />
        </label>
        <label>
          Culture explanation
          <textarea
            name="explanation"
            className={field}
            rows={2}
            maxLength={240}
            required
          />
        </label>
        <label>
          Permission receipt ID (for permission obtained outside the app)
          <input name="consentReference" className={field} maxLength={48} />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            name="permissionConfirmed"
            type="checkbox"
            className="size-5 shrink-0"
          />
          I have recorded the author’s explicit permission. Authors who opted in
          here need no receipt.
        </label>
        {preview && (
          <blockquote className="evidence text-sm">
            {preview.body}
            <br />
            Answer · r/{preview.answer}
          </blockquote>
        )}
        <button className={primaryButton} disabled={busy}>
          {preview ? 'Approve case' : 'Validate and preview'}
        </button>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <details className="rounded-lg border border-[var(--line)] p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
          Resolve a verified account deletion
        </summary>
        <form
          className="grid gap-2 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const userId = new FormData(event.currentTarget).get('userId');
            void run(async () => {
              await gameRequest('/me/delete', { userId });
              setNotice('Game data removed for the requested account.');
            });
          }}
        >
          <label>
            Reddit account ID
            <input
              className={field}
              name="userId"
              placeholder="t2_…"
              pattern="t2_[a-z0-9]{1,32}"
              required
            />
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-5 shrink-0" required /> I
            verified this deletion request.
          </label>
          <button className={secondaryButton} disabled={busy}>
            Remove account game data
          </button>
        </form>
      </details>
      {status && status.entries.length > 0 && (
        <section className="grid gap-2" aria-label="Content status">
          <h2 className="font-bold">Case status</h2>
          {status.entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-[var(--line)] p-3 text-sm"
            >
              <span>
                {entry.commentId} · {entry.pool} · {entry.status}
                {entry.reason && ` · ${entry.reason}`}
              </span>
              {entry.status === 'approved' && (
                <button
                  className={secondaryButton}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      setStatus(
                        await gameRequest<ContentStatus>('/curation', {
                          type: 'withdraw',
                          comment: entry.commentId,
                        })
                      );
                      setNotice('Case withdrawn.');
                    })
                  }
                >
                  Withdraw
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </GameFrame>
  );
}
