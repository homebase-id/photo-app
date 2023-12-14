import {
  ArchivalStatus,
  DotYouClient,
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  GetModifiedResultOptions,
  SecurityGroupType,
  SystemFileType,
  TargetDrive,
  getFileHeader,
  queryBatch,
  queryModified,
} from '@youfoundation/js-lib/core';
import { base64ToUint8Array, jsonStringify64 } from '@youfoundation/js-lib/helpers';
import { QuickSQLite, Transaction, open } from 'react-native-quick-sqlite';

export interface FileSyncOptions {
  fileType?: number[] | undefined;
  dataType?: number[] | undefined;
  groupId?: string[] | undefined;
  tagsMatchAtLeastOne?: string[] | undefined;
  tagsMatchAll?: string[] | undefined;
  systemFileType?: SystemFileType;
  archivalStatus?: ArchivalStatus[];
}

interface HeaderRow {
  targetDrive: string;
  fileId: string;
  uniqueId?: string;

  archivalStatus: number;
  dataType: number;
  fileType: number;

  userDate: number;
  created: number;
  updated: number;

  content: string;
  sharedSecretEncryptedKeyHeader: string;

  contentType: string;
  isEncrypted: 0 | 1;
  senderOdinId: string;
  versionTag: string;
  priority: number;

  previewThumbnail?: string;
  payloads?: string;
}

const normalizeGuid = (guid: string) => {
  if (!guid || !guid.toLowerCase) return guid;
  return guid.toLowerCase().replace(/-/g, '');
};

const BATCH_SIZE = 100;
const DB_INNER_NAME = 'myDb';
const DB_VERSION = 1;
const DB_NAME = `${DB_INNER_NAME}_${DB_VERSION}`;

const db = open({ name: `${DB_NAME}`, location: 'default' });
const initiate = () => {
  // db.execute('DROP TABLE IF EXISTS headers;');
  db.execute(
    `CREATE TABLE IF NOT EXISTS headers (
      fileId TEXT PRIMARY KEY,
      targetDrive TEXT NOT NULL,
      uniqueId TEXT,

      archivalStatus INTEGER NOT NULL,
      dataType INTEGER NOT NULL,
      fileType INTEGER NOT NULL,

      userDate INTEGER,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL,

      isEncrypted BOOLEAN,
      senderOdinId TEXT,
      versionTag TEXT NOT NULL,
      priority INTEGER NOT NULL,

      previewThumbnail TEXT,
      payloads TEXT,

      content TEXT,
      sharedSecretEncryptedKeyHeader TEXT
    ) WITHOUT ROWID;`
  );

  // db.execute('DROP TABLE IF EXISTS tags;');
  db.execute(
    `CREATE TABLE IF NOT EXISTS tags (
      fileId TEXT NOT NULL,
      targetDrive TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (fileId, tagId)
    ) WITHOUT ROWID;`
  );
};

initiate();

