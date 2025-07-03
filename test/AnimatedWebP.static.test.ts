import fs from 'fs';
import path from 'path';
import { AnimatedWebP } from '../src';

function toArrayBuffer(buffer: Buffer): ArrayBuffer
{
    const ab = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(ab);

    for (let i = 0; i < buffer.length; ++i)
    {
        view[i] = buffer[i];
    }

    return ab;
}

describe('AnimatedWebP - Static WebP', () =>
{
    const staticArrayBuffer = toArrayBuffer(
        fs.readFileSync(path.join(__dirname, './resources/example_static.webp'))
    );

    describe('fromBuffer()', () =>
    {
        it('should return an instance of AnimatedWebP', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer);

            expect(animation).toBeInstanceOf(AnimatedWebP);
            animation.destroy();
        });

        it('should throw an error if missing', async () =>
        {
            await expect((AnimatedWebP as any).fromBuffer()).rejects.toThrow();
            await expect((AnimatedWebP as any).fromBuffer(new ArrayBuffer(0))).rejects.toThrow();
        });

        it('should handle options', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer, {
                autoPlay: false,
                loop: false,
                autoUpdate: false,
            });

            expect(animation.loop).toBe(false);
            expect(animation.autoPlay).toBe(false);
            expect(animation.autoUpdate).toBe(false);
            animation.destroy();
        });
    });

    describe('currentFrame', () =>
    {
        it('should throw frames out-of-bounds', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer);

            expect(() => animation.currentFrame = -1).toThrow();
            expect(() => animation.currentFrame = animation.totalFrames).toThrow();
            animation.destroy();
        });

        it('should change dirty current frame', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer, { autoPlay: false });

            animation.dirty = false;
            animation.currentFrame = 0;
            expect(animation.dirty).toBe(false);
            animation.currentFrame = 0;
            expect(animation.dirty).toBe(false);
            animation.destroy();
        });
    });

    describe('play()', () =>
    {
        it('should do nothing when playing twice', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer);

            expect(animation.playing).toBe(true);
            animation.play();
            animation.play();
            expect(animation.playing).toBe(true);
            animation.destroy();
        });

        it('should change play state', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer, { autoPlay: false });

            expect(animation.playing).toBe(false);
            animation.play();
            expect(animation.playing).toBe(true);
            animation.destroy();
        });
    });

    describe('stop()', () =>
    {
        it('should stop playing', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer);

            expect(animation.playing).toBe(true);
            animation.stop();
            expect(animation.playing).toBe(false);
            animation.destroy();
        });

        it('should stop playing on destroy', async () =>
        {
            const animation = await AnimatedWebP.fromBuffer(staticArrayBuffer);

            expect(animation.playing).toBe(true);
            animation.destroy();
            expect(animation.playing).toBe(false);
        });
    });
});
