package id.homebase.photos.mediasync;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Bitmap.CompressFormat;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

import id.homebase.lib.core.file.types.ThumbnailFile;

public class ImageResizer {

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

    public static List<ThumbnailFile> resizeImage(String inputFilePath, List<ResizeInstruction> instructions, String payloadKey) {
        List<ThumbnailFile> outputThumbs = new ArrayList<>();
        // Decode the original image from the file
        Bitmap originalBitmap = BitmapFactory.decodeFile(inputFilePath);

        for (ResizeInstruction instruction : instructions) {
            // Create a resized version of the bitmap
            Bitmap resizedBitmap = resize(originalBitmap, instruction.width, instruction.height);

            int resizedWidth = resizedBitmap.getWidth();
            int resizedHeight = resizedBitmap.getHeight();

            // Write the resized bitmap to a ByteArrayOutputStream
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            writeBitmapToStream(resizedBitmap, instruction.quality, instruction.format, outputStream);

            outputThumbs.add(new ThumbnailFile(payloadKey, outputStream, resizedHeight, resizedWidth, "image/" + instruction.format));
        }

        // Recycle the original bitmap to free memory
        originalBitmap.recycle();

        return outputThumbs;
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

