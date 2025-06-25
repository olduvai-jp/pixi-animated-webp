import { DOMAdapter, SCALE_MODE, Sprite, Texture, Ticker, UPDATE_PRIORITY } from 'pixi.js';

/** Represents a single frame of a WebP. Includes image and timing data. */
interface FrameObject
{
    /** Image data for the current frame */
    imageData: ImageData;
    /** The start of the current frame, in milliseconds */
    start: number;
    /** The end of the current frame, in milliseconds */
    end: number;
}

/** Default options for all AnimatedWebP objects. */
interface AnimatedWebPOptions
{
    /** Whether to start playing right away */
    autoPlay: boolean;
    /**
     * Scale Mode to use for the texture
     * @type {PIXI.SCALE_MODE}
     */
    scaleMode: SCALE_MODE;
    /** To enable looping */
    loop: boolean;
    /** Speed of the animation */
    animationSpeed: number;
    /** Set to `false` to manage updates yourself */
    autoUpdate: boolean;
    /** The completed callback, optional */
    onComplete: null | (() => void);
    /** The loop callback, optional */
    onLoop: null | (() => void);
    /** The frame callback, optional */
    onFrameChange: null | ((currentFrame: number) => void);
    /** Fallback FPS if WebP contains no time information */
    fps?: number;
}

/** Options for the AnimatedWebP constructor. */
interface AnimatedWebPSize
{
    /** Width of the WebP image */
    width: number;
    /** Height of the WebP image */
    height: number;
}

/**
 * Runtime object to play animated WebPs. This object is similar to an AnimatedSprite.
 * It support playback (seek, play, stop) as well as animation speed and looping.
 * @see Uses ImageDecoder API for WebP decoding
 */
class AnimatedWebP extends Sprite
{
    /**
     * Default options for all AnimatedWebP objects.
     * @property {PIXI.SCALE_MODE} [scaleMode='linear'] - Scale mode to use for the texture.
     * @property {boolean} [loop=true] - To enable looping.
     * @property {number} [animationSpeed=1] - Speed of the animation.
     * @property {boolean} [autoUpdate=true] - Set to `false` to manage updates yourself.
     * @property {boolean} [autoPlay=true] - To start playing right away.
     * @property {Function} [onComplete=null] - The completed callback, optional.
     * @property {Function} [onLoop=null] - The loop callback, optional.
     * @property {Function} [onFrameChange=null] - The frame callback, optional.
     * @property {number} [fps=30] - Fallback FPS if WebP contains no time information.
     */
    public static defaultOptions: AnimatedWebPOptions = {
        scaleMode: 'linear',
        fps: 30,
        loop: true,
        animationSpeed: 1,
        autoPlay: true,
        autoUpdate: true,
        onComplete: null,
        onFrameChange: null,
        onLoop: null,
    };

    /**
     * The speed that the animation will play at. Higher is faster, lower is slower.
     * @default 1
     */
    public animationSpeed = 1;

    /**
     * Whether or not the animate sprite repeats after playing.
     * @default true
     */
    public loop = true;

    /**
     * User-assigned function to call when animation finishes playing. This only happens
     * if loop is set to `false`.
     *
     * @example
     * animation.onComplete = () => {
     *   // finished!
     * };
     */
    public onComplete?: () => void;

    /**
     * User-assigned function to call when animation changes which texture is being rendered.
     *
     * @example
     * animation.onFrameChange = () => {
     *   // updated!
     * };
     */
    public onFrameChange?: (currentFrame: number) => void;

    /**
     * User-assigned function to call when `loop` is true, and animation is played and
     * loops around to start again. This only happens if loop is set to `true`.
     *
     * @example
     * animation.onLoop = () => {
     *   // looped!
     * };
     */
    public onLoop?: () => void;

    /** The total duration of animation in milliseconds. */
    public readonly duration: number = 0;

    /** Whether to play the animation after constructing. */
    public readonly autoPlay: boolean = true;

    /** Collection of frame to render. */
    private _frames: FrameObject[];

    /** Drawing context reference. */
    private _context: CanvasRenderingContext2D;

    /** Dirty means the image needs to be redrawn. Set to `true` to force redraw. */
    public dirty = false;

    /** The current frame number (zero-based index). */
    private _currentFrame = 0;

    /** `true` uses PIXI.Ticker.shared to auto update animation time.*/
    private _autoUpdate = false;

    /** `true` if the instance is currently connected to PIXI.Ticker.shared to auto update animation time. */
    private _isConnectedToTicker = false;

    /** If animation is currently playing. */
    private _playing = false;

    /** Current playback position in milliseconds. */
    private _currentTime = 0;

