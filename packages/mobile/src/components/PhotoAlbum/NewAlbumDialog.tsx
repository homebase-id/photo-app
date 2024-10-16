import { useState } from 'react';
import { Button, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { getNewId } from '@homebase-id/js-lib/helpers';
import { Input } from '../ui/Form/Input';
import { Modal } from '../ui/Modal/Modal';
import { useAlbum } from 'photo-app-common';
import { addError } from '../../hooks/errors/useErrors';
import { useQueryClient } from '@tanstack/react-query';

const NewAlbumDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { mutateAsync: saveAlbum } = useAlbum().save;

  const doSaveAlbum = async () => {
    try {
      const newTag = getNewId();
      await saveAlbum({ tag: newTag, name, description });
      onClose();
    } catch (err) {
      addError(queryClient, err);
    }
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
