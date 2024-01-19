import React, { useState } from 'react';
import { Button, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { Input } from '../ui/Form/Input';
import { Modal } from '../ui/Modal/Modal';
import { useAlbum } from 'photo-app-common';
import useAuth from '../../hooks/auth/useAuth';

const NewAlbumDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { mutateAsync: saveAlbum, status: saveStatus, error: saveError } = useAlbum().save;

  const doSaveAlbum = async () => {
    const newTag = getNewId();
    await saveAlbum({ tag: newTag, name, description });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title="New album">
      {/* Name */}
      <View style={{ marginBottom: 30, width: '100%' }}>
        <Text style={{ marginBottom: 5, fontWeight: '600' }}>Name</Text>
        <Input
          placeholder="Add a name"
          onChangeText={(val) => setName(val)}
          onSubmitEditing={name ? doSaveAlbum : undefined}
        />
      </View>
      <View style={{ width: '100%' }}>
        <Text style={{ marginBottom: 5, fontWeight: '600' }}>Description</Text>
        <Input
          placeholder="Add a description"
          onChangeText={(val) => setDescription(val)}
          style={{
            height: 70,
          }}
          multiline={true}
          onSubmitEditing={name ? doSaveAlbum : undefined}
        />
      </View>
      <Button title="Create" onPress={doSaveAlbum} />
    </Modal>
  );
};

export default NewAlbumDialog;
