// Common interface for /video and /videogif pipelines

import type { VideoResult } from '../types';

export interface VideoGenerator {
  readonly provider?: string;
  textToVideo(prompt: string): Promise<VideoResult>;
  imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult>;
}
