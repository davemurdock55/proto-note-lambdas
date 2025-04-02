import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse, parseAndValidateBody } from 'commons';
import { getRecord, putRecord } from 'data';
import { z } from 'zod';

// Define the schema for a note
const noteSchema = z.object({
    title: z.string(),
    content: z.string(),
    lastEditTime: z.number(),
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

// Define the table name for notes
const NOTES_TABLE = 'notes-database';

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parse and validate the request body
        const validatedResult = parseAndValidateBody<SyncRequest>(event, syncRequestSchema, ['username', 'notes']);

        // If result is an error response, return it
        if ('statusCode' in validatedResult) {
            return validatedResult;
        }

        // Extract validated data - include deviceId
        const { username, deviceId, notes } = validatedResult.body;

        // Get the user's notes from the database
        const userNotesRecord = await getRecord(NOTES_TABLE, { notesTableId: username });
        const userNotes: Note[] = userNotesRecord?.notes || [];

        // Get the lastSyncedTime for THIS device
        const deviceSyncs = userNotesRecord?.deviceSyncs || {};
        const lastSyncedTime = deviceSyncs[deviceId]?.lastSyncedTime || 0;

        // Current timestamp to use as the new lastSyncedTime
        const currentTime = Date.now();

        // Create maps for easier lookup
        const clientNotesMap = new Map<string, Note>();
        notes.forEach((note) => clientNotesMap.set(note.title, note));

        const dbNotesMap = new Map<string, Note>();
        userNotes.forEach((note) => dbNotesMap.set(note.title, note));

        // Array to hold merged notes
        let mergedNotes: Note[] = [];

        // Track titles that should be deleted from the database
        const deletedNoteTitles: string[] = [];

        // Process notes from client
        for (const [title, clientNote] of clientNotesMap.entries()) {
            const dbNote = dbNotesMap.get(title);

            if (!dbNote) {
                // New note - add to merged notes
                mergedNotes.push(clientNote);
            } else if (clientNote.lastEditTime > dbNote.lastEditTime) {
                // Client note is newer - use client version
                mergedNotes.push(clientNote);
            } else {
                // DB note is newer or same - use DB version
                mergedNotes.push(dbNote);
            }
        }

        // Handle DB notes not in client - could be deleted or new from another device
        for (const [title, dbNote] of dbNotesMap.entries()) {
            if (!clientNotesMap.has(title)) {
                // If this is the device's first sync (lastSyncedTime === 0)
                // OR if the note was created/modified after this device's last sync
                if (lastSyncedTime === 0 || dbNote.lastEditTime > lastSyncedTime) {
                    // This is a new note from another device - preserve it
                    mergedNotes.push(dbNote);
                    console.log(`Note "${title}" is new from another device, preserving`);
                } else {
                    // The note existed before this device's last sync but this device doesn't have it
                    // This likely means it was intentionally deleted on this device
                    deletedNoteTitles.push(title);
                    console.log(`Note "${title}" appears deleted on this device, marking for deletion`);
                }
            }
        }

        // Actually remove the notes marked for deletion
        for (const title of deletedNoteTitles) {
            console.log(`Removing note "${title}" from the merged notes`);
            // Filter out the deleted notes
            mergedNotes = mergedNotes.filter((note) => note.title !== title);
        }

        // Update the database with the new deviceSync information
        const updatedDeviceSyncs = {
            ...deviceSyncs,
            [deviceId]: {
                lastSyncedTime: currentTime,
            },
        };

        // Log summary of changes
        console.log(`Sync summary for ${username}:`);
        console.log(`- ${notes.length} notes from client`);
        console.log(`- ${userNotes.length} notes in database`);
        console.log(`- ${mergedNotes.length} notes after merge`);
        console.log(`- ${deletedNoteTitles.length} notes marked for deletion`);
        console.log(`- Previously synced: ${new Date(lastSyncedTime).toISOString()}`);
        console.log(`- Current Sync Time (new lastSyncedTime): ${new Date(currentTime).toISOString()}`);

        // Save the merged notes back to the database
        await putRecord(NOTES_TABLE, {
            notesTableId: username,
            username,
            notes: mergedNotes,
            deviceSyncs: updatedDeviceSyncs,
        });

        // Return the merged notes to the client
        return sendResponse({
            notes: mergedNotes,
            lastSyncedTime: currentTime,
        });
    } catch (err) {
        console.error('Error syncing notes:', err);
        return sendResponse({ message: 'Error processing sync request' }, 500);
    }
};
