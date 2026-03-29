import type { PeekViewService } from '@affine/core/modules/peek-view';
import { WithDisposable } from '@blocksuite/global/lit';
import { PageIcon, ViewIcon } from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import type { Signal } from '@preact/signals-core';
import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';

interface DocReadToolCall {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: { doc_id: string };
}

interface DocReadToolResult {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  args: { doc_id: string };
  result: {
    /** Old result may not have docId */
    docId?: string;
    title: string;
    markdown: string;
  };
}

export class DocReadResult extends WithDisposable(ShadowlessElement) {
  @property({ attribute: false })
  accessor data!: DocReadToolCall | DocReadToolResult;

  @property({ attribute: false })
  accessor width: Signal<number | undefined> | undefined;

  @property({ attribute: false })
  accessor peekViewService!: PeekViewService;

  renderToolCall() {
    // TODO: get document name by doc_id
    return html`<tool-call-card
      .name=${`Reading document`}
      .icon=${ViewIcon()}
      .width=${this.width}
    ></tool-call-card>`;
  }

  renderToolResult() {
    if (this.data.type !== 'tool-result') {
      return nothing;
    }

    // Handle case where result is not the expected object format
    const result = this.data.result;
    if (
      !result ||
      typeof result !== 'object' ||
      !('title' in result) ||
      !('markdown' in result)
    ) {
      return nothing;
    }

    // TODO: better markdown rendering
    return html`<tool-result-card
      .name=${`Read "${result.title}"`}
      .icon=${ViewIcon()}
      .width=${this.width}
      .results=${[
        {
          title: result.title,
          icon: PageIcon(),
          content: result.markdown,
          onClick: () => {
            const docId = result.docId;
            if (!docId) {
              return;
            }
            this.peekViewService.peekView
              .open({
                type: 'doc',
                docRef: { docId },
              })
              .catch(console.error);
          },
        },
      ]}
    ></tool-result-card>`;
  }

  protected override render() {
    if (this.data.type === 'tool-call') {
      return this.renderToolCall();
    }
    if (this.data.type === 'tool-result') {
      return this.renderToolResult();
    }
    return nothing;
  }
}
