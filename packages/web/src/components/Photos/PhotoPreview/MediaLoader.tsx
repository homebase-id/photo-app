import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@youfoundation/js-lib/core';
import { VideoWithLoader } from './VideoWithLoader';
import { PhotoConfig, t, useDotYouClientContext } from 'photo-app-common';
import { OdinPayloadImage, OdinPreviewImage, OdinThumbnailImage } from '@youfoundation/ui-lib';
import { useState } from 'react';

const targetDrive = PhotoConfig.PhotoDrive;

const MediaWithLoader = ({
  media,
  fileId,
  lastModified,
  original,
}: {
  media?: HomebaseFile;
  fileId?: string;
  lastModified: number | undefined;
  original?: boolean;
}) => {
  if (!media || !fileId) return <div className="relative h-full w-[100vw]"></div>;

  return media?.fileMetadata.payloads
    .find((payload) => payload.key === DEFAULT_PAYLOAD_KEY)
    ?.contentType.startsWith('video/') ? (
    <VideoWithLoader
      fileId={fileId}
      targetDrive={targetDrive}
      lastModified={lastModified}
      fit="contain"
      className={`m-auto h-auto max-h-[100vh] w-auto max-w-full object-contain flex`}
      skipChunkedPlayback={original}
    />
  ) : (
    <CustomOdinImage
      fileId={fileId}
      lastModified={lastModified}
      original={original}
      media={media}
      key={fileId}
    />
  );
};

const CustomOdinImage = ({
  media,
  fileId,
  lastModified,

  original,
}: {
  media: HomebaseFile;
  fileId: string;
  lastModified: number | undefined;

  original?: boolean;
}) => {
  console.log('fileId', fileId, 'original', original);
  const dotYouClient = useDotYouClientContext();
  const [tinyLoaded, setTinyLoaded] = useState(false);
  const [finalLoaded, setFinalLoaded] = useState(false);

  if (
    original &&
    media.fileMetadata.payloads.find((payload) => payload.key === DEFAULT_PAYLOAD_KEY)
      ?.contentType === 'image/heic'
  ) {
    return (
      <div className="relative h-full w-full flex flex-row items-center justify-center">
        <p className="text-white">{t('Unsupported file format: "image/heic"')}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <OdinPreviewImage
        className={`absolute inset-0 object-contain object-center max-w-none h-full w-full transition-opacity delay-500 ${finalLoaded ? 'opacity-0' : 'opacity-100'}`}
        dotYouClient={dotYouClient}
        fileId={fileId}
        targetDrive={targetDrive}
        lastModified={lastModified}
        previewThumbnail={media.fileMetadata.appData.previewThumbnail}
        fileKey={DEFAULT_PAYLOAD_KEY}
        blur="auto"
        onLoad={() => setTinyLoaded(true)}
        key={'preview'}
      />
      {tinyLoaded ? (
        original ? (
          <OdinPayloadImage
            className={`absolute inset-0 object-contain object-center max-w-none h-full w-full transition-opacity duration-300 ${finalLoaded ? 'opacity-100' : 'opacity-0'}`}
            dotYouClient={dotYouClient}
            fileId={fileId}
            targetDrive={targetDrive}
            fileKey={DEFAULT_PAYLOAD_KEY}
            onLoad={() => setFinalLoaded(true)}
            key={'original'}
          />
        ) : (
          <OdinThumbnailImage
            className={`absolute inset-0 object-contain object-center max-w-none h-full w-full transition-opacity duration-300 ${finalLoaded ? 'opacity-100' : 'opacity-0'}`}
            dotYouClient={dotYouClient}
            fileId={fileId}
            targetDrive={targetDrive}
            lastModified={lastModified}
            fileKey={DEFAULT_PAYLOAD_KEY}
            loadSize={{ pixelHeight: 1200, pixelWidth: 1200 }}
            onLoad={() => setFinalLoaded(true)}
            key={'thumbnail'}
          />
        )
      ) : null}
    </div>
  );
};

export default MediaWithLoader;
