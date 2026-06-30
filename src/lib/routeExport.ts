// Exporters for route data: GPX, KML, JSON
export interface ExportPoint {
  address: string;
  lat: number;
  lng: number;
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toGPX(coords: [number, number][], points: ExportPoint[]): string {
  const wpts = points
    .map(
      (p, i) =>
        `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${xmlEscape(
          `${i === 0 ? 'Origem' : i === points.length - 1 ? 'Destino' : `Parada ${i}`}: ${p.address}`,
        )}</name></wpt>`,
    )
    .join('\n');
  const trkpts = coords.map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}"/>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FreteCerto" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
  <trk><name>Rota FreteCerto</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

export function toKML(coords: [number, number][], points: ExportPoint[]): string {
  const placemarks = points
    .map(
      (p, i) => `    <Placemark>
      <name>${xmlEscape(
        `${i === 0 ? 'Origem' : i === points.length - 1 ? 'Destino' : `Parada ${i}`}: ${p.address}`,
      )}</name>
      <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
    </Placemark>`,
    )
    .join('\n');
  const lineCoords = coords.map(([lat, lng]) => `${lng},${lat},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Rota FreteCerto</name>
${placemarks}
    <Placemark>
      <name>Traçado</name>
      <LineString><tessellate>1</tessellate><coordinates>${lineCoords}</coordinates></LineString>
    </Placemark>
  </Document>
</kml>`;
}

export function toJSON(coords: [number, number][], points: ExportPoint[]): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'FreteCerto',
      waypoints: points,
      routeCoordinates: coords.map(([lat, lng]) => ({ lat, lng })),
    },
    null,
    2,
  );
}

export function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