export const saveToLocalDb = async (targetDrive: TargetDrive, headers: DriveSearchResult[]) => {
  await QuickSQLite.transaction(DB_NAME, async (tx) => {
    try {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];

        if (header.fileState !== 'active') {
          removeFromLocalDb(targetDrive, header.fileId, tx);
          continue;
        }

        const insertResult = await tx.executeAsync(
          `INSERT INTO headers (
            fileId,
            targetDrive,
            uniqueId,
            archivalStatus,
            dataType,
            fileType,
            userDate,
            created,
            updated,
            isEncrypted,
            senderOdinId,
            versionTag,
            priority,
            previewThumbnail,
            payloads,
            content,
            sharedSecretEncryptedKeyHeader)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(fileId) DO UPDATE SET
            archivalStatus=excluded.archivalStatus,
            dataType=excluded.dataType,
            fileType=excluded.fileType,

            userDate=excluded.userDate,
            created=excluded.created,
            updated=excluded.updated,

            isEncrypted=excluded.isEncrypted,
            senderOdinId=excluded.senderOdinId,
            versionTag=excluded.versionTag,
            priority=excluded.priority,
            previewThumbnail=excluded.previewThumbnail,
            payloads=excluded.payloads,
            content=excluded.content,
            sharedSecretEncryptedKeyHeader=excluded.sharedSecretEncryptedKeyHeader
          WHERE excluded.updated>headers.updated;`,
          [
            normalizeGuid(header.fileId),
            targetDrive.alias,
            header.fileMetadata.appData.uniqueId
              ? normalizeGuid(header.fileMetadata.appData.uniqueId)
              : undefined,
            header.fileMetadata.appData.archivalStatus,
            header.fileMetadata.appData.dataType,
            header.fileMetadata.appData.fileType,

            header.fileMetadata.appData.userDate,
            header.fileMetadata.created,
            header.fileMetadata.updated,

            header.fileMetadata.isEncrypted,
            header.fileMetadata.senderOdinId,
            header.fileMetadata.versionTag,
            header.priority,
            header.fileMetadata.appData.previewThumbnail
              ? jsonStringify64(header.fileMetadata.appData.previewThumbnail)
              : undefined,
            header.fileMetadata.payloads
              ? jsonStringify64(header.fileMetadata.payloads)
              : undefined,
            header.fileMetadata.appData.content
              ? jsonStringify64(header.fileMetadata.appData.content)
              : undefined,
            header.sharedSecretEncryptedKeyHeader
              ? jsonStringify64(header.sharedSecretEncryptedKeyHeader)
              : undefined,
          ]
        );

        // we have an updated file (updated of incoming header is later than existing header), reset all tags for this file
        if (insertResult.rowsAffected > 0) {
          await tx.executeAsync('DELETE FROM tags WHERE fileId = ?', [
            normalizeGuid(header.fileId),
          ]);

          for (
            let j = 0;
            header.fileMetadata.appData.tags && j < header.fileMetadata.appData.tags?.length;
            j++
          ) {
            const normalizedTag = normalizeGuid(header.fileMetadata.appData.tags[j]);
            await tx.executeAsync(
              `INSERT INTO tags (fileId, tagId, targetDrive)
            VALUES (?, ?, ?)
            ON CONFLICT(fileId, tagId) DO NOTHING`,
              [normalizeGuid(header.fileId), normalizedTag, targetDrive.alias]
            );
          }
        }
      }

      console.log(`inserted ${headers.length} rows`);

      tx.commit();
    } catch (ex) {
      console.log('error', ex);
      tx.rollback();
    }
  });

  return true;
};

const removeFromLocalDb = async (targetDrive: TargetDrive, fileId: string, tx?: Transaction) => {
  await (tx || db).executeAsync('DELETE FROM headers WHERE fileId = ? AND targetDrive = ?', [
    normalizeGuid(fileId),
    targetDrive.alias,
  ]);
  await (tx || db).executeAsync('DELETE FROM tags WHERE fileId = ? AND targetDrive = ?', [
    normalizeGuid(fileId),
    targetDrive.alias,
  ]);
};

const parseHeader = (row: HeaderRow, tagRows?: string[]): DriveSearchResult => {
  const ssObject = row.sharedSecretEncryptedKeyHeader
    ? JSON.parse(row.sharedSecretEncryptedKeyHeader)
    : undefined;

  return {
    fileId: row.fileId,
    fileState: 'active',
    fileSystemType: 'Standard',
    fileMetadata: {
      appData: {
        uniqueId: row.uniqueId,
        archivalStatus: row.archivalStatus,
        dataType: row.dataType,
        fileType: row.fileType,
        userDate: row.userDate,
        tags: tagRows || [],
        content: row.content ? JSON.parse(row.content) : undefined,
        previewThumbnail: row.previewThumbnail ? JSON.parse(row.previewThumbnail) : undefined,
      },
      created: row.created,
      updated: row.updated,
      payloads: row.payloads ? JSON.parse(row.payloads) : undefined,
      isEncrypted: row.isEncrypted === 1,
      senderOdinId: row.senderOdinId,
      versionTag: row.versionTag,
    },
    priority: row.priority,
    // TODO: Do we need to have the serverMetadata?
    serverMetadata: {
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      allowDistribution: false,
      doNotIndex: false,
    },
    sharedSecretEncryptedKeyHeader: ssObject
      ? {
          encryptedAesKey: base64ToUint8Array(ssObject.encryptedAesKey),
          encryptionVersion: ssObject.encryptionVersion,
          iv: base64ToUint8Array(ssObject.iv),
          type: ssObject.type,
        }
      : (null as any),
  };
};

