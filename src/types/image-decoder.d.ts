interface ImageDecoderInit
{
    data: BufferSource;
    type: string;
    premultiplyAlpha?: 'none' | 'premultiply' | 'default';
    colorSpaceConversion?: 'none' | 'default';
    desiredWidth?: number;
    desiredHeight?: number;
    preferAnimation?: boolean;
}

interface ImageDecodeResult
{
    image: VideoFrame;
    complete: boolean;
}

interface ImageTrack
{
    readonly frameCount: number;
    readonly repetitionCount: number;
    selected: boolean;
}

interface ImageTrackList extends Array<ImageTrack>
{
    readonly ready: Promise<void>;
    readonly selectedIndex: number;
    readonly selectedTrack: ImageTrack | null;
}

declare class ImageDecoder
{
    constructor(init: ImageDecoderInit);
    readonly tracks: ImageTrackList;
    readonly type: string;
    readonly complete: boolean;
    decode(options?: { frameIndex: number }): Promise<ImageDecodeResult>;
    close(): void;
}

interface VideoFrame
{
    readonly displayWidth: number;
    readonly displayHeight: number;
    close(): void;
}

interface Window
{
    ImageDecoder: typeof ImageDecoder;
}
