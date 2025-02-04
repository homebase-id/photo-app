/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlobData = any;
type BlobOptions = {
  type?: string;
  id?: string;
};

import { NativeModules } from 'react-native';
const { OdinBlobModule } = NativeModules;

/**
 * Opaque JS representation of some binary data in native.
 *
 * The API is modeled after the W3C Blob API, with one caveat
 * regarding explicit deallocation. Refer to the `close()`
 * method for further details.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Blob
 */
import { base64ToUint8Array, getNewId, uint8ArrayToBase64 } from '@homebase-id/js-lib/helpers';
import { CachesDirectoryPath, readFile, writeFile, unlink, copyFile } from 'react-native-fs';

class Blob {
  _data: BlobData;
  uri: string;
  written = false;

  /**
   * Constructor for JS consumers.
   * RN: Currently we only support creating Blobs from other Blobs.
   * Homebase: We support creating Blobs from Uint8Arrays by converting them to base64 and writing them to a file.
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob
   */
  constructor(parts: Array<Blob | string | Uint8Array> | string = [], options?: BlobOptions) {
    const mimeType = options?.type || 'application/octet-stream';
    if (Array.isArray(parts) && parts.length === 1 && parts[0] instanceof Uint8Array) {
      const id = options?.id || getNewId();
      this.data = {
        blobId: id,
        offset: 0,
        size: parts[0].length,
        type: mimeType,
        __collector: null,
      };

      const base64Data = uint8ArrayToBase64(parts[0]);
      // this.uri = `data:${mimeType};base64,${base64Data}`;

      // We need to convert to a cached file on the system, as RN is dumb that way... It can't handle blobs in a data uri, as it will always load it as a bitmap... 🤷
      // See getFileInputStream in RequestBodyUtil.class within RN for more info
      const localPath = CachesDirectoryPath + `/${id}` + `.${mimeType.split('/')[1]}`;
      this.uri = `file://${localPath}`;
      writeFile(localPath, base64Data, 'base64').then(() => {
        this.written = true;
      });
    } else if (typeof parts === 'string') {
      const id = options?.id || getNewId();

      this.data = {
        blobId: id,
        offset: 0,
        type: mimeType,
        __collector: null,
      };
      this.uri = parts;
      this.written = true;

      // this.writePromise = Promise.resolve();
    } else throw new Error('Unsupported Blob constructor arguments');
  }

  /*
   * This method is used to create a new Blob object containing
   * the data in the specified range of bytes of the source Blob.
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Blob/slice
   */
  // $FlowFixMe[unsafe-getters-setters]
  set data(data: BlobData) {
    this._data = data;
  }

  // $FlowFixMe[unsafe-getters-setters]
  get data(): BlobData {
    if (!this._data) throw new Error('Blob has been closed and is no longer available');

    return this._data;
  }

  /**
   * This method is in the standard, but not actually implemented by
   * any browsers at this point. It's important for how Blobs work in
   * React Native, however, since we cannot de-allocate resources automatically,
   * so consumers need to explicitly de-allocate them.
   *
   * Note that the semantics around Blobs created via `blob.slice()`
   * and `new Blob([blob])` are different. `blob.slice()` creates a
   * new *view* onto the same binary data, so calling `close()` on any
   * of those views is enough to deallocate the data, whereas
   * `new Blob([blob, ...])` actually copies the data in memory.
   */
  close() {
    // const BlobManager = require('react-native/Libraries/Blob/BlobManager');
    // BlobManager.release(this.data.blobId);
    unlink(this.uri);
    this.data = null;
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    const writePromise = new Promise<void>((resolve, reject) => {
      let intervalCount = 0;
      const interval = setInterval(async () => {
        intervalCount++;
        if (this.written) {
          clearInterval(interval);
          resolve();
        }
        if (intervalCount > 200) {
          clearInterval(interval);
          reject('[OdinBlob] Failed to write file to disk');
        }
      }, 100);
    });

    return writePromise.then(() =>
      readFile(this.uri, 'base64')
        .then((base64) => {
          if (!base64) return new Uint8Array(0).buffer;
          return base64ToUint8Array(base64).buffer;
        })
        .catch((err) => {
          console.log('err', err);
          return new Uint8Array(0).buffer;
        })
    );
  }

  async encrypt(key: Uint8Array, iv: Uint8Array) {
    await new Promise<void>((resolve, reject) => {
      let intervalCount = 0;
      const interval = setInterval(async () => {
        intervalCount++;
        if (this.written) {
          clearInterval(interval);
          resolve();
        }
        if (intervalCount > 200) {
          clearInterval(interval);
          reject('[OdinBlob] Failed to encrypt file to disk');
        }
      }, 100);
    });

    const destinationUri = `file://${CachesDirectoryPath}/${this.data.blobId}-encrypted.${getExtensionForMimeType(
      this.data.type
    )}`;

    const encryptStatus = await OdinBlobModule.encryptFileWithAesCbc16(
      this.uri,
      destinationUri,
      uint8ArrayToBase64(key),
      uint8ArrayToBase64(iv)
    );

    if (encryptStatus === 1) {
      //Remove the original file
      await unlink(this.uri);

      return new Blob(destinationUri, { type: this.data.type });
    } else {
      throw new Error('Failed to encrypt blob, with native encryption');
    }
  }

  async decrypt(key: Uint8Array, iv: Uint8Array) {
    await new Promise<void>((resolve, reject) => {
      let intervalCount = 0;

      const interval = setInterval(async () => {
        intervalCount++;
        if (this.written) {
          clearInterval(interval);
          resolve();
        }
        if (intervalCount > 200) {
          clearInterval(interval);
          reject('[OdinBlob] Failed to decrypt file to disk');
        }
      }, 100);
    });

    const destinationUri = `file://${CachesDirectoryPath}/${
      this.data.blobId
    }.${getExtensionForMimeType(this.data.type)}`;

    const decryptStatus = await OdinBlobModule.decryptFileWithAesCbc16(
      this.uri,
      destinationUri,
      uint8ArrayToBase64(key),
      uint8ArrayToBase64(iv)
    );

    if (decryptStatus === 1) {
      //Remove the original file
      await unlink(this.uri);

      return new Blob(destinationUri, { type: this.data.type });
    } else {
      throw new Error('Failed to decrypt blob, with native encryption');
    }
  }

  async fixExtension() {
    const destinationUri = `file://${CachesDirectoryPath}/${
      this.data.blobId
    }.${getExtensionForMimeType(this.data.type)}`;
    await copyFile(this.uri, destinationUri);

    await unlink(this.uri);
    return new Blob(destinationUri, { type: this.data.type });
  }

  /**
   * Size of the data contained in the Blob object, in bytes.
   */
  // $FlowFixMe[unsafe-getters-setters]
  get size(): number {
    return this.data.size;
  }

  /*
   * String indicating the MIME type of the data contained in the Blob.
   * If the type is unknown, this string is empty.
   */
  // $FlowFixMe[unsafe-getters-setters]
  get type(): string {
    return this.data.type || '';
  }
}

const getExtensionForMimeType = (mimeType: string | undefined | null) => {
  if (!mimeType) return 'bin';
  return mimeType === 'audio/mpeg'
    ? 'mp3'
    : mimeType === 'image/svg+xml'
      ? 'svg'
      : mimeType === 'application/vnd.apple.mpegurl'
        ? 'm3u8'
        : mimeType === 'video/mp2t'
          ? 'ts'
          : mimeType.split('/')[1];
};

export { Blob as OdinBlob };
