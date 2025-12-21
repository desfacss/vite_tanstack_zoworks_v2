export function camelCaseToTitleCase(str) {
    return str === 'hr' ? "HR" : str
        ?.replace(/([a-z])([A-Z])/g, '$1 $2') // Insert a space before each capital letter
        ?.replace(/^./, char => char?.toUpperCase()) // Capitalize the first letter of the string
        ?.replace(/ (\w)/g, (_, char) => ` ${char?.toUpperCase()}`); // Capitalize letters after spaces
}

export function snakeToTitleCase(snake: string): string {
  return snake
    ?.split('_') // Split at underscores
    ?.map(word => word?.charAt(0)?.toUpperCase() + word?.slice(1)?.toLowerCase()) // Capitalize each word
    ?.join(' '); // Join with spaces
}

