import React, { useRef, useState } from 'react';
import { SafeAreaView, View, Button, StyleSheet, ScrollView, Text, Platform } from 'react-native';
import { ImageLibraryOptions, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { Video } from 'react-native-compressor';
import MP4Box from 'mp4box';
import { SegmentedVideoMetadata } from '@youfoundation/js-lib/media';
import { getNewId, mergeByteArrays, uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
import {
  FFmpegKit,
  FFmpegKitConfig,
  FFprobeSession,
  LogRedirectionStrategy,
  SessionState,
} from 'ffmpeg-kit-react-native';

//

const App = () => {
  const [logText, setLogText] = useState('');
  const [inputVideoUri, setInputVideoUri] = useState('');
  const [compressedVideoUri, setCompressedVideoUri] = useState('');
  const [fragmentedVideoUri, setFragmentedVideoUri] = useState('');
  const [latestVideoUri, setLatestVideoUri] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  //
  // Log stuff
  //

  const log = (message: string | object): void => {
    const now = new Date();
    const timestamp =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0') +
      ':' +
      now.getSeconds().toString().padStart(2, '0') +
      ':' +
      now.getMilliseconds().toString().padStart(3, '0');

    if (typeof message === 'object' && message !== null) {
      message = JSON.stringify(message, null, 2);
    }

    const logMessage = `${timestamp}\n${message}`;
    console.log(logMessage);
    setLogText((prevText) => {
      const newText = prevText + logMessage + '\n\n';
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
      return newText;
    });
  };

  //
  // Reset
  //

  const handleReset = async (): Promise<void> => {
    setLogText('');
    setInputVideoUri('');
    setCompressedVideoUri('');
    setFragmentedVideoUri('');
    setLatestVideoUri('');
  };

  //
  // Loading
  //

  const handleLoad = async (): Promise<void> => {
    setIsBusy(true);

    const options: ImageLibraryOptions = {
      mediaType: 'video',
    };
    const result = await launchImageLibrary(options);
    if (result.didCancel || (result.assets?.length ?? 0) < 1) {
      setInputVideoUri('');
    } else {
      const videoUri = result.assets?.[0].uri || '';
      log(`Loaded video ${videoUri}`);
      log(result);
      setInputVideoUri(videoUri);
      setLatestVideoUri(videoUri);
    }

    setIsBusy(false);
  };

  //
  // Compressing
  //

  const handleCompress = async (): Promise<void> => {
    setIsBusy(true);

    const source = latestVideoUri;

    if ((await RNFS.exists(source)) === false) {
      log(`Not found ${source}`);
      return;
    }

    log(`Compressing ${source}`);

    const start = new Date().getTime();

    const result = await Video.compress(
      source,
      {
        compressionMethod: 'manual',
        maxSize: 1280,
        bitrate: 3000000,
      },
      (progress) => {
        console.log(`Compression Progress: ${progress}`);
      }
    );
    log(`Compressed in ${(new Date().getTime() - start) / 1000}s`);
    log(`Compressed video: ${result}`);
    setCompressedVideoUri(result);
    setLatestVideoUri(result);

    setIsBusy(false);
  };

  type ExtendedBuffer = ArrayBuffer & { fileStart?: number };
  interface Mp4Info {
    isFragmented: boolean;
    tracks: {
      id: number;
      nb_samples: number;
      type: string;
      codec: string;
      movie_duration: number;
      movie_timescale: number;
      duration: number;
      timescale: number;
    }[];
    mime: string;
    initial_duration?: number;
    duration: number;
    timescale: number;
    brands: string[];
  }

  //
  // MP4Box Info
  //
  const handleGetMp4boxInfo = async (): Promise<void> => {
    setIsBusy(true);

    const source = latestVideoUri;

    if ((await RNFS.exists(source)) === false) {
      log(`Not found ${source}`);
      return;
    }

    log(`Getting info on ${source}`);

    const start = new Date().getTime();

    const stat = await RNFS.stat(source);
    log(`Source file size: ${stat.size}`);

    const mp4File = MP4Box.createFile(true);

    mp4File.onError = function (e: Error) {
      log(e);
    };

    mp4File.onReady = function (info: Mp4Info) {
      log(info);
    };

    const readChunkSize = 8192;
    let offset = 0;
    let totalBytesRead = 0;

    while (offset < stat.size) {
      const bytesToRead = Math.min(readChunkSize, stat.size - offset);

      const base64String = await RNFS.read(source, bytesToRead, offset, 'base64');
      const rawString = atob(base64String);
      const arrayBuffer = new ArrayBuffer(rawString.length) as ExtendedBuffer;
      const byteArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < rawString.length; i++) {
        byteArray[i] = rawString.charCodeAt(i);
      }
      totalBytesRead += rawString.length;

      arrayBuffer.fileStart = offset;
      offset = mp4File.appendBuffer(arrayBuffer);
    }
    mp4File.flush();
    log(`Bytes read: ${totalBytesRead}`);
    log(`Done in ${(new Date().getTime() - start) / 1000}s`);

    setIsBusy(false);
  };

  //
  // FFMPEG Info
  //
  // https://github.com/arthenica/ffmpeg-kit-test/blob/main/react-native/test-app-npm/src/command-tab.js#L71
  //
  const handleGetFfmpegInfo = async (): Promise<void> => {
    setIsBusy(true);

    const source = latestVideoUri;

    if ((await RNFS.exists(source)) === false) {
      log(`Not found ${source}`);
      return;
    }

    log(`Probing ${source}`);

    // probe
    const command = `-v error -show_format -show_streams ${source}`;

    log(command);
    const start = new Date().getTime();

    FFprobeSession.create(
      FFmpegKitConfig.parseArguments(command),
      async (session) => {
        const state = await session.getState();
        const returnCode = await session.getReturnCode();
        const failStackTrace = await session.getFailStackTrace();

        const output = await session.getOutput();

        log(`FFmpeg process exited with state ${state} and rc ${returnCode}`);
        log(output);

        if (state === SessionState.FAILED || !returnCode.isValueSuccess()) {
          log('Command failed. Please check output for the details.');
        } else {
          log(`Probed in ${(new Date().getTime() - start) / 1000}s`);
        }
      },
      undefined,
      LogRedirectionStrategy.NEVER_PRINT_LOGS
    ).then((session) => {
      FFmpegKitConfig.asyncFFprobeExecute(session);
      // listFFprobeSessions();
    });

    setIsBusy(false);
  };

  //
  // MP4Box Fragmenting
  //

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mp4boxBuildInitSegments = (mp4File: any, mp4Info: any) => {
    let i;
    let trak;

    // Sanity check
    if (!mp4Info) throw new Error('mp4Info not set');

    const moov = new MP4Box.BoxParser.moovBox();
    moov.mvhd = mp4File.moov.mvhd;
    moov.mvhd.duration = mp4File.initial_duration;
    moov.boxes.push(moov.mvhd);

    for (i = 0; i < mp4File.fragmentedTracks.length; i++) {
      trak = mp4File.getTrackById(mp4File.fragmentedTracks[i].id);

      // TODO: Check if there is a better way than to hope that the indexes still align
      trak.tkhd.duration = mp4Info.tracks[i].duration;
      trak.mdia.mdhd.duration = mp4Info.tracks[i].duration;

      trak.tkhd.timescale = mp4Info.tracks[i].timescale;
      trak.mdia.mdhd.timescale = mp4Info.tracks[i].timescale;

      moov.boxes.push(trak);
      moov.traks.push(trak);
    }

    const initBuffer = MP4Box.ISOFile.writeInitializationSegment(
      mp4File.ftyp,
      moov,
      mp4File.moov.mvex && mp4File.moov.mvex.mehd
        ? mp4File.moov.mvex.mehd.fragment_duration
        : mp4File.initial_duration,
      mp4File.moov.traks[0].samples.length > 0 ? mp4File.moov.traks[0].samples[0].duration : 0
    );
    return new Uint8Array(initBuffer);
  };

  //

  const mp4boxHandleFragment = async (): Promise<void> => {
    setIsBusy(true);

    let mp4Info: Mp4Info | undefined;
    const source = latestVideoUri;

    if ((await RNFS.exists(source)) === false) {
      log(`Not found ${source}`);
      return;
    }

    log(`Fragmenting ${source}`);

    const MB = 1024 * 1024;
    const MB_PER_CHUNK = 5 * MB;

    const dirPath = Platform.OS === 'ios' ? RNFS.CachesDirectoryPath : RNFS.CachesDirectoryPath;

    const destinationUri = `file://${dirPath}/mp4box-fragmented-${getNewId()}.mp4`;

    const start = new Date().getTime();

    const stat = await RNFS.stat(source);
    log(`Source file size: ${stat.size}`);

    const mp4File = MP4Box.createFile(true);
    const segmentedBytes: Uint8Array[] = [];
    const tracksToRead: boolean[] = [];
    const metadata: SegmentedVideoMetadata = {
      isSegmented: true,
      mimeType: '',
      codec: '',
      fileSize: 0,
      duration: 0,
    };

    mp4File.onError = function (e: Error) {
      log(e);
    };

    mp4File.onReady = function (info: Mp4Info) {
      mp4Info = info;
      console.log(JSON.stringify(info, null, 2));

      metadata.codec = info.mime;
      const avTracks = info.tracks?.filter((trck) => ['video', 'audio'].includes(trck.type));
      if (avTracks?.length > 1) {
        metadata.codec = `video/mp4; codecs="${avTracks
          .map((trck) => trck.codec)
          .join(',')}"; profiles="${info.brands.join(',')}'}"`;
      }
      metadata.duration = (info.initial_duration || info.duration) / info.timescale;

      info.tracks.forEach((trck) => {
        tracksToRead[trck.id] = false;
      });

      for (let i = 0; i < info.tracks.length; i++) {
        const track = info.tracks[i];
        const nbSamples = track.nb_samples;
        const durationInSec =
          (track.movie_duration || info.duration || info.initial_duration || 0) /
          (track.movie_timescale || info.timescale || 1);
        const secondsFor8MbOfData = (metadata.duration / stat.size) * MB_PER_CHUNK;
        console.debug({ track: i, secondsFor8MbOfData });

        const nbrSamples = Math.round((nbSamples / durationInSec) * secondsFor8MbOfData);
        mp4File.setSegmentOptions(track.id, null, {
          nbSamples: nbrSamples,
        });
      }

      mp4File.initializeSegmentation();
      mp4File.start();
    };

    mp4File.onSegment = async function (
      id: number,
      user: unknown,
      buffer: ArrayBuffer,
      sampleNum: number,
      is_last: boolean
    ) {
      const segment = new Uint8Array(buffer);
      segmentedBytes.push(segment);

      if (is_last) {
        tracksToRead[id] = true;

        if (!tracksToRead.some((trck) => !trck)) {
          const finalMetaBytes = new Uint8Array(mp4boxBuildInitSegments(mp4File, mp4Info));
          const finalSegmentedBytes = mergeByteArrays(segmentedBytes);
          const finalBytes = mergeByteArrays([finalMetaBytes, finalSegmentedBytes]);
          metadata.fileSize = finalBytes.length;

          const base64String = uint8ArrayToBase64(finalBytes);
          await RNFS.appendFile(destinationUri, base64String, 'base64');

          log(`Fragmented in ${(new Date().getTime() - start) / 1000}s`);
          log(`Fragmented video: ${destinationUri}`);
        }
      }
    };

    const readChunkSize = 8192;
    let offset = 0;
    let totalBytesRead = 0;

    while (offset < stat.size) {
      const bytesToRead = Math.min(readChunkSize, stat.size - offset);

      const base64String = await RNFS.read(source, bytesToRead, offset, 'base64');
      const rawString = atob(base64String);
      const arrayBuffer = new ArrayBuffer(rawString.length) as ExtendedBuffer;
      const byteArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < rawString.length; i++) {
        byteArray[i] = rawString.charCodeAt(i);
      }
      totalBytesRead += rawString.length;

      arrayBuffer.fileStart = offset;
      offset = mp4File.appendBuffer(arrayBuffer);
    }
    mp4File.flush();
    log(`Bytes read: ${totalBytesRead}`);

    setFragmentedVideoUri(destinationUri);
    setLatestVideoUri(destinationUri);

    setIsBusy(false);
  };

  //
  // FFMPEG Fragmenting
  //
  // https://github.com/arthenica/ffmpeg-kit-test/blob/main/react-native/test-app-npm/src/command-tab.js#L44
  //
  const ffmpegHandleFragment = async (): Promise<void> => {
    setIsBusy(true);

    const source = latestVideoUri;

    if ((await RNFS.exists(source)) === false) {
      log(`Not found ${source}`);
      return;
    }

    const dirPath = Platform.OS === 'ios' ? RNFS.CachesDirectoryPath : RNFS.CachesDirectoryPath;

    const destinationPrefix = Platform.OS === 'ios' ? '' : 'file://';
    const destinationUri = `${destinationPrefix}${dirPath}/ffmpeg-fragmented-${getNewId()}.mp4`;

    log(`Fragmenting ${source}`);

    // MDN docs (https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API/Transcoding_assets_for_MSE#fragmenting)
    // FFMPEG fragmenting: https://ffmpeg.org/ffmpeg-formats.html#Fragmentation
    const command = `-i ${source} -c:v copy -c:a copy -movflags frag_keyframe+empty_moov+default_base_moof ${destinationUri}`;

    // empty_moov (older version of the above)
    // const command = `-i ${source} -c copy -movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov ${destinationUri}`;

    // faststart (this doesn't work in firefox)
    // const command = `-i ${source} -c copy -movflags +frag_keyframe+separate_moof+omit_tfhd_offset+faststart ${destinationUri}`;

    log(command);

    const start = new Date().getTime();

    try {
      const session = await FFmpegKit.execute(command);
      const state = await session.getState();
      const returnCode = await session.getReturnCode();
      const failStackTrace = await session.getFailStackTrace();
      const output = await session.getOutput();

      log(`FFmpeg process exited with state ${state} and rc ${returnCode}`);
      log(output);

      if (state === SessionState.FAILED || !returnCode.isValueSuccess()) {
        log('Command failed. Please check output for the details.');
      } else {
        log(`Fragmented in ${(new Date().getTime() - start) / 1000}s`);
        setFragmentedVideoUri(destinationUri);
        setLatestVideoUri(destinationUri);
      }
    } catch (error) {
      log(`FFmpeg process failed with error: ${error}`);
    }

    setIsBusy(false);
  };

  //
  // Uploading
  //
  const handleUpload = async (): Promise<void> => {
    setIsBusy(true);

    const source = latestVideoUri;

    if ((await RNFS.exists(source)) === false) {
      log(`Not found ${source}`);
      return;
    }

    log(`Uploading ${source}`);

    const destinationName = `${new Date().getTime()}.mp4`;
    const formData = new FormData();
    formData.append('file', {
      uri: source,
      type: 'video/mp4',
      name: destinationName,
    });

    try {
      const response = await fetch('https://sharex.sebbarg.net:7030/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        log(`Uploaded as: ${destinationName}`);
        // RNFS.unlink(source);
      } else {
        log(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        log(`Error: ${error.message}`);
        console.log('Error:', error);
      } else {
        log('Upload failed (unknown error)');
      }
    }

    setIsBusy(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.buttonRow}>
          <Button title="Reset" disabled={isBusy} onPress={() => handleReset()} />
          <Button title="Load" disabled={isBusy} onPress={async () => await handleLoad()} />
          {latestVideoUri && (
            <Button
              title="Info (mp4box)"
              disabled={isBusy}
              onPress={async () => await handleGetMp4boxInfo()}
            />
          )}
          {latestVideoUri && (
            <Button
              title="Info (ffmpeg)"
              disabled={isBusy}
              onPress={async () => await handleGetFfmpegInfo()}
            />
          )}
          {latestVideoUri && (
            <Button
              title="Compress"
              disabled={isBusy}
              onPress={async () => await handleCompress()}
            />
          )}
          {latestVideoUri && (
            <Button
              title="Fragment (mp4box)"
              disabled={isBusy}
              onPress={async () => await mp4boxHandleFragment()}
            />
          )}
          {latestVideoUri && (
            <Button
              title="Fragment (ffmpeg)"
              disabled={isBusy}
              onPress={async () => await ffmpegHandleFragment()}
            />
          )}
          {latestVideoUri && (
            <Button title="Upload" disabled={isBusy} onPress={async () => await handleUpload()} />
          )}
        </View>
        <ScrollView style={styles.scrollView} ref={scrollViewRef}>
          <Text style={styles.text}>{logText}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

//
// Misc
//

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    // Add padding or margin if needed
  },
  scrollView: {
    flex: 1,
    marginHorizontal: 10, // Adds horizontal margin
    backgroundColor: '#f5f5f5', // Light background color for recessed look
    borderRadius: 10, // Optional: rounded corners
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android elevation
    elevation: 5,
  },
  text: {
    color: '#000',
  },
});

export default App;
