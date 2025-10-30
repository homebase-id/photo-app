import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@homebase-id/js-lib/core';
import { OdinVideoWrapper } from './VideoWithLoader';
import { t, useDotYouClientContext } from 'photo-app-common';
import { OdinPayloadImage, OdinPreviewImage, OdinThumbnailImage } from '@homebase-id/ui-lib';
import { useState } from 'react';
import useTargetDrive from '../../../hooks/drive/useTargetDrive';
import TemplateImage from '../PhotoDay/TemplateImageComponent';

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
  const { targetDrive } = useTargetDrive();
  if (!media || !fileId) return <div className="relative h-full w-[100vw]"></div>;

  const payload =
    media.fileMetadata.payloads?.find((payload) => payload.key === DEFAULT_PAYLOAD_KEY) ||
    media.fileMetadata.payloads?.[0] ||
    undefined;

  if (!payload) {
    return <TemplateImage className="relative h-full w/full" title={t('No media available')} />;
  }

  return payload?.contentType.startsWith('video/') ? (
    <OdinVideoWrapper
      fileId={fileId}
      fileKey={payload?.key || DEFAULT_PAYLOAD_KEY}
      targetDrive={targetDrive}
      lastModified={lastModified}
      className={`relative h-full w-full`}
      skipChunkedPlayback={original}
    />
  ) : (
    <CustomOdinImage
      fileId={fileId}
      fileKey={payload?.key || DEFAULT_PAYLOAD_KEY}
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
  fileKey,
  lastModified,

  original,
}: {
  media: HomebaseFile;
  fileId: string;
  fileKey: string;
  lastModified: number | undefined;

  original?: boolean;
}) => {
  const dotYouClient = useDotYouClientContext();
  const [tinyLoaded, setTinyLoaded] = useState(false);
  const [finalLoaded, setFinalLoaded] = useState(false);
  const { targetDrive } = useTargetDrive();
  if (
    original &&
    media.fileMetadata.payloads?.find((payload) => payload.key === fileKey)?.contentType ===
      'image/heic'
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
        fileKey={fileKey}
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
            fileKey={fileKey}
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
            fileKey={fileKey}
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
