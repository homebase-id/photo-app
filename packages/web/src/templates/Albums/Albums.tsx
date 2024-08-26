import { Link } from 'react-router-dom';
import LoginNav from '../../components/Auth/LoginNav/LoginNav';
import AlbumIcon from '../../components/ui/Icons/Album/Album';
import Plus from '../../components/ui/Icons/Plus/Plus';
import { PageMeta } from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import { OdinImage } from '@homebase-id/ui-lib';
import { ImageIcon } from '../../components/ui/Icons/ImageIcon/ImageIcon';
import ActionLink from '../../components/ui/Buttons/ActionLink';
import { DEFAULT_PAYLOAD_KEY } from '@homebase-id/js-lib/core';
import {
  AlbumDefinition,
  PhotoConfig,
  useAlbumThumbnail,
  useAlbums,
  useDotYouClientContext,
} from 'photo-app-common';

const Albums = () => {
  const { data: albums } = useAlbums().fetch;

  return (
    <>
      <PageMeta
        title={t('Albums')}
        icon={AlbumIcon}
        actions={
          <>
            <ActionLink icon={Plus} type="secondary" href="/album/new" size="square">
              {t('New album')}
            </ActionLink>
            <LoginNav />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-10 md:grid-cols-4 xl:grid-cols-5">
        {albums?.map((album, index) => <AlbumItem album={album} key={album.fileId ?? index} />)}
      </div>
    </>
  );
};

const AlbumItem = ({ album }: { album: AlbumDefinition }) => {
  const dotYouClient = useDotYouClientContext();
  const { data: thumb } = useAlbumThumbnail(album.tag).fetch;

  return (
    <Link to={`/album/${album.tag}`} className="relative">
      {thumb?.fileId ? (
        <OdinImage
          dotYouClient={dotYouClient}
          targetDrive={PhotoConfig.PhotoDrive}
          fileId={thumb?.fileId}
          fileKey={DEFAULT_PAYLOAD_KEY}
          lastModified={undefined}
          fit="cover"
          className="aspect-square"
          preferObjectUrl={true}
        />
      ) : (
        <div className="bg-slate-100">
          <ImageIcon className="aspect-square p-12 opacity-10" />
        </div>
      )}
      <div className="py-4">
        <h2 className="text-lg">{album.name}</h2>
      </div>
    </Link>
  );
};

export default Albums;
