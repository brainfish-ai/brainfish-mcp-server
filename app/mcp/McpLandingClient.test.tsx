/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { TOOLS } from '../api/mcp/lib/tools';
import { MCP_TOOL_GROUPS } from './tool-groups';
import { McpLandingClient } from './McpLandingClient';

const toolCount = Object.keys(TOOLS).length;

describe('McpLandingClient', () => {
  beforeEach(() => {
    delete (window as unknown as { __BF_SESSION?: boolean }).__BF_SESSION;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders MCP endpoint, config snippet, and GitHub link', () => {
    render(
      <McpLandingClient
        hasSession={false}
        appUrl="https://custom.app.example"
        toolCount={toolCount}
      />,
    );

    expect(screen.getByText('https://mcp.brainfi.sh')).toBeInTheDocument();
    expect(screen.getByText(/"mcpServers"/)).toBeInTheDocument();
    expect(screen.getByText(/"brainfish"/)).toBeInTheDocument();
    const gh = screen.getByRole('link', { name: /View on GitHub/i });
    expect(gh).toHaveAttribute(
      'href',
      'https://github.com/brainfish-ai/brainfish-mcp-server',
    );
  });

  it('renders each tool category and security copy', () => {
    render(
      <McpLandingClient
        hasSession={false}
        appUrl="https://app.brainfi.sh"
        toolCount={toolCount}
      />,
    );

    for (const g of MCP_TOOL_GROUPS) {
      expect(screen.getByText(g.name)).toBeInTheDocument();
    }

    expect(
      screen.getByText(/Your credentials stay private/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `${toolCount} available tools across ${MCP_TOOL_GROUPS.length}`,
        ),
      ),
    ).toBeInTheDocument();
  });

  it('sets window.__BF_SESSION from hasSession after mount', async () => {
    const { unmount, rerender } = render(
      <McpLandingClient
        hasSession={false}
        appUrl="https://app.brainfi.sh"
        toolCount={toolCount}
      />,
    );

    await waitFor(() => {
      expect(
        (window as unknown as { __BF_SESSION?: boolean }).__BF_SESSION,
      ).toBe(false);
    });

    rerender(
      <McpLandingClient
        hasSession={true}
        appUrl="https://app.brainfi.sh"
        toolCount={toolCount}
      />,
    );

    await waitFor(() => {
      expect(
        (window as unknown as { __BF_SESSION?: boolean }).__BF_SESSION,
      ).toBe(true);
    });

    unmount();
  });

  it('renders SetupMcpModal trigger (Get API Token) in the hero', () => {
    render(
      <McpLandingClient
        hasSession={true}
        appUrl="https://my-brainfish.example"
        toolCount={toolCount}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Get API Token/i }),
    ).toBeInTheDocument();
  });

  it('shows Claude setup step copy including tool count', () => {
    render(
      <McpLandingClient
        hasSession={false}
        appUrl="https://app.brainfi.sh"
        toolCount={toolCount}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Claude\.ai Web/i }));

    expect(
      screen.getByText(new RegExp(`discover all ${toolCount} Brainfish tools`)),
    ).toBeInTheDocument();
    const claudePanel = document.getElementById('setup-claude');
    expect(claudePanel).toBeTruthy();
    expect(
      within(claudePanel as HTMLElement).getByText('bf_api_YOUR_TOKEN'),
    ).toBeInTheDocument();
  });
});