export const getHeaderFromLocalDb = async (
  targetDrive: TargetDrive,
  fileId: string
): Promise<DriveSearchResult | undefined> => {
  const queryResult = await db.executeAsync(
    'SELECT * FROM headers WHERE fileId = ? AND targetDrive = ?',
    [fileId, targetDrive.alias]
  );

  if (!queryResult.rows || queryResult.rows?.length === 0) return undefined;

  const flatHeader: HeaderRow = queryResult.rows.item(0);
  const tagsQueryResult = await db.executeAsync(
    'SELECT * FROM tags WHERE fileId = ? AND targetDrive = ?',
    [fileId, targetDrive.alias]
  );

  const tagRows: string[] = [];
  for (let i = 0; tagsQueryResult.rows && i < tagsQueryResult.rows?.length; i++)
    tagRows.push(tagsQueryResult.rows?.item(i));

  return parseHeader(flatHeader, tagRows);
};

export const syncHeaderFile = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<void> => {
  const header = await getFileHeader(dotYouClient, targetDrive, fileId);
  if (header) await saveToLocalDb(targetDrive, [header]);
  else await removeFromLocalDb(targetDrive, fileId);

  console.log('syncedHeaderFile', {
    fileId: header?.fileId,
    archivalStatus: header?.fileMetadata.appData.archivalStatus,
    tags: header?.fileMetadata.appData.tags,
  });
};

const syncBatch = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  queryParams: FileSyncOptions,
  lastQueryBatchCursor: string | undefined
): Promise<{ cursor: string; queryTime: number }> => {
  // QueryBatch (get all/new files)
  const mergedQueryParams: FileQueryParams = {
    ...queryParams,
    targetDrive,
  };

  const resultOptions: GetBatchQueryResultOptions = {
    maxRecords: BATCH_SIZE,
    cursorState: lastQueryBatchCursor,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, mergedQueryParams, resultOptions);

  console.log(`Batch, saving ${response.searchResults.length} rows`);
  if (!(await saveToLocalDb(targetDrive, response.searchResults)))
    throw new Error('Failed to save to db');

  // We have more results to fetch
  if (response.searchResults.length >= BATCH_SIZE)
    return await syncBatch(dotYouClient, targetDrive, queryParams, response.cursorState);

  return { cursor: response.cursorState, queryTime: response.queryTime };
};

const syncModifed = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  queryParams: FileSyncOptions,
  mostRecentQueryModifiedTime: number | undefined
): Promise<{ queryTime: number }> => {
  // QueryModified (get modified files)
  const mergedQueryParams: FileQueryParams = {
    ...queryParams,
    targetDrive,
  };

  const resultOptions: GetModifiedResultOptions = {
    maxRecords: BATCH_SIZE,
    cursor: mostRecentQueryModifiedTime,
    includeHeaderContent: true,
  };

  const response = await queryModified(dotYouClient, mergedQueryParams, resultOptions);

  console.log(`Modified, saving ${response.searchResults.length} rows`);
  // TODO: Handle deleted files
  if (
    !(await saveToLocalDb(
      targetDrive,
      response.searchResults.filter((dsr) => dsr.fileState === 'active') as DriveSearchResult[]
    ))
  )
    throw new Error('Failed to save to db');

  // We have more results to fetch
  if (response.searchResults.length >= BATCH_SIZE)
    return await syncModifed(dotYouClient, targetDrive, queryParams, response.cursor);

  return { queryTime: response.cursor };
};

export const syncLocalDb = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  queryParams: FileSyncOptions,
  pageParams: {
    lastQueryBatchCursor: string | undefined;
    mostRecentQueryModifiedTime: number | undefined;
  }
): Promise<{ cursor: string; queryTime: number }> => {
  console.log('syncing from queries with', pageParams);

  const { cursor, queryTime: queryTimeFromBatch } = await syncBatch(
    dotYouClient,
    targetDrive,
    queryParams,
    pageParams.lastQueryBatchCursor
  );
  const { queryTime } = await syncModifed(
    dotYouClient,
    targetDrive,
    queryParams,
    pageParams.mostRecentQueryModifiedTime
  );

  return { cursor, queryTime };
};

