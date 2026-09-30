import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { PartnerPresenceMessage } from 'shared';
import { PartnerPresence } from '../../components/activities/shared/PartnerPresence';
import { useSignalREvent } from '../../hooks/useSignalREvent';

vi.mock('../../hooks/useSignalREvent', () => ({
  useSignalREvent: vi.fn(),
}));

const queryPresence = vi.fn();
vi.mock('../../context/SignalRContext', () => ({
  useSignalRConnection: () => ({ connection: { queryPresence } }),
}));

/** Capture the presence handler so tests can deliver messages to it */
let deliver: (message: PartnerPresenceMessage) => void;

beforeEach(() => {
  queryPresence.mockClear();
  vi.mocked(useSignalREvent).mockImplementation((_event, handler) => {
    deliver = handler as typeof deliver;
  });
});

const message = (isOnline: boolean, snapshot?: boolean): PartnerPresenceMessage => ({
  type: 'partner_presence',
  participantId: isOnline ? 'partner-1' : null,
  isOnline,
  snapshot,
});

describe('PartnerPresence', () => {
  it('shows nothing until the server reports presence', () => {
    const { container } = render(<PartnerPresence envelopeId="env-1" partnerName="Sam" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for the current presence when it mounts', () => {
    render(<PartnerPresence envelopeId="env-1" partnerName="Sam" />);
    expect(queryPresence).toHaveBeenCalledWith('activity:env-1');
  });

  it('shows the joining snapshot as text without announcing it', () => {
    render(<PartnerPresence envelopeId="env-1" partnerName="Sam" />);
    act(() => deliver(message(true, true)));
    expect(screen.getByRole('status')).toHaveTextContent('Sam is here');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an away snapshot as text', () => {
    render(<PartnerPresence envelopeId="env-1" partnerName="Sam" />);
    act(() => deliver(message(false, true)));
    expect(screen.getByRole('status')).toHaveTextContent('Sam is away');
  });

  it('announces a partner arriving or leaving', () => {
    render(<PartnerPresence envelopeId="env-1" partnerName="Sam" />);
    act(() => deliver(message(true)));
    expect(screen.getByRole('alert')).toHaveTextContent('Sam joined');
    act(() => deliver(message(false)));
    expect(screen.getByRole('status')).toHaveTextContent('Sam is away');
    expect(screen.getByRole('alert')).toHaveTextContent('Sam left');
  });

  it('defaults the name to "Partner"', () => {
    render(<PartnerPresence envelopeId="env-1" />);
    act(() => deliver(message(true, true)));
    expect(screen.getByRole('status')).toHaveTextContent('Partner is here');
  });
});
