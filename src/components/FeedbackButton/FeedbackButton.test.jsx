import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackButton from './FeedbackButton';

// The component reads submitFeedback from AppContext, but accepts an `onSubmit`
// override so it can be tested without standing up the whole AppProvider.
const openForm = async (onSubmit) => {
  const user = userEvent.setup();
  render(<FeedbackButton onSubmit={onSubmit} />);
  await user.click(screen.getByRole('button', { name: /give feedback/i }));
  return user;
};

describe('FeedbackButton', () => {
  it('renders the trigger and keeps the form closed until clicked', () => {
    render(<FeedbackButton onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /give feedback/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the feedback form when the trigger is clicked', async () => {
    await openForm(vi.fn());
    expect(await screen.findByRole('dialog', { name: /send feedback/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/feedback message/i)).toBeInTheDocument();
  });

  it('keeps Send disabled until a non-whitespace message is entered', async () => {
    const user = await openForm(vi.fn());
    const send = screen.getByRole('button', { name: /^send$/i });
    const box = screen.getByLabelText(/feedback message/i);

    expect(send).toBeDisabled();
    await user.type(box, '   ');
    expect(send).toBeDisabled();
    await user.type(box, 'Real feedback');
    expect(send).toBeEnabled();
  });

  it('submits the trimmed message and shows a confirmation', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    const user = await openForm(onSubmit);

    await user.type(screen.getByLabelText(/feedback message/i), '  The upload page is slow  ');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('The upload page is slow'));
    expect(await screen.findByRole('status')).toHaveTextContent(/thanks for the feedback/i);
  });

  it('keeps the form open and surfaces the error when submission fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: false, error: 'Network unavailable' });
    const user = await openForm(onSubmit);

    await user.type(screen.getByLabelText(/feedback message/i), 'Something broke');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/network unavailable/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/feedback message/i)).toHaveValue('Something broke');
  });

  it('never calls onSubmit for whitespace-only feedback', async () => {
    const onSubmit = vi.fn();
    const user = await openForm(onSubmit);

    await user.type(screen.getByLabelText(/feedback message/i), '     ');
    await user.click(screen.getByRole('button', { name: /^send$/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes the form when Cancel is clicked', async () => {
    const user = await openForm(vi.fn());
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
