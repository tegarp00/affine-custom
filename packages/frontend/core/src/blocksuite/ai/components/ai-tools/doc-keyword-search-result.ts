import type { PeekViewService } from '@affine/core/modules/peek-view';
import { WithDisposable } from '@blocksuite/global/lit';
import { PageIcon, SearchIcon } from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import type { Signal } from '@preact/signals-core';
import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import type { ToolResult } from './tool-result-card';

interface DocKeywordSearchToolCall {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: { query: string };
}

interface DocKeywordSearchToolResult {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  args: { query: string };
  result: Array<{
    title: string;
    docId: string;
  }>;
}

export class DocKeywordSearchResult extends WithDisposable(ShadowlessElement) {
  @property({ attribute: false })
  accessor data!: DocKeywordSearchToolCall | DocKeywordSearchToolResult;

  @property({ attribute: false })
  accessor width: Signal<number | undefined> | undefined;

  @property({ attribute: false })
  accessor onOpenDoc!: (docId: string, sessionId?: string) => void;

  @property({ attribute: false })
  accessor peekViewService!: PeekViewService;

  renderToolCall() {
    return html`<tool-call-card
      .name=${`Searching workspace documents for "${this.data.args.query}"`}
      .icon=${SearchIcon()}
      .width=${this.width}
    ></tool-call-card>`;
  }

  renderToolResult() {
    if (this.data.type !== 'tool-result') {
      return nothing;
    }

    // Handle case where result is not an array (e.g., error object or null)
    const resultArray = Array.isArray(this.data.result) ? this.data.result : [];

    const results: ToolResult[] = resultArray.map(item => ({
      title: item.title,
      icon: PageIcon(),
      onClick: () => {
        this.peekViewService.peekView
          .open({
            type: 'doc',
            docRef: { docId: item.docId },
          })
          .catch(console.error);
      },
    }));

    return html`<tool-result-card
      .name=${`Found ${resultArray.length} pages for "${this.data.args.query}"`}
      .icon=${SearchIcon()}
      .width=${this.width}
      .results=${results}
    ></tool-result-card>`;
  }

  protected override render() {
    if (this.data.type === 'tool-call') {
      return this.renderToolCall();
    }
    return this.renderToolResult();
  }
}
