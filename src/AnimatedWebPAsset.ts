import { DOMAdapter, extensions, ExtensionType, path } from 'pixi.js';
import { AnimatedWebP, AnimatedWebPOptions } from './AnimatedWebP';

import type { AssetExtension } from 'pixi.js';

/**
 * Handle the loading of WebP images. Registering this loader plugin will
 * load all `.webp` images as an ArrayBuffer and transform into an
 * AnimatedWebP object.
 * @ignore
 */
const AnimatedWebPAsset = {
    extension: ExtensionType.Asset,
    detection: {
        test: async () => true,
        add: async (formats) => [...formats, 'webp'],
        remove: async (formats) => formats.filter((format) => format !== 'webp'),
    },
    loader: {
        name: 'animatedWebpLoader',
        extension: {
            type: ExtensionType.LoadParser,
            priority: 10,
        },
        test: (url) =>
        {
            const isWebP = path.extname(url) === '.webp';

            return isWebP;
        },
        load: async (url, asset) =>
        {
            try
            {
                const response = await DOMAdapter.get().fetch(url);
                const buffer = await response.arrayBuffer();
                const result = await AnimatedWebP.fromBuffer(buffer, asset?.data);

                return result;
            }
            catch (error)
            {
                console.error('Error in AnimatedWebPAsset loader:', error);
                throw error;
            }
        },
        unload: async (asset) =>
        {
            asset.destroy();
        },
    }
} as AssetExtension<AnimatedWebP, AnimatedWebPOptions>;

extensions.add(AnimatedWebPAsset);
export { AnimatedWebPAsset };
