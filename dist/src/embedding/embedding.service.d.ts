export declare class EmbeddingService {
    private processorPromise;
    private visionModelPromise;
    private tokenizerPromise;
    private textModelPromise;
    constructor();
    generateEmbeddingFromText(text: string): Promise<number[]>;
    generateEmbeddingFromImageUrl(image_url: string): Promise<number[]>;
    generateEmbeddingFromImageBlob(imageBlob: Blob): Promise<number[]>;
}
