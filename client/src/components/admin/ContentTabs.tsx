import { useRef, useCallback, KeyboardEvent } from 'react';
import './ContentTabs.css';

interface Tab {
  id: string;
  label: string;
}

interface ContentTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/**
 * Accessible tab bar following WAI-ARIA Tabs pattern.
 *
 * Keyboard navigation:
 * - ArrowRight/ArrowLeft: move to next/prev tab (wraps around)
 * - Home: first tab
 * - End: last tab
 */
export function ContentTabs({ tabs, activeTab, onTabChange }: ContentTabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setTabRef = useCallback((id: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(id, el);
    } else {
      tabRefs.current.delete(id);
    }
  }, []);

  const focusTab = useCallback((id: string) => {
    const el = tabRefs.current.get(id);
    if (el) {
      el.focus();
    }
    onTabChange(id);
  }, [onTabChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      focusTab(nextTab.id);
    }
  }, [tabs, activeTab, focusTab]);

  return (
    <div
      role="tablist"
      aria-label="Content management"
      className="content-tabs"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={setTabRef(tab.id)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`content-tabs__tab${isActive ? ' content-tabs__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
