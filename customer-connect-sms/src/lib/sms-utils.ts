export function smsSegments(body: string): { chars: number; segments: number; limit: number } {
  // GSM-7 default alphabet detection is complex; approximate:
  // If any char is outside basic Latin, treat as UCS-2.
  const isUcs2 = /[^\x00-\x7F]/.test(body);
  const perSegment = isUcs2 ? 70 : 160;
  const perSegmentConcat = isUcs2 ? 67 : 153;
  const len = [...body].length;
  const segments = len === 0 ? 0 : len <= perSegment ? 1 : Math.ceil(len / perSegmentConcat);
  return { chars: len, segments, limit: perSegment };
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}
