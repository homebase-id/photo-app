package id.homebase.photos.mediasync;

import android.graphics.Bitmap;
import android.graphics.Bitmap.CompressFormat;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

import id.homebase.lib.core.file.types.payloadorthumbnailbase.ThumbnailStream;

public class ImageResizer {

    public static List<ThumbnailStream> resizeImage(String inputFilePath, List<ResizeInstruction> instructions, String payloadKey) {
        List<ThumbnailStream> outputThumbs = new ArrayList<>();
        // Decode the original image from the file
        Bitmap originalBitmap = BitmapFactory.decodeFile(inputFilePath);

        int originalWidth = originalBitmap.getWidth();
        int originalHeight = originalBitmap.getHeight();

        for (ResizeInstruction instruction : instructions) {

            // Create a resized version of the bitmap
            int[] scaledSize = calculateScaledSize(originalWidth, originalHeight, instruction.width, instruction.height);
            Bitmap resizedBitmap = resize(originalBitmap, scaledSize[0], scaledSize[1]);

            // Write the resized bitmap to a ByteArrayOutputStream
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            writeBitmapToStream(resizedBitmap, instruction.quality, instruction.format, outputStream);

            outputThumbs.add(new ThumbnailStream(payloadKey, outputStream, scaledSize[1], scaledSize[0], "image/" + instruction.format));
        }

        // Recycle the original bitmap to free memory
        originalBitmap.recycle();

        return outputThumbs;
    }

    public static ThumbnailStream resizeImage(String inputFilePath, ResizeInstruction instruction, String payloadKey, boolean keepDimensions) {
        // Decode the original image from the file
        Bitmap originalBitmap = BitmapFactory.decodeFile(inputFilePath);

        int originalWidth = originalBitmap.getWidth();
        int originalHeight = originalBitmap.getHeight();

        int[] scaledSize = calculateScaledSize(originalWidth, originalHeight, instruction.width, instruction.height);
        // Create a resized version of the bitmap
        Bitmap resizedBitmap = resize(originalBitmap, scaledSize[0], scaledSize[1]);

        // Write the resized bitmap to a ByteArrayOutputStream
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        writeBitmapToStream(resizedBitmap, instruction.quality, instruction.format, outputStream);

        // Recycle the original bitmap to free memory
        originalBitmap.recycle();

        return new ThumbnailStream(payloadKey, outputStream, keepDimensions ? originalHeight : scaledSize[1], keepDimensions ? originalWidth : scaledSize[0], "image/" + instruction.format);
    }

    private static int[] calculateScaledSize(int originalWidth, int originalHeight, int targetWidth, int targetHeight) {
        float widthScale = (float) targetWidth / originalWidth;
        float heightScale = (float) targetHeight / originalHeight;
        float scale = Math.min(widthScale, heightScale);

        // Calculate the new dimensions
        int scaledWidth = Math.round(originalWidth * scale);
        int scaledHeight = Math.round(originalHeight * scale);

        return new int[]{scaledWidth, scaledHeight};
    }

    private static Bitmap resize(Bitmap originalBitmap, int width, int height) {
        Bitmap resizedBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(resizedBitmap);
        Paint paint = new Paint();
        paint.setAntiAlias(true);
        paint.setFilterBitmap(true);
        paint.setDither(true);
        canvas.drawBitmap(originalBitmap, null, new android.graphics.Rect(0, 0, width, height), paint);
        return resizedBitmap;
    }

    private static void writeBitmapToStream(Bitmap bitmap, int quality, String format, ByteArrayOutputStream outputStream) {
        CompressFormat compressFormat = CompressFormat.PNG;
        if (format.equalsIgnoreCase("jpg") || format.equalsIgnoreCase("jpeg")) {
            compressFormat = CompressFormat.JPEG;
        } else if (format.equalsIgnoreCase("webp")) {
            compressFormat = CompressFormat.WEBP;
        }

        try {
            bitmap.compress(compressFormat, quality, outputStream); // 90 is the quality, range 0-100
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Recycle the resized bitmap to free memory
        bitmap.recycle();
    }

    public static class ResizeInstruction {
        public int width;
        public int height;
        public int quality;
        public String format;

        public ResizeInstruction(int width, int height, int quality, String format) {
            this.width = width;
            this.height = height;
            this.quality = quality;
            this.format = format;
        }
    }

//    public static void main(String[] args) {
//        // Example usage
//        List<ResizeInstruction> instructions = List.of(
//                new ResizeInstruction(200, 200, "jpg"),
//                new ResizeInstruction(400, 300, "png"),
//                new ResizeInstruction(100, 100, "webp")
//        );
//
//        List<ByteArrayOutputStream> outputStreams = resizeImage("path/to/your/image.jpg", instructions);
//
//        // Example of how to use the output streams
//        for (ByteArrayOutputStream outputStream : outputStreams) {
//            byte[] imageBytes = outputStream.toByteArray();
//            // Do something with the byte array (e.g., send it in a network request)
//        }
//    }
}

