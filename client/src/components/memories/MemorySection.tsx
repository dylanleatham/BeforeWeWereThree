import { Heading } from '../common';

interface MemorySectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Reusable section wrapper for memories view
 * Provides consistent heading + spacing for each activity type
 */
export function MemorySection({ title, children }: MemorySectionProps) {
  return (
    <section className="memory-section">
      <Heading level={2} className="memory-section__title">
        {title}
      </Heading>
      <div className="memory-section__content">
        {children}
      </div>
    </section>
  );
}
