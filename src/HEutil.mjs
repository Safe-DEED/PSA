import SEAL from 'node-seal/allows_wasm_node_umd';
import { getBsgsParams } from './MatMul';

/**
 * Creates a SEAL context
 * @param {number} polyModulusDegree
 * @param {number} securityLevel
 * @param {number} plainModulusBitSize
 * @returns {Promise<[Object, Object]>}
 */
async function createHEContext(
  polyModulusDegree,
  securityLevel,
  plainModulusBitSize
) {
  const seal = await SEAL();

  const schemeType = seal.SchemeType.bfv;
  const secLevel = getSecurityLevel(securityLevel, seal);

  const parms = seal.EncryptionParameters(schemeType);

  // Set the PolyModulusDegree
  parms.setPolyModulusDegree(polyModulusDegree);

  // Create a suitable set of CoeffModulus primes.
  // We use the default helper
  const coeffModulus = seal.CoeffModulus.BFVDefault(
    polyModulusDegree,
    secLevel
  );
  parms.setCoeffModulus(coeffModulus);
  coeffModulus.delete();

  // Create and set the PlainModulus to a prime of bitSize
  const plainModulus = seal.PlainModulus.Batching(
    polyModulusDegree,
    plainModulusBitSize
  );
  parms.setPlainModulus(plainModulus);
  plainModulus.delete();

  const context = seal.Context(
    parms, // Encryption Parameters
    true, // ExpandModChain
    secLevel // Enforce a security level
  );
  parms.delete();

  if (!context.parametersSet()) {
    throw new Error(
      'Could not set the parameters in the given context. Please try different encryption parameters.'
    );
  }

  return [seal, context];
}

export function createGks(slotCount, masking = true) {
  const gks = [0, 1];
  const [bsgs1, bsgs2] = getBsgsParams(slotCount);

  for (let l = 1; l < bsgs2; l++) {
    gks.push(l * bsgs1);
  }

  if (masking) {
    let rotIndex = 2;
    while (rotIndex < slotCount >> 1) {
      gks.push(rotIndex);
      rotIndex *= 2;
    }
  }

  return gks;
}

/**
 * Create a client context
 * @param {number} polyModulusDegree
 * @param {number} plainModulus
 * @param {number} securityLevel
 * @param {string} compressionMode
 * @param {boolean} maskHW
 * @param {BigInt} minHW
 * @param {boolean} maskBin
 * @param {boolean} createGkIndices
 * @returns {Promise<Object>}
 */
export async function createClientContext(
  polyModulusDegree,
  plainModulus,
  securityLevel,
  compressionMode,
  maskHW,
  minHW,
  maskBin,
  createGkIndices
) {
  const [seal, context] = await createHEContext(
    polyModulusDegree,
    securityLevel,
    plainModulus
  );

  const encoder = seal.BatchEncoder(context);
  const keyGenerator = seal.KeyGenerator(context);
  const publicKey = keyGenerator.createPublicKey();
  const secretKey = keyGenerator.secretKey();
  // Use the `createGaloisKeysSerializable` function which generates a `Serializable` object
  // ready to be serialized. The benefit is about a 50% reduction in size,
  // but you cannot perform any HE operations until it is deserialized into
  // a proper GaloisKeys instance.
  let gks;
  if (createGkIndices) {
    gks = createGkIndices
      ? Int32Array.from(createGks(encoder.slotCount, maskHW || maskBin))
      : new Int32Array(0);
  }
  const galoisKeys = keyGenerator.createGaloisKeysSerializable(gks);
  const relinKeys = maskBin ? keyGenerator.createRelinKeysSerializable() : null;
  const encryptor = seal.Encryptor(context, publicKey);
  const decryptor = seal.Decryptor(context, secretKey);
  const evaluator = seal.Evaluator(context);
  const compression = getComprModeType(compressionMode, seal);

  return {
    seal,
    compression,
    context,
    encoder,
    keyGenerator,
    publicKey,
    secretKey,
    galoisKeys,
    relinKeys,
    encryptor,
    decryptor,
    evaluator,
    maskHW,
    minHW,
    maskBin
  };
}

/**
 * Create a server context
 * @param {number} polyModulusDegree
 * @param {number} plainModulus
 * @param {number} securityLevel
 * @param {string} compressionMode
 * @param {boolean}maskHW
 * @param {BigInt} minHW
 * @param {boolean}maskBin
 * @returns {Promise<Object>}
 */
export async function createServerContext(
  polyModulusDegree,
  plainModulus,
  securityLevel,
  compressionMode,
  maskHW,
  minHW,
  maskBin
) {
  const [seal, context] = await createHEContext(
    polyModulusDegree,
    securityLevel,
    plainModulus
  );
  const encoder = seal.BatchEncoder(context);
  const evaluator = seal.Evaluator(context);
  const compression = getComprModeType(compressionMode, seal);

  return {
    seal,
    compression,
    context,
    encoder,
    evaluator,
    maskHW,
    minHW,
    maskBin
  };
}

/**
 * Gets the SEAL security enum from a number mapping
 * @param {number} securityLevel
 * @param {Object} options
 * @param {Object} options.SecurityLevel
 * @returns {Object}
 */
function getSecurityLevel(securityLevel, { SecurityLevel }) {
  switch (securityLevel) {
    case 128:
      return SecurityLevel.tc128;
    case 192:
      return SecurityLevel.tc192;
    case 256:
      return SecurityLevel.tc256;
    default:
      return SecurityLevel.tc128;
  }
}

/**
 * Gets the SEAL compression enum from a string mapping
 * @param {string} compression
 * @param {Object} options
 * @param {Object} options.ComprModeType
 * @returns {Object}
 */
export function getComprModeType(compression, { ComprModeType }) {
  switch (compression) {
    case 'none':
      return ComprModeType.none;
    case 'zlib':
      return ComprModeType.zlib;
    case 'zstd':
      return ComprModeType.zstd;
    default:
      return ComprModeType.zstd;
  }
}
