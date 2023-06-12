import JSZip from 'jszip';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';
import usePhoto from '../photoLibrary/usePhoto';
import usePhotoMeta from '../photoLibrary/usePhotoMeta';

const DB_NAME = 'OdinPhotosDatabase';
const UPLOADED_FILES_STORE = 'uploadedFiles';
const JSON_FILES_STORE = 'jsonFiles';

const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', 'mp4'];
const vid2cvt = ['.avi', '.mp3', '.mov', '.mpg', '.mpeg'];
const img2cvt = ['.bmp', '.raw'];

const mimeTypes = [
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'jpeg', mime: 'image/jpeg' },
  { ext: 'png', mime: 'image/png' },
  { ext: 'gif', mime: 'image/gif' },
  { ext: 'webp', mime: 'image/webp' },
  { ext: 'mp4', mime: 'video/mp4' },
  { ext: 'avi', mime: 'video/avi' },
  { ext: 'mp3', mime: 'video/mp3' },
  { ext: 'mov', mime: 'video/mov' },
  { ext: 'mpg', mime: 'video/mpg' },
  { ext: 'mpeg', mime: 'video/mpeg' },
  { ext: 'bmp', mime: 'image/bmp' },
  { ext: 'raw', mime: 'image/raw' },
];

let db: IDBDatabase;