    /**
     * Create an animated WebP animation from a WebP image's ArrayBuffer. The easiest way to get
     * the buffer is to use Assets.
     * @example
     * import { Assets } from 'pixi.js';
     * import 'pixi-animated-webp';
     *
     * const webp = await Assets.load('file.webp');
     * @param buffer - WebP image arraybuffer from Assets.
     * @param options - Options to use.
     * @returns
     */
    static async fromBuffer(buffer: ArrayBuffer, options?: Partial<AnimatedWebPOptions>): Promise<AnimatedWebP>
    {
        // console.log('AnimatedWebP.fromBuffer called with buffer size:', buffer?.byteLength);
        // console.log('Options:', options);
        // console.log('ImageDecoder available?', typeof ImageDecoder !== 'undefined');

        if (!buffer || buffer.byteLength === 0)
        {
            throw new Error('Invalid buffer');
        }

        if (typeof ImageDecoder === 'undefined')
        {
            console.error('ImageDecoder API is not supported in this environment');
            throw new Error('ImageDecoder API is not supported in this environment');
        }

        const decoder = new ImageDecoder({ data: buffer, type: 'image/webp' });

        await decoder.tracks.ready;

        if (decoder.tracks.length === 0)
        {
            throw new Error('No tracks found in WebP');
        }

        const track = decoder.tracks.selectedTrack;

        if (!track)
        {
            throw new Error('No selected track found in WebP');
        }

        const frameCount = track.frameCount;
        const frames: FrameObject[] = [];
        const canvas = DOMAdapter.get().createCanvas();
        const context = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

        let totalDuration = 0;

        for (let i = 0; i < frameCount; i++)
        {
            const { image, complete } = await decoder.decode({ frameIndex: i });

            if (!image || !complete)
            {
                continue;
            }

            // duration is in microseconds, convert to milliseconds
            const duration = (image as any).duration / 1000;

            canvas.width = image.displayWidth;
            canvas.height = image.displayHeight;
            context.drawImage(image, 0, 0);
            const imageData = context.getImageData(0, 0, image.displayWidth, image.displayHeight);

            frames.push({
                imageData,
                start: totalDuration,
                end: totalDuration + duration,
            });
            totalDuration += duration;
            image.close();
        }

        decoder.close();

        if (frames.length === 0)
        {
            throw new Error('No frames decoded from WebP');
        }

        const { width, height } = frames[0].imageData;

        return new AnimatedWebP(frames, { width, height, ...options });
    }

    /**
     * @param frames - Data of the WebP image.
     * @param options - Options for the AnimatedWebP
     */
    constructor(frames: FrameObject[], options: Partial<AnimatedWebPOptions> & AnimatedWebPSize)
    {
        super(Texture.EMPTY);

        // Handle rerenders
        this.onRender = () => this.updateFrame();

        // Get the options, apply defaults
        const { scaleMode, width, height, ...rest } = Object.assign({},
            AnimatedWebP.defaultOptions,
            options
        );

        // Create the texture
        const canvas = DOMAdapter.get().createCanvas(width, height) as HTMLCanvasElement;
        const context = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

        this.texture = Texture.from(canvas);
        this.texture.source.scaleMode = scaleMode;

        this.duration = (frames[frames.length - 1] as FrameObject).end;
        this._frames = frames;
        this._context = context;
        this._playing = false;
        this._currentTime = 0;
        this._isConnectedToTicker = false;
        Object.assign(this, rest);

        // Draw the first frame
        this.currentFrame = 0;
        if (rest.autoPlay)
        {
            this.play();
        }
    }

    /** Stops the animation. */
    public stop(): void
    {
        if (!this._playing)
        {
            return;
        }

        this._playing = false;
        if (this._autoUpdate && this._isConnectedToTicker)
        {
            Ticker.shared.remove(this.update, this);
            this._isConnectedToTicker = false;
        }
    }

    /** Plays the animation. */
    public play(): void
    {
        if (this._playing)
        {
            return;
        }

        this._playing = true;
        if (this._autoUpdate && !this._isConnectedToTicker)
        {
            Ticker.shared.add(this.update, this, UPDATE_PRIORITY.HIGH);
            this._isConnectedToTicker = true;
        }

        // If were on the last frame and stopped, play should resume from beginning
        if (!this.loop && this.currentFrame === this._frames.length - 1)
        {
            this._currentTime = 0;
        }
    }

    /**
     * Get the current progress of the animation from 0 to 1.
     * @readonly
     */
    public get progress(): number
    {
        return this._currentTime / this.duration;
    }

    /** `true` if the current animation is playing */
    public get playing(): boolean
    {
        return this._playing;
    }

