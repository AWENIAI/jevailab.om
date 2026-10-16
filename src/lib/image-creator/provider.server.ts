export type ImageGenerationProviderRequest = {
  prompt: string;
  mode: '1K_SD' | '2K_HD';
  ratio: string;
  count: number;
  referenceImageUrl?: string;
};

export type ImageGenerationProviderTask = {
  providerTaskId: string;
};

export type ImageGenerationProviderStatus = {
  state: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  resultUrls: string[];
  errorCode?: string;
};

/** A server-only seam for Kie or a later image provider. */
export interface ImageGenerationProvider {
  create(
    request: ImageGenerationProviderRequest
  ): Promise<ImageGenerationProviderTask[]>;
  status(providerTaskIds: string[]): Promise<ImageGenerationProviderStatus[]>;
}