interface LocalDbFileQueryParams extends Omit<FileQueryParams, 'userDate'> {
  userDate?: { start: number; end?: number };
}

interface LocalDbResultOptions {
  sorting?: 'fileId' | 'userDate';
  ordering?: 'default' | 'newestFirst' | 'oldestFirst';

  pageParam?: { skip?: number; take: number };
}

export const queryLocalDb = async (
  params: LocalDbFileQueryParams,
  resultOptions?: LocalDbResultOptions
): Promise<DriveSearchResult[]> => {
  let query = 'SELECT * FROM headers WHERE targetDrive = ?';
  const values: (string | number | number[])[] = [params.targetDrive.alias];

  if (params.fileType && params.fileType.length > 0) {
    query += ' AND fileType IN (?)';
    values.push(params.fileType.join(','));
  }

  if (params.dataType && params.dataType.length > 0) {
    query += ' AND dataType IN (?)';
    values.push(params.dataType.join(','));
  }

  if (params.archivalStatus && params.archivalStatus.length > 0)
    query += ` AND archivalStatus IN (${params.archivalStatus.join(',')})`;
  // Values doesn't work for some reason...
  // values.push(params.archivalStatus.map(st => st.toString()).join(','));

  if (params.userDate && params.userDate.start && params.userDate.end) {
    query += ' AND userDate BETWEEN ? AND ?';
    values.push(params.userDate.start);
    values.push(params.userDate.end);
  } else if (params.userDate && params.userDate.start) {
    if (resultOptions?.sorting === 'userDate')
      if (resultOptions?.ordering === 'newestFirst') query += ' AND userDate <= ?';
      else query += ' AND userDate > ?';
    values.push(params.userDate.start);
  }

  if (params.clientUniqueIdAtLeastOne && params.clientUniqueIdAtLeastOne.length > 0) {
    query += ' AND uniqueId IN (?)';
    values.push(params.clientUniqueIdAtLeastOne.map((guid) => normalizeGuid(guid)).join(','));
  }

  if (params.tagsMatchAtLeastOne && params.tagsMatchAtLeastOne.length > 0) {
    query += ' AND fileId IN (SELECT fileId FROM tags WHERE tagId IN (?) AND targetDrive = ?)';
    values.push(params.tagsMatchAtLeastOne.map((tag) => normalizeGuid(tag)).join(','));
    values.push(params.targetDrive.alias);
  }

  // if (params.tagsMatchAll && params.tagsMatchAll.length > 0) {
  //   query += ' AND fileId IN (SELECT fileId FROM tags WHERE tagId IN (?))';
  //   values.push(params.tagsMatchAll.join(','));
  // }

  if (params.systemFileType) throw new Error('systemFileType not implemented');
  if (params.sender) throw new Error('sender not implemented');
  if (params.groupId) throw new Error('groupId not implemented');

  if (resultOptions?.sorting === 'userDate') query += ' ORDER BY userDate';
  else query += ' ORDER BY fileId';

  if (resultOptions?.ordering)
    if (resultOptions.ordering === 'newestFirst') query += ' DESC';
    else if (resultOptions.ordering === 'oldestFirst') query += ' ASC';

  if (resultOptions?.pageParam) {
    query += ' LIMIT ? OFFSET ?';
    values.push(resultOptions.pageParam.take);
    values.push(resultOptions.pageParam.skip || 0);
  }

  return await db.executeAsync(query, values).then((result) => {
    const rows = result.rows;
    const results: DriveSearchResult[] = [];
    for (let i = 0; rows && i < rows.length; i++) {
      const row = rows.item(i);
      results.push(parseHeader(row));
    }
    return results;
  });
};

export const cleanupLocalDb = async () => {
  db.execute('DROP TABLE IF EXISTS headers;');
  db.execute('DROP TABLE IF EXISTS tags;');

  initiate();
};
