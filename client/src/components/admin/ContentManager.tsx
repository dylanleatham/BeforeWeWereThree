import { useState } from 'react';
import { Heading, Text } from '../common';
import { ContentTabs } from './ContentTabs';
import { TriviaContentTab } from './TriviaContentTab';
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
 * Trivia tab is implemented now; WYR and Letters added in 06-04.
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
          <Text color="muted">Coming soon</Text>
        </div>
      )}

      {activeTab === 'letters' && (
        <div
          role="tabpanel"
          id="panel-letters"
          aria-labelledby="tab-letters"
        >
          <Text color="muted">Coming soon</Text>
        </div>
      )}
    </div>
  );
}
