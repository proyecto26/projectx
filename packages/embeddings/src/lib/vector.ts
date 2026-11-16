/** Scales `vector` to unit length in place and returns it. */
export function normalize(vector: Float32Array): Float32Array {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum);
  if (norm === 0 || !Number.isFinite(norm)) {
    throw new RangeError("Cannot normalize a zero or non-finite vector");
  }
  for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  return vector;
}

/** Matryoshka truncation: the first `dims` values, re-normalized. */
export function truncate(vector: Float32Array, dims: number): Float32Array {
  if (!Number.isInteger(dims) || dims < 1 || dims > vector.length) {
    throw new RangeError(
      `Cannot truncate ${vector.length} dimensions to ${dims}`,
    );
  }
  return normalize(vector.slice(0, dims));
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new RangeError(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb);
}
