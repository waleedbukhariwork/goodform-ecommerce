import { GoogleGenAI } from "@google/genai";
import type { InferenceConfig } from "./inference.config.js";

export type ProbeImage = {
  bytes: Buffer;
  mimeType: "image/jpeg" | "image/png";
};

export class GoogleTryOnAdapter {
  private readonly client: GoogleGenAI;
  constructor(private readonly config: InferenceConfig) {
    this.client = new GoogleGenAI({
      enterprise: true,
      project: config.project,
      location: config.region,
      apiVersion: "v1",
      googleAuthOptions: { keyFilename: config.credentialsFile },
      httpOptions: { timeout: 45_000, retryOptions: { attempts: 1 } },
    });
  }

  async generate(
    person: ProbeImage,
    product: ProbeImage,
    signal: AbortSignal,
  ): Promise<ProbeImage> {
    const response = await this.client.models.recontextImage({
      model: this.config.modelId,
      source: {
        personImage: {
          imageBytes: person.bytes.toString("base64"),
          mimeType: person.mimeType,
        },
        productImages: [
          {
            productImage: {
              imageBytes: product.bytes.toString("base64"),
              mimeType: product.mimeType,
            },
          },
        ],
      },
      config: {
        numberOfImages: 1,
        abortSignal: signal,
        httpOptions: { timeout: 45_000, retryOptions: { attempts: 1 } },
      },
    });
    const images = response.generatedImages;
    if (!images || images.length !== 1)
      throw new Error("Invalid provider image response");
    const image = images[0].image;
    if (
      !image ||
      !image.imageBytes ||
      !["image/jpeg", "image/png"].includes(image.mimeType ?? "") ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image.imageBytes)
    )
      throw new Error("Invalid provider image response");
    const bytes = Buffer.from(image.imageBytes, "base64");
    if (!bytes.length || bytes.length > 10 * 1024 * 1024)
      throw new Error("Invalid provider image response");
    return { bytes, mimeType: image.mimeType as ProbeImage["mimeType"] };
  }
}
