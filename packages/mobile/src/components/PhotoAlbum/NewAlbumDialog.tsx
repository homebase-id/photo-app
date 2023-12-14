import React, { useState } from 'react';
import { Input, Modal, TextArea } from 'native-base';
import { Button, TextInput, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { Colors } from '../../app/Colors';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { useAlbum } from '../../hooks/photoLibrary/useAlbum';
import { useDarkMode } from '../../hooks/useDarkMode';

const NewAlbumDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { mutateAsync: saveAlbum, status: saveStatus, error: saveError } = useAlbum().save;

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
        }}
      >
        <Modal.CloseButton />
        <Modal.Header
          style={{
            borderBottomWidth: 0,
            backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
          }}
        >
          New Album
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
          }}
        >
          {/* Name */}
          <View style={{ marginBottom: 30, width: '100%' }}>
            <Text style={{ marginBottom: 5, fontWeight: '600' }}>Name</Text>
            <TextInput
              placeholder="Add a name"
              onChangeText={(val) => setName(val)}
              style={{
                height: 40,
                borderWidth: 1,
                borderColor: isDarkMode ? Colors.slate[700] : Colors.slate[300],
                borderRadius: 4,
                padding: 10,
                color: isDarkMode ? Colors.white : Colors.black,
              }}
              onSubmitEditing={name ? doSaveAlbum : undefined}
            />
          </View>
          <View style={{ marginBottom: 30, width: '100%' }}>
            <Text style={{ marginBottom: 5, fontWeight: '600' }}>Description</Text>
            <TextInput
              placeholder="Add a description"
              onChangeText={(val) => setDescription(val)}
              style={{
                height: 70,
                fontSize: 16,
                borderWidth: 1,
                borderColor: isDarkMode ? Colors.slate[700] : Colors.slate[300],
                borderRadius: 4,
                padding: 10,
                color: isDarkMode ? Colors.white : Colors.black,
              }}
              onSubmitEditing={name ? doSaveAlbum : undefined}
            />
          </View>
          <Button title="Create" onPress={doSaveAlbum} />
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default NewAlbumDialog;
