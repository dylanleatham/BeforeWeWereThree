/**
 * App component tests
 * Updated for Phase 2 envelope pile and admin manager integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock useSession hook
vi.mock('../hooks/useSession', () => ({
  useSession: vi.fn(),
}));

// Mock useEnvelopes hook
vi.mock('../hooks/useEnvelopes', () => ({
  useEnvelopes: vi.fn(),
}));

import { useSession } from '../hooks/useSession';
import { useEnvelopes } from '../hooks/useEnvelopes';

describe('App', () => {
  const mockUseSession = vi.mocked(useSession);
  const mockUseEnvelopes = vi.mocked(useEnvelopes);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useEnvelopes
    mockUseEnvelopes.mockReturnValue({
      envelopes: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updateStatus: vi.fn(),
    });
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
    it('should show app title for authenticated guest', () => {
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

      expect(screen.getByText('Before We Were Three')).toBeInTheDocument();
    });

    it('should show empty state when no envelopes exist', () => {
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

      expect(screen.getByText('No envelopes yet')).toBeInTheDocument();
      expect(screen.getByText('Ask your admin to add some activities!')).toBeInTheDocument();
    });

    it('should show envelope pile when envelopes exist', () => {
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

      mockUseEnvelopes.mockReturnValue({
        envelopes: [
          {
            id: '1',
            title: 'Test Envelope',
            type: 'would-you-rather',
            status: 'sealed',
            order: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        updateStatus: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Test Envelope')).toBeInTheDocument();
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

      expect(screen.getByText('Viewing mode')).toBeInTheDocument();
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

      expect(screen.queryByText('Viewing mode')).not.toBeInTheDocument();
    });

    it('should show error state when envelope fetch fails', () => {
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

      mockUseEnvelopes.mockReturnValue({
        envelopes: [],
        isLoading: false,
        error: new Error('Network error'),
        refetch: vi.fn(),
        updateStatus: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  describe('admin experience', () => {
    it('should show envelope management for authenticated admin', () => {
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

      expect(screen.getByText('Envelope Management')).toBeInTheDocument();
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

    it('should show Add Envelope button for admin', () => {
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

      expect(screen.getByText('Add Envelope')).toBeInTheDocument();
    });

    it('should show empty state message for admin with no envelopes', () => {
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

      expect(screen.getByText('No envelopes yet. Create your first one!')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when session loading and authenticated', () => {
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

      // Loading spinner should be present (uses CSS class instead of inline style)
      const spinner = container.querySelector('.app-loading__spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should show loading text when envelopes are loading for guest', () => {
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

      mockUseEnvelopes.mockReturnValue({
        envelopes: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        updateStatus: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText('Loading your envelopes...')).toBeInTheDocument();
    });
  });
});
