# PixiJS Animated WebP

Plugin to support playback of animated WebP images in PixiJS. Unlike normal WebP playback in the browser, this plugin allows you to stop, loop, change speed, or go to a specific frame using the modern ImageDecoder API.

## Usage

Load an animated WebP image with Assets:

```ts
import '@olduvai-jp/pixi-animated-webp';
import { Assets } from 'pixi.js';

const app = new Application();
const image = await Assets.load('image.webp');
app.stage.addChild(image);
```

To use a WebP without Assets:

```ts
import { Application } from 'pixi.js';
import { AnimatedWebP } from '@olduvai-jp/pixi-animated-webp';

const app = new Application();
fetch('image.webp')
    .then(res => res.arrayBuffer())
    .then(AnimatedWebP.fromBuffer)
    .then(image => app.stage.addChild(image));
```

### Browser Compatibility

This plugin requires the [ImageDecoder API](https://developer.mozilla.org/en-US/docs/Web/API/ImageDecoder), which is supported in:
- Chrome 94+
- Edge 94+
- Firefox 133+
- Opera 80+
- Samsung Internet 17.0+

**Note:** Safari and iOS Safari do not currently support the ImageDecoder API.

### Version Compatibility

| PixiJS | PixiJS WebP |
|--------|-------------|
| v8.x   | v1.x        |

## Acknowledgments

This library is based on [@pixi/gif](https://github.com/pixijs-userland/gif) by [Matt Karl](https://github.com/bigtimebuddy). The WebP implementation adapts the original GIF playback architecture to use the modern ImageDecoder API for efficient WebP animation support.
