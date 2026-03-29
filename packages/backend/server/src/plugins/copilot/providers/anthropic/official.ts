import {
  type AnthropicProvider as AnthropicSDKProvider,
  createAnthropic,
} from '@ai-sdk/anthropic';
import z from 'zod';

import { CopilotProviderType, ModelInputType, ModelOutputType } from '../types';
import { AnthropicProvider } from './anthropic';

export type AnthropicOfficialConfig = {
  apiKey: string;
  baseURL?: string;
};

const ModelListSchema = z.object({
  data: z.array(z.object({ id: z.string() })),
});

export class AnthropicOfficialProvider extends AnthropicProvider<AnthropicOfficialConfig> {
  override readonly type = CopilotProviderType.Anthropic;

  override readonly models = [
    {
      name: 'Claude Opus 4',
      id: 'claude-opus-4-20250514',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    {
      name: 'Claude Sonnet 4',
      id: 'claude-sonnet-4-5-20250929',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    {
      name: 'Claude Sonnet 4',
      id: 'claude-sonnet-4-20250514',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
  ];

  protected instance!: AnthropicSDKProvider;

  override configured(): boolean {
    return !!this.config.apiKey;
  }

  override setup() {
    super.setup();
    this.instance = createAnthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      // Use longer timeout for custom proxies that may be slower
      fetch: async (url, init) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min
        try {
          return await globalThis.fetch(url, {
            ...init,
            signal: init?.signal ?? controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
      },
    });
  }

  override async refreshOnlineModels() {
    try {
      const baseUrl = this.config.baseURL || 'https://api.anthropic.com/v1';
      if (baseUrl && !this.onlineModelList.length) {
        const { data } = await fetch(`${baseUrl}/models`, {
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        })
          .then(r => r.json())
          .then(r => ModelListSchema.parse(r));
        this.onlineModelList = data.map(model => model.id);
      }
    } catch (e) {
      this.logger.error('Failed to fetch available models', e);
    }
  }
}