    /**
     * Updates the object transform for rendering. You only need to call this
     * if the `autoUpdate` property is set to `false`.
     *
     * @param deltaTime - Time since last tick.
     */
    update(ticker: Ticker): void
    {
        if (!this._playing)
        {
            return;
        }

        const elapsed = this.animationSpeed * ticker.elapsedMS;

        this._currentTime += elapsed;

        const localTime = this._currentTime % this.duration;

        const frameIndex = this._frames.findIndex((frame) => localTime >= frame.start && localTime < frame.end);

        if (this._currentTime >= this.duration)
        {
            if (this.loop)
            {
                this._currentTime = localTime;
                this.updateFrameIndex(frameIndex);
                this.onLoop?.();
            }
            else
            {
                this._currentTime = this.duration;
                this.updateFrameIndex(this.totalFrames - 1);
                this.onComplete?.();
                this.stop();
            }
        }
        else
        {
            this.updateFrameIndex(frameIndex);
        }
    }

    /**
     * Redraw the current frame, is necessary for the animation to work when
     */
    private updateFrame(): void
    {
        if (!this.dirty)
        {
            return;
        }

        // Update the current frame
        const { imageData } = this._frames[this._currentFrame] as FrameObject;

        this._context.putImageData(imageData, 0, 0);

        // Workaround hack for Safari & iOS
        // which fails to upload canvas after putImageData
        // See: https://bugs.webkit.org/show_bug.cgi?id=229986
        this._context.fillStyle = 'transparent';
        this._context.fillRect(0, 0, 0, 1);
        this.texture.source.update();

        // Mark as clean
        this.dirty = false;
    }

    /**
     * Whether to use PIXI.Ticker.shared to auto update animation time.
     * @default true
     */
    get autoUpdate(): boolean
    {
        return this._autoUpdate;
    }

    set autoUpdate(value: boolean)
    {
        if (value !== this._autoUpdate)
        {
            this._autoUpdate = value;

            if (!this._autoUpdate && this._isConnectedToTicker)
            {
                Ticker.shared.remove(this.update, this);
                this._isConnectedToTicker = false;
            }
            else if (this._autoUpdate && !this._isConnectedToTicker && this._playing)
            {
                Ticker.shared.add(this.update, this);
                this._isConnectedToTicker = true;
            }
        }
    }

    /** Set the current frame number */
    get currentFrame(): number
    {
        return this._currentFrame;
    }
    set currentFrame(value: number)
    {
        this.updateFrameIndex(value);
        this._currentTime = (this._frames[value] as FrameObject).start;
    }

    /** Internally handle updating the frame index */
    private updateFrameIndex(value: number): void
    {
        if (value < 0 || value >= this._frames.length)
        {
            throw new Error(`Frame index out of range, expecting 0 to ${this.totalFrames}, got ${value}`);
        }
        if (this._currentFrame !== value)
        {
            this._currentFrame = value;
            this.dirty = true;
            this.onFrameChange?.(value);
        }
    }

    /**
     * Get the total number of frame in the WebP.
     */
    get totalFrames(): number
    {
        return this._frames.length;
    }

    /** Destroy and don't use after this. */
    destroy(): void
    {
        this.stop();
        super.destroy(true);

        const forceClear = null as any;

        this._context = forceClear;
        this._frames = forceClear;
        this.onComplete = forceClear;
        this.onFrameChange = forceClear;
        this.onLoop = forceClear;
    }

    /**
     * A short hand way of creating an AnimatedWebP from an array of frame textures.
     *
     * @param frames - The array of frames to create the AnimatedWebP from.
     * @param autoUpdate - Whether to use the shared ticker for animation updates.
     * @returns The new AnimatedWebP instance.
     */
    static fromFrames(frames: FrameObject[], autoUpdate = true): AnimatedWebP
    {
        if (!frames || frames.length === 0)
        {
            throw new Error('No frames provided');
        }

        const { width, height } = frames[0].imageData;

        return new AnimatedWebP(frames, {
            width,
            height,
            autoUpdate,
        });
    }

    /**
     * A short hand way of creating an AnimatedWebP from a single frame.
     *
     * @param imageData - The ImageData for the frame.
     * @param duration - Duration of the frame in milliseconds.
     * @returns The new AnimatedWebP instance.
     */
    static fromImageData(imageData: ImageData, duration = 1000): AnimatedWebP
    {
        const frame: FrameObject = {
            imageData,
            start: 0,
            end: duration,
        };

        return new AnimatedWebP([frame], {
            width: imageData.width,
            height: imageData.height,
        });
    }

    /**
     * Clone the current AnimatedWebP.
     * @returns A new AnimatedWebP instance with the same frames and options.
     */
    clone(): AnimatedWebP
    {
        return new AnimatedWebP(this._frames, {
            width: this.texture.width,
            height: this.texture.height,
            scaleMode: this.texture.source.scaleMode,
            animationSpeed: this.animationSpeed,
            loop: this.loop,
            autoPlay: false,
            autoUpdate: this._autoUpdate,
            onComplete: this.onComplete,
            onFrameChange: this.onFrameChange,
            onLoop: this.onLoop,
        });
    }
}

export { AnimatedWebP, AnimatedWebPOptions, AnimatedWebPSize, FrameObject };
