import { useState } from 'react';
import { secondaryButton } from './presentation';
import { gameErrorMessage, gameRequest } from './api';

export function ContributionForm() {
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (action: 'offer' | 'withdraw') => {
    setBusy(true);
    setFailed(false);
    setStatus('');
    try {
      await gameRequest('/contribute', { action, comment, confirmed });
      setStatus(
        action === 'offer'
          ? 'Permission recorded. Send the comment ID to a moderator for review.'
          : 'Permission withdrawn.'
      );
    } catch (error) {
      setFailed(true);
      setStatus(gameErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="text-sm">
      <summary className="desk-link">Contribute a comment</summary>
      <form
        className="desk-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run('offer');
        }}
      >
        <div>
          <h2 className="font-bold">
            Your comment could become tomorrow’s mystery.
          </h2>
          <p className="case-mode">
            Offer a comment you wrote. A moderator reviews it before it can
            appear in Real Case Files.
          </p>
        </div>
        <label>
          Your Reddit comment link or ID
          <input
            className="mt-1 min-h-11 w-full rounded-lg border border-[var(--line)] px-3"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            required
            maxLength={500}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            className="size-5 shrink-0"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            required
          />
          I wrote this comment and give permission to adapt and display it in
          this game.
        </label>
        <button className={secondaryButton} disabled={busy}>
          Offer for review
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={busy || !comment.trim()}
          onClick={() => void run('withdraw')}
        >
          Withdraw permission
        </button>
        {status && (
          <p className="notice" role={failed ? 'alert' : 'status'}>
            {status}
          </p>
        )}
      </form>
    </details>
  );
}
