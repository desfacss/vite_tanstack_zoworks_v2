/**
 * Simple WKB (Well-Known Binary) Hex to GeoJSON Parser
 * Focused on PostGIS SRID 4326 Geometries (Polygons/Points)
 */
export function parseWkb(hex: string): any {
  if (!hex || typeof hex !== 'string') return hex;
  
  // If it doesn't look like a hex string, it might already be WKT/GeoJSON
  if (!/^[0-9A-Fa-f]+$/.test(hex)) return hex;

  try {
    const binary = hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16));
    const bytes = new Uint8Array(binary);
    const view = new DataView(bytes.buffer);
    let offset = 0;

    const endian = view.getUint8(offset++);
    const isLittle = endian === 1;

    const readUint32 = (off: number) => view.getUint32(off, isLittle);
    const readFloat64 = (off: number) => view.getFloat64(off, isLittle);

    const typeRes = readUint32(offset);
    offset += 4;

    const hasSrid = (typeRes & 0x20000000) !== 0;
    const geometryType = typeRes & 0x0fffffff;

    if (hasSrid) offset += 4; // Skip SRID

    if (geometryType === 3) { // Polygon
      const numRings = readUint32(offset);
      offset += 4;
      const rings = [];
      for (let i = 0; i < numRings; i++) {
        const numPoints = readUint32(offset);
        offset += 4;
        const points = [];
        for (let j = 0; j < numPoints; j++) {
          const x = readFloat64(offset); offset += 8;
          const y = readFloat64(offset); offset += 8;
          points.push([x, y]);
        }
        rings.push(points);
      }
      return { type: 'Polygon', coordinates: rings };
    }
    
    if (geometryType === 1) { // Point
      const x = readFloat64(offset); offset += 8;
      const y = readFloat64(offset); offset += 8;
      return { type: 'Point', coordinates: [x, y] };
    }
  } catch (err) {
    console.error('WKB Parsing Error:', err);
  }
  
  return hex;
}
