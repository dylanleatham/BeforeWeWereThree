import { useState } from 'react';
import { Heading } from '../common';
import { ContentTabs } from './ContentTabs';
import { TriviaContentTab } from './TriviaContentTab';
import { WyrContentTab } from './WyrContentTab';
import { LetterContentTab } from './LetterContentTab';
import { STRINGS } from '../../constants/strings';
import './ContentManager.css';

const tabs = [
  { id: 'trivia', label: STRINGS.CONTENT_TAB_TRIVIA },
  { id: 'wyr', label: STRINGS.CONTENT_TAB_WYR },
  { id: 'letters', label: STRINGS.CONTENT_TAB_LETTERS },
];

/**
 * Tabbed content management interface for admin.
 * Provides CRUD for trivia questions, WYR prompts, and letter prompts.
 * All three tabs fully implemented (ADMIN-06).
 */
export function ContentManager() {
  const [activeTab, setActiveTab] = useState('trivia');

  return (
    <div className="content-manager">
      <Heading level={2}>{STRINGS.CONTENT_MANAGER_HEADING}</Heading>

      <ContentTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'trivia' && (
        <div
          role="tabpanel"
          id="panel-trivia"
          aria-labelledby="tab-trivia"
        >
          <TriviaContentTab />
        </div>
      )}

      {activeTab === 'wyr' && (
        <div
          role="tabpanel"
          id="panel-wyr"
          aria-labelledby="tab-wyr"
        >
          <WyrContentTab />
        </div>
      )}

      {activeTab === 'letters' && (
        <div
          role="tabpanel"
          id="panel-letters"
          aria-labelledby="tab-letters"
        >
          <LetterContentTab />
        </div>
      )}
    </div>
  );
}
