import { Heading, Text, Card } from '../common';
import { useMemories } from '../../hooks/useMemories';
import { MemorySection } from './MemorySection';
import { ExportButton } from './ExportButton';
import { STRINGS } from '../../constants/strings';
import './MemoriesView.css';

const BLOB_PREFIX = 'https://bwwtstorage.blob.core.windows.net/photos/';

/**
 * When an image fails to load (HEIC disguised as JPEG, or 206 partial content),
 * retry through the server-side image proxy which converts to browser-compatible JPEG.
 * Only retries once — if the proxy also fails, the image is truly unavailable.
 */
function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.dataset.retried && img.src.includes(BLOB_PREFIX)) {
    img.dataset.retried = '1';
    const filename = img.src.split(BLOB_PREFIX)[1] ?? '';
    img.src = `/api/images/${encodeURIComponent(filename)}`;
  }
}

interface MemoriesViewProps {
  onBack: () => void;
}

/**
 * Scrapbook-style view of all babymoon memories
 * Shown after admin marks the experience as complete
 */
export function MemoriesView({ onBack }: MemoriesViewProps) {
  const { data, isLoading, error } = useMemories();

  if (isLoading) {
    return (
      <div className="memories-view">
        <div className="memories-view__loading">
          <Text color="muted">{STRINGS.MEMORIES_LOADING}</Text>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="memories-view">
        <div className="memories-view__error">
          <Text color="muted">{STRINGS.MEMORIES_ERROR}</Text>
          <button onClick={onBack} className="memories-view__back-link">
            {STRINGS.MEMORIES_BACK}
          </button>
        </div>
      </div>
    );
  }

  const closedDate = new Date(data.closedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="memories-view">
      <header className="memories-view__header">
        <button onClick={onBack} className="memories-view__back-link">
          {STRINGS.MEMORIES_BACK}
        </button>
        <Heading level={1} className="memories-view__title">
          {STRINGS.MEMORIES_HEADING}
        </Heading>
        <Text color="muted" className="memories-view__date">{closedDate}</Text>
        <ExportButton />
      </header>

      <div className="memories-view__sections">
        {/* Letters */}
        {data.letters.length > 0 && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_LETTERS}>
            {data.letters.map((letter, i) => (
              <Card key={i} className="memory-card">
                <div className="memory-card__header">
                  <Text className="memory-card__label">{letter.envelopeTitle}</Text>
                  <Text variant="small" color="muted">{letter.participantDesignation}</Text>
                </div>
                <Text variant="small" color="muted" className="memory-card__prompt">
                  {letter.prompt}
                </Text>
                <Text className="memory-card__content">{letter.content}</Text>
                {letter.photoUrl && (
                  <img src={letter.photoUrl} alt="Letter photo" className="memory-card__photo" onError={handleImageError} />
                )}
              </Card>
            ))}
          </MemorySection>
        )}

        {/* Would You Rather */}
        {data.wyrResults.length > 0 && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_WYR}>
            {data.wyrResults.map((wyr, i) => {
              const sameChoice = wyr.voteA && wyr.voteB &&
                wyr.voteA === wyr.voteB;
              return (
                <Card key={i} className="memory-card">
                  <Text className="memory-card__label">{wyr.envelopeTitle}</Text>
                  <div className="memory-wyr">
                    <div className={`memory-wyr__option${wyr.voteA ? ' memory-wyr__option--chosen' : ''}`}>
                      <Text>{wyr.optionA}</Text>
                      {wyr.voteA && <Text variant="small" color="muted">{wyr.voteA}</Text>}
                    </div>
                    <div className={`memory-wyr__option${wyr.voteB ? ' memory-wyr__option--chosen' : ''}`}>
                      <Text>{wyr.optionB}</Text>
                      {wyr.voteB && <Text variant="small" color="muted">{wyr.voteB}</Text>}
                    </div>
                  </div>
                  <Text variant="small" className={sameChoice ? 'memory-wyr__match' : 'memory-wyr__different'}>
                    {sameChoice ? STRINGS.MEMORIES_WYR_MATCH : STRINGS.MEMORIES_WYR_DIFFERENT}
                  </Text>
                </Card>
              );
            })}
          </MemorySection>
        )}

        {/* Photo Prompts */}
        {data.photoPrompts.length > 0 && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_PHOTO_PROMPTS}>
            {data.photoPrompts.map((pp, i) => (
              <Card key={i} className="memory-card">
                <Text className="memory-card__label">{pp.envelopeTitle}</Text>
                <Text variant="small" color="muted">{pp.prompt}</Text>
                <div className="memory-photos__grid">
                  {pp.responses.map((r, j) => (
                    <div key={j} className="memory-photos__item">
                      {r.photoUrl && (
                        <img src={r.photoUrl} alt={`${r.participantDesignation}'s photo`} className="memory-card__photo" onError={handleImageError} />
                      )}
                      <Text variant="small" color="muted">{r.participantDesignation}</Text>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </MemorySection>
        )}

        {/* Photos Gallery */}
        {data.photos.length > 0 && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_PHOTOS}>
            <div className="memory-photos__grid">
              {data.photos.map((photo, i) => (
                <div key={i} className="memory-photos__item">
                  <img src={photo.url} alt={photo.caption ?? `Photo ${i + 1}`} className="memory-card__photo" onError={handleImageError} />
                </div>
              ))}
            </div>
          </MemorySection>
        )}

        {/* Names We Loved */}
        {data.nameMatches.length > 0 && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_NAMES}>
            <Card className="memory-card">
              <ul className="memory-names">
                {data.nameMatches.map((name, i) => (
                  <li key={i} className="memory-names__item">
                    <Text>{name.name}</Text>
                  </li>
                ))}
              </ul>
            </Card>
          </MemorySection>
        )}

        {/* Trivia Scores */}
        {data.triviaResults.length > 0 && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_TRIVIA}>
            <Card className="memory-card">
              {data.triviaResults.map((result, i) => (
                <Text key={i}>
                  {STRINGS.MEMORIES_TRIVIA_SCORE(result.participantDesignation, result.correctCount, result.totalCount)}
                </Text>
              ))}
            </Card>
          </MemorySection>
        )}

        {/* Gender Reveal */}
        {data.genderReveal?.genderValue && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_GENDER_REVEAL}>
            <Card className="memory-card memory-card--gender">
              <Heading level={3} className="memory-gender__value">
                {data.genderReveal.genderValue === 'boy'
                  ? STRINGS.MEMORIES_GENDER_BOY
                  : STRINGS.MEMORIES_GENDER_GIRL}
              </Heading>
            </Card>
          </MemorySection>
        )}

        {/* Friend Letters */}
        {data.friendLetters.length > 0 && (
          <MemorySection title={STRINGS.MEMORIES_SECTION_FRIEND_LETTERS}>
            {data.friendLetters.map((fl, i) => (
              <Card key={i} className="memory-card">
                <div className="memory-card__header">
                  <Text className="memory-card__label">From {fl.friendName}</Text>
                  <Text variant="small" color="muted">to {fl.recipient}</Text>
                </div>
                <Text className="memory-card__content">{fl.content}</Text>
                {fl.mediaUrl && (
                  <img src={fl.mediaUrl} alt={`Photo from ${fl.friendName}`} className="memory-card__photo" onError={handleImageError} />
                )}
              </Card>
            ))}
          </MemorySection>
        )}
      </div>
    </div>
  );
}
