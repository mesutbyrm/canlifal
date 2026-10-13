/**
 * Parse MP4 mvhd atom to extract duration in seconds.
 * Works with pure Buffer — no ffmpeg dependency.
 *
 * MP4 files are structured as a tree of "atoms" (boxes).
 * We need to find: moov → mvhd → read timescale + duration.
 */
export function getMp4DurationSec(buffer: Buffer): number | null {
  try {
    const mvhd = findAtom(buffer, 'mvhd')
    if (!mvhd) return null

    // mvhd version: 0 = 32-bit fields, 1 = 64-bit fields
    const version = mvhd.readUInt8(0)

    let timescale: number
    let duration: number

    if (version === 0) {
      // bytes 0: version (1) + flags (3) = 4
      // bytes 4: creation_time (4)
      // bytes 8: modification_time (4)
      // bytes 12: timescale (4)
      // bytes 16: duration (4)
      timescale = mvhd.readUInt32BE(12)
      duration = mvhd.readUInt32BE(16)
    } else {
      // version 1: 64-bit times
      // bytes 0: version (1) + flags (3) = 4
      // bytes 4: creation_time (8)
      // bytes 12: modification_time (8)
      // bytes 20: timescale (4)
      // bytes 24: duration (8)
      timescale = mvhd.readUInt32BE(20)
      // Read 64-bit duration (JS can handle up to 2^53)
      const high = mvhd.readUInt32BE(24)
      const low = mvhd.readUInt32BE(28)
      duration = high * 0x100000000 + low
    }

    if (timescale <= 0) return null
    return Math.round((duration / timescale) * 10) / 10
  } catch (e) {
    console.error('[mp4-duration] Parse error:', e)
    return null
  }
}

/**
 * Find an atom by type in MP4 buffer.
 * Recursively enters 'moov' container to find 'mvhd'.
 */
function findAtom(buffer: Buffer, targetType: string): Buffer | null {
  const containerTypes = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'meta'])
  let offset = 0

  while (offset + 8 <= buffer.length) {
    let size = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)

    // Handle size=0 (atom extends to EOF) and size=1 (64-bit extended size)
    let headerSize = 8
    if (size === 1 && offset + 16 <= buffer.length) {
      const high = buffer.readUInt32BE(offset + 8)
      const low = buffer.readUInt32BE(offset + 12)
      size = high * 0x100000000 + low
      headerSize = 16
    } else if (size === 0) {
      size = buffer.length - offset
    }

    if (size < headerSize || offset + size > buffer.length) break

    if (type === targetType) {
      // Return the data portion (after size + type header)
      return buffer.subarray(offset + headerSize, offset + size)
    }

    if (containerTypes.has(type)) {
      // Recurse into container atoms
      let innerOffset = headerSize
      // 'meta' has an extra 4-byte version/flags field
      if (type === 'meta') innerOffset += 4

      const inner = buffer.subarray(offset + innerOffset, offset + size)
      const found = findAtom(inner, targetType)
      if (found) return found
    }

    offset += size
  }

  return null
}
