/**
 * PinEntry component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinEntry } from '../../components/auth/PinEntry';
import { PIN_LENGTH } from '../../constants/config';

describe('PinEntry', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  describe('rendering', () => {
    it('should render welcome message', () => {
      render(<PinEntry onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Enter your special date to begin')).toBeInTheDocument();
    });

    it('should render PIN input with placeholder', () => {
      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('inputMode', 'numeric');
    });

    it('should render progress dots matching PIN length', () => {
      const { container } = render(<PinEntry onSubmit={mockOnSubmit} />);

      const dots = container.querySelectorAll('.pin-entry__dot');
      expect(dots).toHaveLength(PIN_LENGTH);
    });

    it('should focus input on mount', async () => {
      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });
    });
  });

  describe('input handling', () => {
    it('should only accept numeric input', async () => {
      const user = userEvent.setup();
      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, 'abc123def456');

      // Should only have the digits: 123456
      expect(input).toHaveValue('12/34/56');
    });

    it('should format input as MM/DD/YYYY', async () => {
      const user = userEvent.setup();
      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');

      await user.type(input, '01');
      expect(input).toHaveValue('01');

      await user.type(input, '15');
      expect(input).toHaveValue('01/15');

      // Only type 4 more digits to avoid auto-submit (7 total)
      await user.type(input, '202');
      expect(input).toHaveValue('01/15/202');
    });

    it('should limit input to 8 digits', async () => {
      const user = userEvent.setup();
      // Set up mock since typing 8+ digits triggers auto-submit
      mockOnSubmit.mockResolvedValue({ success: true });

      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, '0115202599999');

      // Should only have 8 digits
      expect(input).toHaveValue('01/15/2025');
    });

    it('should update progress dots as user types', async () => {
      const user = userEvent.setup();
      const { container } = render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');

      // Initially no dots should be filled
      expect(container.querySelectorAll('.pin-entry__dot--filled')).toHaveLength(0);

      await user.type(input, '0115');

      // First 4 dots should be filled
      const filledDots = container.querySelectorAll('.pin-entry__dot--filled');
      expect(filledDots).toHaveLength(4);
    });
  });

  describe('auto-submit', () => {
    it('should auto-submit when 8 digits are entered', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue({ success: true });

      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, '01152025');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('01152025');
      });
    });

    it('should not auto-submit when loading', async () => {
      const user = userEvent.setup();
      render(<PinEntry onSubmit={mockOnSubmit} isLoading={true} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, '01152025');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should disable input when loading', () => {
      render(<PinEntry onSubmit={mockOnSubmit} isLoading={true} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      expect(input).toBeDisabled();
    });

    it('should show loading indicator when loading', () => {
      render(<PinEntry onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should show error message on failed submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue({ success: false, error: 'Invalid PIN' });

      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, '01152025');

      await waitFor(() => {
        expect(screen.getByText('Invalid PIN')).toBeInTheDocument();
      });
    });

    it('should show default error message when no error provided', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue({ success: false });

      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, '01152025');

      await waitFor(() => {
        expect(screen.getByText("Hmm, that's not it. Try again?")).toBeInTheDocument();
      });
    });

    it('should clear PIN after failed submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue({ success: false, error: 'Wrong PIN' });

      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, '01152025');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should clear error when user types again', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce({ success: false, error: 'Wrong PIN' });

      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('MM/DD/YYYY');
      await user.type(input, '01152025');

      await waitFor(() => {
        expect(screen.getByText('Wrong PIN')).toBeInTheDocument();
      });

      await user.type(input, '0');

      expect(screen.queryByText('Wrong PIN')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on input', () => {
      render(<PinEntry onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Enter PIN in date format');
      expect(input).toBeInTheDocument();
    });
  });
});
