import { useState } from 'react';
import { Heading, ContentTabs } from '../common';
import { TriviaContentTab } from './TriviaContentTab';
import { WyrContentTab } from './WyrContentTab';
import { LetterContentTab } from './LetterContentTab';
import { GenderRevealContentTab } from './GenderRevealContentTab';
import { STRINGS } from '../../constants/strings';
import './ContentManager.css';

const tabs = [
  { id: 'trivia', label: STRINGS.CONTENT_TAB_TRIVIA },
  { id: 'wyr', label: STRINGS.CONTENT_TAB_WYR },
  { id: 'letters', label: STRINGS.CONTENT_TAB_LETTERS },
  { id: 'gender-reveal', label: STRINGS.CONTENT_TAB_GENDER_REVEAL },
];

/**
 * Tabbed content management interface for admin.
 * Provides CRUD for trivia questions, WYR prompts, letter prompts,
 * and gender reveal configuration (ADMIN-04, ADMIN-06).
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
        ariaLabel="Content management"
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

      {activeTab === 'gender-reveal' && (
        <div
          role="tabpanel"
          id="panel-gender-reveal"
          aria-labelledby="tab-gender-reveal"
        >
          <GenderRevealContentTab />
        </div>
      )}
    </div>
  );
}
