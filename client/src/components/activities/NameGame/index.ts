/**
 * Name Game Activity Components
 *
 * Exports all components for the Baby Name Game:
 * - NameGameActivity: Main orchestrator component
 * - NameCard: Individual name display with drag visual feedback
 * - VotingPhase: Swipeable card interface (Love/Maybe/Nope)
 * - WaitingPhase: Waiting for partner to finish voting
 * - WaitingForGuidancePhase: Waiting for partner to submit preferences
 * - ResultsPhase: Match results with categories
 * - NewRoundPhase: Guidance input for next round
 * - GeneratingPhase: Loading state during AI name generation
 */

export { NameGameActivity } from './NameGameActivity';
export { NameCard } from './NameCard';
export { VotingPhase } from './VotingPhase';
export { WaitingPhase } from './WaitingPhase';
export { WaitingForGuidancePhase } from './WaitingForGuidancePhase';
export { ResultsPhase } from './ResultsPhase';
export { NewRoundPhase } from './NewRoundPhase';
export { GeneratingPhase } from './GeneratingPhase';
