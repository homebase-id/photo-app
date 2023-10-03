import React, { useState } from 'react';
import { Input, Modal, TextArea } from 'native-base';
import { View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { Colors } from '../../app/Colors';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { useAlbum } from '../../hooks/photoLibrary/useAlbum';
import { useDarkMode } from '../../hooks/useDarkMode';

const NewAlbumDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const {
    mutateAsync: saveAlbum,
    status: saveStatus,
    error: saveError,
  } = useAlbum().save;

  const doSaveAlbum = async () => {
    const newTag = getNewId();
    await saveAlbum({ tag: newTag, name, description });
    onClose();
  };

  const { isDarkMode } = useDarkMode();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} avoidKeyboard>
      <Modal.Content
        style={{
          marginTop: 'auto',
          marginBottom: 0,
          width: '100%',
          maxHeight: '60%',
          backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        }}>
        <Modal.CloseButton />
        <Modal.Header
          style={{
            borderBottomWidth: 0,
            backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
          }}>
          New Album
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
          }}>
          {/* Name */}
          <View style={{ marginBottom: 30, width: '100%' }}>
            <Text>Name</Text>
            <Input
              w="100%"
              placeholder="Add a name"
              onChangeText={val => setName(val)}
              style={{
                fontSize: 16,
              }}
              onSubmitEditing={name ? doSaveAlbum : undefined}
            />
          </View>
          <View style={{ marginBottom: 30, width: '100%' }}>
            <Text>Description</Text>
            <TextArea
              h={20}
              w="100%"
              autoCompleteType={'off'}
              placeholder="Add a description"
              onChangeText={val => setDescription(val)}
              style={{
                fontSize: 16,
              }}
              onSubmitEditing={name ? doSaveAlbum : undefined}
            />
          </View>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default NewAlbumDialog;
