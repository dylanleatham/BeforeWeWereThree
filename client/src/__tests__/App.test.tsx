/**
 * App component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock useSession hook
vi.mock('../hooks/useSession', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../hooks/useSession';

describe('App', () => {
  const mockUseSession = vi.mocked(useSession);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unauthenticated state', () => {
    it('should show PinEntry when not authenticated', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        role: null,
        participantId: null,
        designation: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('MM/DD/YYYY')).toBeInTheDocument();
    });

    it('should pass loading state to PinEntry', () => {
      mockUseSession.mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        role: null,
        participantId: null,
        designation: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      // PinEntry should show loading indicator
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  describe('guest experience', () => {
    it('should show guest welcome for authenticated guest', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        role: 'guest',
        participantId: 'guest-id',
        designation: 'A',
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Welcome, Participant!')).toBeInTheDocument();
      expect(screen.getByText('Your babymoon adventure awaits')).toBeInTheDocument();
    });

    it('should show Phase 2 placeholder content for guest', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        role: 'guest',
        participantId: 'guest-id',
        designation: 'B',
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Coming in Phase 2:')).toBeInTheDocument();
      expect(screen.getByText('Envelope selection')).toBeInTheDocument();
      expect(screen.getByText('Activities and games')).toBeInTheDocument();
      expect(screen.getByText('Letters and memories')).toBeInTheDocument();
    });

    it('should show readonly notice for readonly designation', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        role: 'guest',
        participantId: 'guest-id',
        designation: 'readonly',
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(
        screen.getByText("You're in viewing mode. The main experience is designed for two.")
      ).toBeInTheDocument();
    });

    it('should not show readonly notice for participant A or B', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        role: 'guest',
        participantId: 'guest-id',
        designation: 'A',
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(
        screen.queryByText("You're in viewing mode. The main experience is designed for two.")
      ).not.toBeInTheDocument();
    });
  });

  describe('admin experience', () => {
    it('should show admin dashboard for authenticated admin', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        role: 'admin',
        participantId: 'admin-id',
        designation: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Configuration and envelope management')).toBeInTheDocument();
    });

    it('should show admin mode indicator', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        role: 'admin',
        participantId: 'admin-id',
        designation: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Admin Mode')).toBeInTheDocument();
    });

    it('should show Phase 2 placeholder content for admin', () => {
      mockUseSession.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        role: 'admin',
        participantId: 'admin-id',
        designation: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Envelope management')).toBeInTheDocument();
      expect(screen.getByText('Activity configuration')).toBeInTheDocument();
      expect(screen.getByText('Participant settings')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading and authenticated', async () => {
      mockUseSession.mockReturnValue({
        isLoading: true,
        isAuthenticated: true,
        role: 'guest',
        participantId: 'guest-id',
        designation: 'A',
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });

      const { container } = render(<App />);

      // Loading spinner should be present
      const spinner = container.querySelector('[style*="border-radius: 50%"]');
      expect(spinner).toBeInTheDocument();
    });
  });
});
