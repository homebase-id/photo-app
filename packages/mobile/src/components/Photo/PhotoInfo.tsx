import { debounce } from 'lodash-es';
import { useCallback, useMemo, useRef, useState } from 'react';

import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@homebase-id/js-lib/core';
import { Platform, TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../app/Colors';
import { Pencil } from '../ui/Icons/icons';
import { useDarkMode } from '../../hooks/useDarkMode';
import { ImageMetadata } from '@homebase-id/js-lib/media';
import { getLargestThumbOfPayload } from '@homebase-id/js-lib/helpers';
import { Input } from '../ui/Form/Input';
import { Modal } from '../ui/Modal/Modal';
import { PhotoConfig, usePhotoMetadata } from 'photo-app-common';
import { ErrorNotification } from '../ui/Alert/ErrorNotification';

const targetDrive = PhotoConfig.PhotoDrive;

const PhotoInfo = ({
  current,
  onClose,
}: {
  current?: HomebaseFile;

  onClose: () => void;
}) => {
  const {
    fetchMeta: { data: photoMetadata },
    updateMeta: { mutate: updatePhotoMeta, error: updatePhotoMetaError },
    updateDate: { mutate: updateDate, error: updateDateError },
  } = usePhotoMetadata(targetDrive, current?.fileId);
  const loadOriginal = false;

  const onChange = useRef(
    (e: { target: { name: 'description'; value: string } | { name: 'date'; value: Date } }) => {
      if (current) {
        if (e.target.name === 'description') {
          updatePhotoMeta({
            photoFileId: current.fileId,
            newImageMetadata: { description: e.target.value },
          });
        } else {
          updateDate({
            photoFileId: current.fileId as string,
            newDate: e.target.value.getTime(),
          });
        }
      }
    }
  );

  const debouncedChangeDesc = useMemo(() => debounce(onChange.current, 1000), [onChange]);
  const debouncedChangeTime = useMemo(() => debounce(onChange.current, 1000), [onChange]);

  const originalSize = current?.fileMetadata.appData.previewThumbnail;
  const maxThumb = getLargestThumbOfPayload(
    current?.fileMetadata.payloads?.find((p) => p.key === DEFAULT_PAYLOAD_KEY)
  );

  const { isDarkMode } = useDarkMode();

  return (
    <>
      <ErrorNotification error={updatePhotoMetaError || updateDateError} />
      <Modal onClose={onClose} title="Info">
        <>
          {/* Description */}
          <View style={{ marginBottom: 30, width: '100%' }}>
            {photoMetadata ? (
              <>
                <Text
                  style={{
                    fontWeight: '600',
                    marginBottom: 5,
                  }}
                >
                  Description
                </Text>
                <Input
                  multiline={true}
                  placeholder="Add a description"
                  defaultValue={photoMetadata?.description}
                  onChangeText={(e) =>
                    debouncedChangeDesc({
                      target: { name: 'description', value: e },
                    })
                  }
                  style={{
                    height: 70,
                  }}
                />
              </>
            ) : null}
          </View>
          <Text
            style={{
              fontWeight: '600',
              marginBottom: 15,
              color: isDarkMode ? Colors.white : Colors.black,
            }}
          >
            Details
          </Text>
          <View style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {/* DateTime */}
            {current ? <PhotoDate photoDsr={current} onChange={debouncedChangeTime} /> : null}
            {photoMetadata ? (
              <>
                {/* Capture; Camera etc... */}
                <PhotoCaptureDetails
                  metadata={photoMetadata}
                  key={'PhotoCaptureDetails' + current?.fileId}
                />
                {/* Location */}
                <PhotoGeoLocation
                  metadata={photoMetadata}
                  key={'PhotoGeoLocation' + current?.fileId}
                />
              </>
            ) : null}
            {/* Image size */}
            <View>
              <Text>Image size</Text>

              {loadOriginal ? (
                <Text style={{ color: isDarkMode ? Colors.white : Colors.black }}>
                  {originalSize?.pixelWidth} x {originalSize?.pixelHeight}
                </Text>
              ) : (
                <View style={{ display: 'flex', flexDirection: 'row' }}>
                  <Text>
                    {maxThumb?.pixelWidth} x {maxThumb?.pixelHeight}
                  </Text>
                  <Text
                    style={{
                      marginLeft: 5,
                      fontStyle: 'italic',
                    }}
                  >
                    ({originalSize?.pixelWidth} x {originalSize?.pixelHeight} original)
                  </Text>
                </View>
              )}
            </View>
            {/* Unique Id */}

            <View>
              <Text>Unique identifier</Text>
              <Text>{current?.fileMetadata.appData.uniqueId}</Text>
            </View>
          </View>
        </>
      </Modal>
    </>
  );
};

const PhotoCaptureDetails = ({ metadata }: { metadata: ImageMetadata }) => {
  if (!metadata) return null;

  const details = metadata.captureDetails;
  const fNumber = details?.fNumber ? `f/${details.fNumber}` : null;
  const exposureTime = details?.exposureTime ? `1/${1 / parseFloat(details.exposureTime)}` : null;
  const focalLength = details?.focalLength ? `${details.focalLength}mm` : null;
  const iso = details?.iso ? `ISO${details.iso}` : null;

  return (
    <View>
      {metadata.camera ? (
        <Text>
          {metadata.camera.make} {metadata.camera.model}
        </Text>
      ) : null}
      {details ? (
        <Text>
          {fNumber} {exposureTime} {focalLength} {iso}
        </Text>
      ) : null}
    </View>
  );
};

const PhotoGeoLocation = ({ metadata }: { metadata: ImageMetadata }) => {
  if (!metadata || !metadata.captureDetails?.geolocation) return null;

  const { latitude, longitude, altitude } = metadata.captureDetails.geolocation;

  return (
    <View>
      <Text>
        {latitude} (lat), {longitude} (lng), {altitude}m
      </Text>
    </View>
  );
};

const PhotoDate = ({
  photoDsr,
  onChange,
}: {
  photoDsr: HomebaseFile;
  onChange: (e: { target: { name: 'date'; value: Date } }) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const date = useMemo(() => {
    if (photoDsr?.fileMetadata.appData.userDate) {
      return new Date(photoDsr.fileMetadata.appData.userDate);
    }

    if (photoDsr?.fileMetadata.created) return new Date(photoDsr.fileMetadata.created);

    return null;
  }, [photoDsr]);

  const doOpen = useCallback(() => setIsOpen(true), [setIsOpen]);
  const doClose = useCallback(() => setIsOpen(false), [setIsOpen]);

  return (
    <View
    // style={{
    //   display: 'flex',
    //   flexDirection: 'row',
    //   justifyContent: 'flex-start',
    //   alignItems: 'flex-start',
    //   flex: 1,
    // }}
    >
      {photoDsr?.fileId ? (
        <>
          {Platform.OS === 'ios' || isOpen ? (
            <DateTimePicker
              value={date || new Date()}
              mode={'datetime'}
              onChange={(e, newDate) => {
                if (newDate && newDate?.getTime() !== date?.getTime()) {
                  onChange({
                    target: { name: 'date', value: newDate },
                  });
                }

                setIsOpen(false);
              }}
              onTouchCancel={doClose}
            />
          ) : null}

          {Platform.OS !== 'ios' ? (
            <TouchableOpacity
              onPress={doOpen}
              style={{
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Text>
                  {date?.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text>
                  {date?.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: 'numeric',
                  })}
                </Text>
              </View>

              <Pencil />
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

export default PhotoInfo;
