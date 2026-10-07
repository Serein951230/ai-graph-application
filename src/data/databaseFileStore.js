import { getCurrentUserDatabaseId } from './learningResources';

const databaseName = 'snowwave-database-file-bytes';
const storeName = 'files';
let databasePromise;

const fileKey = id => `${getCurrentUserDatabaseId()}:${id}`;

function openDatabase() {
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(storeName);
            request.onsuccess = () => {
                request.result.onversionchange = () => {
                    request.result.close();
                    databasePromise = null;
                };
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        }).catch(error => {
            databasePromise = null;
            throw error;
        });
    }
    return databasePromise;
}

export async function saveDatabaseFileBlob(id, file) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).put(file, fileKey(id));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

export async function loadDatabaseFileBlob(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(fileKey(id));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteDatabaseFileBlob(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).delete(fileKey(id));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}
