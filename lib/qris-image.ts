import jsQR from "jsqr";
import { createJimp } from "@jimp/core";
import png from "@jimp/js-png";
import jpeg from "@jimp/js-jpeg";
import gif from "@jimp/js-gif";
import bmp from "@jimp/js-bmp";
import tiff from "@jimp/js-tiff";

const Jimp = createJimp({
    formats: [png, jpeg, gif, bmp, tiff],
});

export async function decodeQrisFromImageBuffer(
    imageBuffer: Buffer
): Promise<string | null> {
    const image = await Jimp.read(imageBuffer);
    const { data, width, height } = image.bitmap;

    const pixelBuffer = new Uint8ClampedArray(
        data.buffer,
        data.byteOffset,
        data.byteLength
    );

    const decoded = jsQR(pixelBuffer, width, height, {
        inversionAttempts: "attemptBoth",
    });

    return decoded?.data?.trim() || null;
}
