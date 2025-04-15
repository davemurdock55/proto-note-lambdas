import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse, parseAndValidateBody } from 'commons';
import { getRecord, putRecord } from 'data';
import { z } from 'zod';

// Define the schema for a note
const noteSchema = z.object({
    title: z.string(),
    content: z.string(),
    lastEditTime: z.number(),
    createdAtTime: z.number(),
});

// Define the schema for the sync request
const syncRequestSchema = z.object({
    username: z.string().email(),
    deviceId: z.string(),
    notes: z.array(noteSchema),
});

// Define type for the sync request
type SyncRequest = z.infer<typeof syncRequestSchema>;

// Define type for a note
export type Note = z.infer<typeof noteSchema>;

// Add this near your other type definitions
type DeletedNote = {
    title: string;
    deletedAt: number;
    acknowledgedBy: string[]; // Array of device IDs
};

// Define the table name for notes
const NOTES_TABLE = 'notes-database';

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const validatedResult = parseAndValidateBody<SyncRequest>(event, syncRequestSchema, ['username', 'notes']);

        if ('statusCode' in validatedResult) {
            return validatedResult;
        }

        const { username, deviceId, notes } = validatedResult.body;

        // Get user notes and device sync info
        const userNotesRecord = await getRecord(NOTES_TABLE, { notesTableId: username });
        const userNotes: Note[] = userNotesRecord?.notes || [];
        const deviceSyncs = userNotesRecord?.deviceSyncs || {};
        const deletedNotes: DeletedNote[] = userNotesRecord?.deletedNotes || [];

        // Create a map for easier lookup
        const deletedNotesMap = new Map<string, DeletedNote>();
        deletedNotes.forEach((note) => deletedNotesMap.set(note.title, note));

        // Current device's last sync state
        const deviceSync = deviceSyncs[deviceId] || { lastSyncedTime: 0, previousNotes: [] };
        const lastSyncedTime = deviceSync.lastSyncedTime;
        const previousNoteTitles = deviceSync.previousNotes || [];

        // Current timestamp
        const currentTime = Date.now();

        const clientNotesMap = new Map<string, Note>();
        notes.forEach((note) => clientNotesMap.set(note.title, note));

        const dbNotesMap = new Map<string, Note>();
        userNotes.forEach((note) => dbNotesMap.set(note.title, note));

        const mergedNotes: Note[] = [];
        const deletedNoteTitles: string[] = [];

        // STEP 1: Detect deleted notes based on previous notes for this device
        for (const title of previousNoteTitles) {
            if (!clientNotesMap.has(title)) {
                const dbNote = dbNotesMap.get(title);
                if (!dbNote) continue;

                const modifiedByOthers = dbNote.lastEditTime > lastSyncedTime;

                if (!modifiedByOthers) {
                    deletedNoteTitles.push(title);
                    console.log(`Note "${title}" was deleted on device ${deviceId}, honoring deletion`);
                } else {
                    mergedNotes.push(dbNote);
                    console.log(`Note "${title}" was modified after last sync, preserving`);
                }
            }
        }

        // STEP 2: Process client notes (add new/updated notes)
        for (const [title, clientNote] of clientNotesMap.entries()) {
            // Skip notes that were previously deleted
            if (deletedNotesMap.has(title)) {
                // Mark this device as having acknowledged the deletion
                const deletedNote = deletedNotesMap.get(title) as DeletedNote;
                if (!deletedNote.acknowledgedBy.includes(deviceId)) {
                    deletedNote.acknowledgedBy.push(deviceId);
                    console.log(`Device ${deviceId} acknowledged deletion of "${title}"`);
                }
                console.log(`Note "${title}" was previously deleted, ignoring from client`);
                continue;
            }

            const dbNote = dbNotesMap.get(title);
            if (!dbNote) {
                mergedNotes.push(clientNote);
            } else if (clientNote.lastEditTime > dbNote.lastEditTime) {
                mergedNotes.push(clientNote);
            } else {
                mergedNotes.push(dbNote);
            }
        }

        // STEP 3: Add notes from the database that this device hasn't seen yet
        for (const [title, dbNote] of dbNotesMap.entries()) {
            if (clientNotesMap.has(title) || deletedNoteTitles.includes(title)) continue;
            if (!previousNoteTitles.includes(title)) {
                mergedNotes.push(dbNote);
                console.log(`Note "${title}" is new for device ${deviceId}, adding to response`);
            }
        }

        const currentNoteTitles = notes.map((note) => note.title);

        const updatedDeviceSyncs = {
            ...deviceSyncs,
            [deviceId]: {
                lastSyncedTime: currentTime,
                previousNotes: currentNoteTitles,
            },
        };

        console.log(`Sync summary for ${username}:`);
        console.log(`- ${notes.length} notes from client`);
        console.log(`- ${userNotes.length} notes in database`);
        console.log(`- ${mergedNotes.length} notes after merge`);
        console.log(`- ${deletedNoteTitles.length} notes marked for deletion`);

        // Filter out notes that were marked for deletion
        const finalNotes = mergedNotes.filter((note) => !deletedNoteTitles.includes(note.title));

        // Get all known device IDs
        const knownDeviceIds = Object.keys(updatedDeviceSyncs);

        // Process deleted notes, keeping track of newly deleted notes
        const updatedDeletedNotes: DeletedNote[] = [];
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

        // Add newly deleted notes to the list
        for (const title of deletedNoteTitles) {
            // Skip if already in the list
            if (deletedNotesMap.has(title)) continue;

            updatedDeletedNotes.push({
                title,
                deletedAt: currentTime,
                acknowledgedBy: [deviceId], // Initial device that performed the deletion
            });
        }

        // Process existing deleted notes
        deletedNotes.forEach((deletedNote) => {
            // Skip if this is a newly deleted note we already added
            if (deletedNoteTitles.includes(deletedNote.title)) return;

            // Add current device to acknowledgedBy if it's not already there
            if (!deletedNote.acknowledgedBy.includes(deviceId)) {
                deletedNote.acknowledgedBy.push(deviceId);
            }

            // Check if all devices have acknowledged this deletion
            const allDevicesAcknowledged = knownDeviceIds.every((id) => deletedNote.acknowledgedBy.includes(id));

            // Check if the deletion is older than 30 days
            const isOlderThan30Days = currentTime - deletedNote.deletedAt > THIRTY_DAYS_MS;

            // If all devices acknowledged or it's older than 30 days, don't keep it
            if (allDevicesAcknowledged) {
                console.log(`All devices have acknowledged deletion of "${deletedNote.title}", removing from tracking`);
                return;
            }

            if (isOlderThan30Days) {
                console.log(`Deletion of "${deletedNote.title}" is older than 30 days, removing from tracking`);
                return;
            }

            // Otherwise, keep tracking this deleted note
            updatedDeletedNotes.push(deletedNote);
        });

        console.log(`- ${deletedNotes.length} previously tracked deleted notes`);
        console.log(`- ${updatedDeletedNotes.length} deleted notes after cleanup`);

        // Save the merged notes back to the database
        await putRecord(NOTES_TABLE, {
            notesTableId: username,
            username,
            notes: finalNotes,
            deviceSyncs: updatedDeviceSyncs,
            deletedNotes: updatedDeletedNotes,
        });

        return sendResponse({
            notes: finalNotes,
            lastSyncedTime: currentTime,
        });
    } catch (err) {
        console.error('Error syncing notes:', err);
        return sendResponse({ message: 'Error processing sync request' }, 500);
    }
};
