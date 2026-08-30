import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, X, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const MAX_LENGTH = 2000;
const SUCCESS_DISMISS_MS = 2500;

/**
 * Floating "Send feedback" control. Sits above the mobile tab bar on small
 * screens (bottom-4 on md+). Submission goes through AppContext.submitFeedback,
 * which is what talks to Supabase; pass `onSubmit` to override that (used in
 * tests, and anywhere the button is rendered outside AppProvider).
 *
 * `onSubmit(message)` must resolve to `{ success: boolean, error?: string }`.
 */
export default function FeedbackButton({ onSubmit, className }) {
  const app = useApp();
  const submit = onSubmit || app?.submitFeedback;

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorText, setErrorText] = useState('');
  const dismissTimer = useRef(null);

  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_LENGTH && status !== 'sending';

  useEffect(() => () => clearTimeout(dismissTimer.current), []);

  const reset = () => {
    setMessage('');
    setStatus('idle');
    setErrorText('');
  };

  const closePanel = () => {
    clearTimeout(dismissTimer.current);
    setOpen(false);
    reset();
  };

  const handleSend = async () => {
    if (!canSend) return;
    setStatus('sending');
    setErrorText('');

    if (typeof submit !== 'function') {
      setStatus('error');
      setErrorText('Feedback is unavailable right now. Please try again later.');
      return;
    }

    const result = await submit(trimmed);
    if (result?.success) {
      setStatus('success');
      setMessage('');
      dismissTimer.current = setTimeout(closePanel, SUCCESS_DISMISS_MS);
    } else {
      setStatus('error');
      setErrorText(result?.error || 'Could not send feedback. Please try again.');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') closePanel();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('fixed bottom-20 right-4 z-40 md:bottom-4', className)}>
      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          onKeyDown={onKeyDown}
          className="mb-3 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-popover p-4 text-sm text-popover-foreground shadow-xl shadow-black/50"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-base font-medium leading-none">Send feedback</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closePanel}
              aria-label="Close feedback form"
            >
              <X />
            </Button>
          </div>

          {status === 'success' ? (
            <p role="status" className="py-4 text-center text-sm text-muted-foreground">
              Thanks for the feedback!
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Found a bug or have an idea? Tell us what&apos;s on your mind.
              </p>
              <Textarea
                autoFocus
                value={message}
                maxLength={MAX_LENGTH}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (status === 'error') {
                    setStatus('idle');
                    setErrorText('');
                  }
                }}
                aria-label="Feedback message"
                aria-invalid={status === 'error' || undefined}
                placeholder="Your feedback…"
                className="min-h-24"
              />
              <div className="mt-1 flex items-start justify-between gap-2 text-[11px] text-muted-foreground">
                {errorText ? (
                  <span role="alert" className="text-destructive">
                    {errorText}
                  </span>
                ) : (
                  <span />
                )}
                <span className="shrink-0 tabular-nums">
                  {trimmed.length}/{MAX_LENGTH}
                </span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={closePanel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSend} disabled={!canSend}>
                  {status === 'sending' && <Loader2 className="animate-spin" />}
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <Button
        variant="outline"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-expanded={open}
        aria-label="Give feedback"
        className="shadow-lg shadow-black/30"
      >
        <MessageSquarePlus />
        Feedback
      </Button>
    </div>
  );
}
