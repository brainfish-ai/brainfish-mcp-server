import type { ReactNode } from 'react';

export type ToolGroupDef = {
  name: string;
  icon: ReactNode;
  tools: string[];
};

const icon = (paths: ReactNode) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths}
  </svg>
);

export const MCP_TOOL_GROUPS: ToolGroupDef[] = [
  {
    name: 'Search & Documents',
    icon: icon(
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </>,
    ),
    tools: [
      'brainfish_search_documents',
      'brainfish_get_document',
      'brainfish_list_documents',
      'brainfish_create_document',
      'brainfish_update_document',
      'brainfish_move_document',
      'brainfish_delete_document',
    ],
  },
  {
    name: 'Suggestions',
    icon: icon(
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>,
    ),
    tools: ['brainfish_generate_article_suggestion'],
  },
  {
    name: 'Collections',
    icon: icon(
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />,
    ),
    tools: [
      'brainfish_list_collections',
      'brainfish_get_collection',
      'brainfish_create_collection',
      'brainfish_update_collection',
      'brainfish_delete_collection',
    ],
  },
  {
    name: 'AI & Answers',
    icon: icon(
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
    ),
    tools: ['brainfish_generate_user_answer', 'brainfish_generate_follow_ups'],
  },
  {
    name: 'Catalogs',
    icon: icon(
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </>,
    ),
    tools: [
      'brainfish_list_catalogs',
      'brainfish_get_catalog',
      'brainfish_create_catalog',
      'brainfish_sync_catalog_content',
    ],
  },
  {
    name: 'Sessions & Analytics',
    icon: icon(
      <>
        <path d="M21 12V7H5a2 2 0 010-4h14v4" />
        <path d="M3 5v14a2 2 0 002 2h16v-5" />
        <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
      </>,
    ),
    tools: [
      'brainfish_search_sessions',
      'brainfish_get_session',
      'brainfish_get_session_timeline',
      'brainfish_generate_session_insights',
    ],
  },
  {
    name: 'Analytics',
    icon: icon(
      <>
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </>,
    ),
    tools: ['brainfish_get_analytics_threads'],
  },
  {
    name: 'Auth',
    icon: icon(
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </>,
    ),
    tools: ['brainfish_validate_token'],
  },
];

export function toolLabel(toolName: string) {
  return toolName.replace('brainfish_', '').replace(/_/g, ' ');
}
