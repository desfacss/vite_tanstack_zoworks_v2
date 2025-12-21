export const serverErrorParsing = (errorMessage) => {
    // Regex to match foreign key constraint errors
    const foreignKeyRegex = /update or delete on table "(.*?)" violates foreign key constraint ".*?" on table "(.*?)"/;
    const uuidRegex = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;

    // Check for foreign key constraint errors
    const match = errorMessage.match(foreignKeyRegex);
    if (match) {
        let [_, parentTable, childTable] = match;

        // If parentTable ends with 's', remove the trailing 's'
        if (parentTable.endsWith('s')) {
            parentTable = parentTable.slice(0, -1);
        }

        return `This ${parentTable} cannot be deleted because it has linked ${childTable}.`;
    }

    // Remove UUIDs from the error message if present
    const sanitizedMessage = errorMessage.replace(uuidRegex, '[ID]');
    return sanitizedMessage;
};