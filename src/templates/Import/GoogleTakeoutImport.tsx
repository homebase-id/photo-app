import ActionButton from '../../components/ui/Buttons/ActionButton';
import Upload from '../../components/ui/Icons/Upload/Upload';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import Label from '../../components/Form/Label';
import useImportStatus from '../../hooks/import/useImportStatus';
import useImporter from '../../hooks/import/useImporter';

const GoogleTakeoutImport = () => {
  const { handleFiles, status, log, doClearStorage, doApplyJsons } = useImporter();
  const { data } = useImportStatus();
  const { pictures, jsons, picturesMissingMeta, picturesWithMeta } = data || {};

  return (
    <>
      <div className="flex h-full flex-col">
        <PageMeta title={t('Google Takeout import')} icon={Upload} />
        <div className="flex flex-row">
          <Label
            htmlFor="file-input"
            className="relative flex min-w-[6rem] cursor-pointer flex-row items-center rounded-md bg-green-500 px-3 py-2 text-white hover:bg-green-600"
          >
            <Upload className="mr-2 h-5 w-5" />
            {t('Upload')}
          </Label>
          <input
            type="file"
            id="file-input"
            multiple
            onChange={handleFiles}
            className="sr-only invisible max-w-full"
          />
        </div>
        <div className="my-5 flex flex-row items-center">
          <p>
            {t('Status')}: {status}
          </p>
          <div className="ml-auto flex flex-row-reverse gap-2"></div>
        </div>

        <textarea
          readOnly
          className="my-5 flex-grow resize-none rounded-lg border bg-white p-1 text-gray-700 focus:outline-none dark:border-gray-900 dark:bg-black dark:text-gray-300"
          defaultValue={log}
        />
        <div className="my-5 flex flex-row flex-wrap gap-2">
          <p>Media: {pictures}</p>
          <p>Jsons: {jsons}</p>
          <p>Media without matching json: {picturesMissingMeta}</p>
          <p>Media with matching json: {picturesWithMeta}</p>
        </div>
        <div className="flex flex-row-reverse justify-between">
          <ActionButton onClick={doApplyJsons}>{t('Apply JSONs')}</ActionButton>
          <ActionButton onClick={doClearStorage} type="remove">
            {t('Clear Storage')}
          </ActionButton>
        </div>
      </div>
    </>
  );
};

export default GoogleTakeoutImport;