const useImporter = () => {
  const [status, setStatus] = useState('idle');
  const [log, setLog] = useState('');

  const { mutateAsync: doUploadToServer } = usePhoto(PhotoConfig.PhotoDrive).upload;
  const {
    updateDate: { mutateAsync: updateDate },
    updateMeta: { mutateAsync: updateMeta },
  } = usePhotoMeta(PhotoConfig.PhotoDrive);

  const queryClient = useQueryClient();

  //
  // =================== DATABASE STUFF =======================
  //
  const openDatabase = () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = function () {
        reject('Error opening database.');
      };
      request.onsuccess = function () {
        db = request.result;
        resolve();
        queryClient.invalidateQueries(['status']);
      };
      request.onupgradeneeded = function () {
        db = this.result;
        db.createObjectStore(UPLOADED_FILES_STORE, { keyPath: 'uniquename' });
        db.createObjectStore(JSON_FILES_STORE, { keyPath: 'uniquename' });
      };
    });
  };

  openDatabase().catch(console.error); // Open database

  const addUploadedFile = async (uniquename: string, guid: string) => {
    // console.log("adding uploaded file: ", uniquename);
    const transaction = db.transaction([UPLOADED_FILES_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOADED_FILES_STORE);
    await store.add({ uniquename: uniquename, guid: guid, status: 0 });
  };

  const addJsonFile = async (uniquename: string, json: unknown) => {
    // console.log("adding json file: ", uniquename);
    const transaction = db.transaction([JSON_FILES_STORE], 'readwrite');
    const store = transaction.objectStore(JSON_FILES_STORE);
    await store.add({ uniquename: uniquename, json: json });
  };

  const getUniquenameUploadGuid = async (uniquename: string) => {
    const transaction = db.transaction([UPLOADED_FILES_STORE], 'readonly');
    const store = transaction.objectStore(UPLOADED_FILES_STORE);
    const request = store.get(uniquename);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result) {
          // If a result was found, resolve the promise with the GUID.
          resolve(request.result.guid);
        } else {
          // If no result was found, resolve the promise with null.
          resolve(null);
        }
      };
      request.onerror = () => {
        reject('Error fetching data.');
      };
    });
  };

  const getJsonFile = async (uniquename: string) => {
    const transaction = db.transaction([JSON_FILES_STORE], 'readonly');
    const store = transaction.objectStore(JSON_FILES_STORE);
    const request = store.get(uniquename);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result ? request.result.json : null);
      };
      request.onerror = () => {
        reject('Error fetching data.');
      };
    });
  };

  const updateUploadStatus = (uniquename: string, newStatus: number) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([UPLOADED_FILES_STORE], 'readwrite');
      const store = transaction.objectStore(UPLOADED_FILES_STORE);
      const request = store.get(uniquename);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          console.log(`No record found for uniquename: ${uniquename}`);
          reject('No record found');
          return;
        }
        record.status = newStatus;
        const updateRequest = store.put(record);
        updateRequest.onsuccess = resolve;
        updateRequest.onerror = (event) => {
          console.log(`Error updating status for uniquename: ${uniquename}`, event);
          reject('Error updating status');
        };
      };

      request.onerror = (event) => {
        console.log(`Error fetching record for uniquename: ${uniquename}`, event);
        reject('Error fetching record');
      };
    });
  };
  //
  // =================== API to ODIN =======================
  //

  interface GeoData {
    altitude: number;
    latitude: number;
    latitudeSpan: number;
    longitude: number;
    longitudeSpan: number;
  }

  // @Stef
  // Stub function for processing the record.
  // Use the ODIN API to update fileId with jsonData
  //
  async function applyJsonPhotos(
    fileId: string,
    record: { uniquename: string },
    jsonData: {
      creationTime: { timestamp: string; formatted: string };
      description: string;
      geoData: GeoData;
      geoDataExif: GeoData;
      photoTakenTime: { timestamp: string; formatted: string };
      title: string;
    }
  ) {
    try {
      await updateDate({
        photoFileId: fileId,
        newDate: new Date(parseInt(jsonData.photoTakenTime.timestamp)).getTime(),
      });
    } catch (error) {
      console.error({ error, _context: { fileId, jsonData } });
    }

    try {
      await updateMeta({
        photoFileId: fileId,
        newImageMetadata: {
          description: jsonData.description,
          captureDetails: {
            geolocation: {
              latitude: jsonData.geoData.latitude,
              longitude: jsonData.geoData.longitude,
              altitude: jsonData.geoData.altitude,
            },
          },
        },
      });
    } catch (error) {
      console.error({ error, _context: { fileId, jsonData } });
    }

    try {
      console.log(`Apply JSON API to photo ${record.uniquename}.`);
      await updateUploadStatus(record.uniquename, 1); // 1 means "applied successfully"
    } catch (error) {
      console.error(`Error in applyJsonPhotos:`, error);
    }
  }

  // @Stef
  // Stub function to upload the file to ODIN
  //
  //
  async function uploadToOdinPhotos(
    fileData: File | Blob,
    fullName: string,
    requiresConversion: boolean
  ) {
    const uniquename = createUniquename(fullName);
    const alreadyUploaded = await getUploadedFileGuid(uniquename);

    if (requiresConversion) {
      // TODO: Upload unprocessed as normal payload

      // => skip for now
      return generateGUID();
    }

    if (alreadyUploaded === null) {
      try {
        const uploadResult = await doUploadToServer({
          newPhoto: fileData,
          meta: { archivalStatus: 0 },
        });

        if (!uploadResult || !uploadResult.fileId) {
          console.error('Error uploading file to server.');
          return;
        }
        const uniqueGuid = uploadResult.fileId;

        await addUploadedFile(uniquename, uniqueGuid); // Save in the database
        setStatus('uploaded successfully.\n');
        return uniqueGuid;
      } catch (error) {
        console.error(`Error uploading file to server:`, error);
      }
    } else {
      setStatus('skipping, already uploaded.\n');
      return alreadyUploaded;
    }
  }

  //
  // =================== Find photos with no JSON =======================
  //

  const doApplyJsons = () => {
    const transaction = db.transaction([UPLOADED_FILES_STORE], 'readonly');
    const store = transaction.objectStore(UPLOADED_FILES_STORE);

    const request = store.openCursor();
    request.onerror = function (event) {
      console.log('Error opening cursor:', (event.target as any)?.error);
    };

    request.onsuccess = async function (event) {
      const cursor = (event.target as any)?.result;
      if (cursor) {
        const recordCopy = { ...cursor.value };
        const uniquename = recordCopy.uniquename;
        const status = recordCopy.status;
        const guid = recordCopy.guid;

        if (status === 0) {
          console.log(`Cursor at record ${uniquename}`);
          cursor.continue();

          let jsonData = null;
          try {
            jsonData = await getJsonFile(uniquename);
          } catch (error) {
            console.error(`Error getJsonFile:`, error);
          }
          if (jsonData == null) {
            logString(`No JSON data found for ${uniquename}.\n`);
            console.log(`No JSON data found for ${uniquename}.`);
          } else {
            console.log(`Status is 0 == ${status} for ${uniquename}.`);
            try {
              await applyJsonPhotos(guid, recordCopy, jsonData);
            } catch (error) {
              console.error(`Error applying JSON for ${uniquename}:`, error);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 0));
        } else {
          console.log(`Skipping, status was ${status} for ${uniquename}`);
          cursor.continue(); // Move this line here, to continue when status is not 0.
        }
      } else {
        console.log('No more entries!');
      }
    };
  };

  //
  // =================== HANDLE THE FILES =======================
  //

  const convertToJpeg = (imageBuffer: File | Blob, fullName: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([imageBuffer], { type: 'image/*' }); // creating a blob from the image buffer
      const img = new Image();
      img.src = URL.createObjectURL(blob);

      img.onload = () => {
        console.log('Image loaded successfully.');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; // or 'width' if you want a special/scaled size
        canvas.height = img.naturalHeight; // or 'height' if you want a special/scaled size

        // context
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get raw image data
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject('blob is null');
              return;
            }

            console.log('Image converted successfully.');
            const newFileName = fullName.replace(/\.[^/.]+$/, '') + '.jpg';
            resolve(new File([blob], newFileName, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          1
        );
      };

      img.onerror = (error) => {
        console.log('Image loading and conversion failed.');
        console.error(error);
        reject(error);
      };
    });
  };

  const processMediaFile = async (fileData: File | Blob, fullName: string) => {
    setStatus(`Uploading ${fullName} ... `);

    let requiresConversion = false;

    if (vid2cvt.some((extension) => fullName.toLowerCase().endsWith(extension))) {
      requiresConversion = true;
    } else if (img2cvt.some((extension) => fullName.toLowerCase().endsWith(extension))) {
      setStatus('... <b>converting to jpeg</b> ...');
      const jpegData = await convertToJpeg(fileData, fullName);
      fileData = jpegData; // Replace the original data with the JPEG data
    }

    await uploadToOdinPhotos(fileData, fullName, requiresConversion);
  };

  const processJsonFile = async (fileData: File | Blob, fullName: string) => {
    fullName = fullName.slice(0, -5);
    // logString(`Saving Json ${fullName}\n`);
    const uniquename = createUniquename(fullName);
    const jsonData: unknown = await new Response(fileData).json();
    await addJsonFile(uniquename, jsonData); // Save in the database
  };

  const processAFile = async (fileData: File | Blob, filename: string) => {
    // Find a mimeType
    fileData = !fileData.type ? new Blob([fileData], { type: getMimeType(filename) }) : fileData;

    if (filename.toLowerCase().endsWith('.json')) {
      await processJsonFile(fileData, filename);
    } else if (vid2cvt.some((ext) => filename.toLowerCase().endsWith(ext))) {
      logString(`File ${filename} added to MP4Conversion album.\n`);
      await processMediaFile(fileData, filename);
    } else if (img2cvt.some((ext) => filename.toLowerCase().endsWith(ext))) {
      logString(`Converting to jpg: ${filename}\n`);
      await processMediaFile(fileData, filename);
    } else if (extensions.some((ext) => filename.toLowerCase().endsWith(ext))) {
      await processMediaFile(fileData, filename);
    } else {
      console.log('Invalid extension: ' + filename);
      logString('*** Invalid extension for file: ' + filename + '\n');
      //window.alert(filename);
    }
  };

  // Handles the files the user picked in the selector

  const handleFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = (e.target as HTMLInputElement)?.files;

    for (let i = 0; files && i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith('.zip')) {
        await processZipFile(file);
      } else {
        await processAFile(file, '..' + file.name); // .. is unique (invalid in a normal name)
      }
    }

    setStatus(
      'Done processing all selected files, apply JSON when you have loaded all Takeout files.'
    );

    queryClient.invalidateQueries(['status']);
  };

  const processZipFile = async (file: File) => {
    setStatus('Opening Google Takeout ZIP ' + file.name + '... ');
    console.log('Opening Google Takeout ZIP ' + file.name + '... ');
    const zip = new JSZip();
    if (!zip) {
      return;
    }
    const content = await zip.loadAsync(file);
    setStatus(file.name + ' opened.');
    const filenames = Object.keys(content.files);

    for (const filename of filenames) {
      const fileData = await zip.file(filename)?.async('blob');
      if (!fileData) {
        continue;
      }
      await processAFile(fileData, filename);
    }
    setStatus('Done processing the Google Takeout ZIP file');
  };

  //
  // =================== MISC =======================
  //

  const getUploadedFileGuid = async (uniquename: string) => {
    const guid = await getUniquenameUploadGuid(uniquename);
    return guid;
  };

  const createUniquename = (fullName: string) => fullName;

  const getMimeType = (fileName: string) => {
    const fileExt = fileName.split('.').pop();
    return mimeTypes.find((m) => m.ext === fileExt)?.mime || 'application/octet-stream';
  };

  const generateGUID = () => {
    // This function generates a random GUID. Replace this with actual GUID returned from Odin Photos.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const logString = (s: string) => {
    setLog((oldVal) => oldVal + s);
  };

  const doClearStorage = () => {
    const transactionUploadedFiles = db.transaction([UPLOADED_FILES_STORE], 'readwrite');
    const storeUploadedFiles = transactionUploadedFiles.objectStore(UPLOADED_FILES_STORE);
    storeUploadedFiles.clear();

    const transactionJsonFiles = db.transaction([JSON_FILES_STORE], 'readwrite');
    const storeJsonFiles = transactionJsonFiles.objectStore(JSON_FILES_STORE);
    storeJsonFiles.clear();

    setStatus('Local DB storage cleared.\n');
    queryClient.invalidateQueries(['status']);
  };

  return { status, log, handleFiles, doClearStorage, doApplyJsons };
};
export default useImporter;
