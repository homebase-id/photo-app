import { debounce } from 'lodash-es';
import React, { useMemo, useRef, useState } from 'react';

import { Modal } from 'native-base';
import { DEFAULT_PAYLOAD_KEY, DriveSearchResult } from '@youfoundation/js-lib/core';
import { Platform, TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../app/Colors';
import { Pencil } from '../ui/Icons/icons';
import usePhotoMetadata from '../../hooks/photoLibrary/usePhotoMeta';
import { useDarkMode } from '../../hooks/useDarkMode';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';
import { ImageMetadata } from '@youfoundation/js-lib/media';
import { getLargestThumbOfPayload } from '@youfoundation/js-lib/helpers';
import { Input } from '../ui/Form/Input';

const targetDrive = PhotoConfig.PhotoDrive;

const PhotoInfo = ({
  current,
  isOpen,
  onClose,
}: {
  current?: DriveSearchResult;

  isOpen: boolean;
  onClose: () => void;
}) => {
  const {
    fetchMeta: { data: photoMetadata },
    updateMeta: { mutate: updatePhotoMeta },
    updateDate: { mutate: updateDate },
  } = usePhotoMetadata(targetDrive, current?.fileId);
  const loadOriginal = false;

  const onChange = useRef(
    (e: { target: { name: 'description'; value: string } | { name: 'date'; value: Date } }) => {
      if (current)
        if (e.target.name === 'description')
          updatePhotoMeta({
            photoFileId: current.fileId,
            newImageMetadata: { description: e.target.value },
          });
        else
          updateDate({
            photoFileId: current.fileId as string,
            newDate: e.target.value.getTime(),
          });
    }
  );

  const debouncedChangeDesc = useMemo(() => debounce(onChange.current, 1500), [onChange]);

  const debouncedChangeTime = useMemo(() => debounce(onChange.current, 1500), [onChange]);

  const originalSize = current?.fileMetadata.appData.previewThumbnail;
  const maxThumb = getLargestThumbOfPayload(
    current?.fileMetadata.payloads.find((p) => p.key === DEFAULT_PAYLOAD_KEY)
  );

  const { isDarkMode } = useDarkMode();
  return (
    <Modal isOpen={isOpen} onClose={onClose} avoidKeyboard>
      <Modal.Content
        style={{
          marginTop: 'auto',
          marginBottom: 0,
          width: '100%',
          maxHeight: '60%',
          backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        }}
      >
        <Modal.CloseButton />
        <Modal.Header
          style={{
            borderBottomWidth: 0,
            backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
            color: isDarkMode ? Colors.white : Colors.black,
          }}
        >
          Info
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
          }}
        >
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
        </Modal.Body>
      </Modal.Content>
    </Modal>
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
  photoDsr: DriveSearchResult;
  onChange: (e: { target: { name: 'date'; value: Date } }) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const date = useMemo(() => {
    if (photoDsr?.fileMetadata.appData.userDate)
      return new Date(photoDsr.fileMetadata.appData.userDate);

    if (photoDsr?.fileMetadata.created) return new Date(photoDsr.fileMetadata.created);

    return null;
  }, [photoDsr]);

  return (
    <View
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        width: '100%',
      }}
    >
      {photoDsr?.fileId ? (
        <>
          {Platform.OS === 'ios' || isOpen ? (
            <DateTimePicker
              value={date || new Date()}
              mode={'datetime'}
              onChange={(e, newDate) => {
                if (newDate && newDate?.getTime() !== date?.getTime())
                  onChange({
                    target: { name: 'date', value: newDate },
                  });

                setIsOpen(false);
              }}
              onTouchCancel={() => setIsOpen(false)}
            />
          ) : null}

          {Platform.OS !== 'ios' ? (
            <TouchableOpacity
              onPress={() => setIsOpen(true)}
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
