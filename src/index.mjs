import { createClientContext, createServerContext } from './HEutil';
import {
  getClientRequestObject,
  getServerResponseObject,
  compute,
  decrypt,
  encrypt
} from './apiUtil';

/**
 * This asynchronous function return the client context object.
 * @param {Object} psaConf an configuration object holding all configurations needed for execution (same as server config)
 * @param {number} psaConf.polyModulusDegree the polymodulus degree
 * @param {number} psaConf.plainModulusBitSize the bit size of the plaintext modulus prime that will be generated
 * @param {(128|192|256)} psaConf.securityLevel the security level in bits (default = 128)
 * @param {('none'|'zlib'|'zstd')} psaConf.compressionMode Optional compression mode for serialization (default = zstd)
 * @param {boolean} psaConf.maskHW whether Hamming weight masking should be applied
 * @param {BigInt} psaConf.minHW smallest allowed Hamming weight
 * @param {boolean} psaConf.maskBin whether binary masking should be applied
 * @returns {Object} a context object necessary for client side actions
 */
async function getClientContext({
  polyModulusDegree = 8192,
  plainModulusBitSize = 33,
  securityLevel = 128,
  compressionMode = 'zstd',
  maskHW = true,
  minHW = BigInt(100),
  maskBin = true,
  createGkIndices = true
}) {
  return await createClientContext(
    polyModulusDegree,
    plainModulusBitSize,
    securityLevel,
    compressionMode,
    maskHW,
    minHW,
    maskBin,
    createGkIndices
  );
}

/**
 * This asynchronous function return the server context object.
 * @param {Object} psaConf an configuration object holding all configurations needed for execution (same as client config)
 * @param {number} psaConf.polyModulusDegree the polymodulus degree
 * @param {number} psaConf.plainModulusBitSize the bit size of the plaintext modulus prime that will be generated
 * @param {(128|192|256)} psaConf.securityLevel the security level in bits (default = 128)
 * @param {('none'|'zlib'|'zstd')} psaConf.compressionMode Optional compression mode for serialization (default = zstd)
 * @param {boolean} psaConf.maskHW whether Hamming weight masking should be applied
 * @param {BigInt} psaConf.minHW smallest allowed Hamming weight
 * @param {boolean} psaConf.maskBin whether binary masking should be applied
 * @param {boolean} psaConf.diffPriv whether differential privacy should be applied
 *
 * @returns {Object} a context object necessary for client side actions
 */

async function getServerContext({
  polyModulusDegree = 8192,
  plainModulusBitSize = 33,
  securityLevel = 128,
  compressionMode = 'zstd',
  maskHW = true,
  minHW = BigInt(100),
  maskBin = true,
  createGkIndices = true,
  diffPriv = false,
  sensitivity = Number.MAX_SAFE_INTEGER / 2,
  epsilon = 1.0
}) {
  return await createServerContext(
    polyModulusDegree,
    plainModulusBitSize,
    securityLevel,
    compressionMode,
    maskHW,
    minHW,
    maskBin,
    createGkIndices,
    diffPriv,
    sensitivity,
    epsilon
  );
}

/**
 * This function encrypts the client's input vector and returns an object ready to be sent to the server.
 * @param {number[]} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @param {Object} serialize true if output should be stringified
 * @returns {Object | string} Context object in optionally unstringified form to be sent to server for serverCompute()
 */
function clientEncrypt(inputArray, clientContext, serialize = true) {
  const encryptedArray = encrypt(inputArray, clientContext);
  const hw = BigInt(
    clientContext.maskHW ? inputArray.reduce((a, b) => a + b, 0) : 0
  );
  return getClientRequestObject(encryptedArray, hw, clientContext, serialize);
}

/**
 * This function decrypts the server response object. The result will be in the first n cells, if the matrix was of dimension (m x n).
 * @param {Object | string} serverResponseObject server response object (JSON string or Object), received from the server
 * @param {Object} clientContext client side context
 * @returns {BigUint64Array[]} resulting array
 */
function clientDecrypt(serverResponseObject, clientContext) {
  const encryptedResult =
    typeof serverResponseObject === 'string'
      ? parse(serverResponseObject)
      : serverResponseObject;
  return decrypt(encryptedResult, clientContext);
}

/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string | Object} clientRequestObject client request object (JSON string or Object), received from client
 * @param {number[]} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @param {boolean} serialize true if output should be stringified
 * @returns {string | Object} Context object in optionally unstringified form to be sent to client for decryption with clientDecrypt()
 */

function serverCompute(
  clientRequestObject,
  matrix,
  serverContext,
  serialize = true
) {
  const seal = serverContext.seal;
  const context = serverContext.context;
  const { encryptedArray: arrayOfBase64EncodedCiphertexts, hw, galois, relin } =
    typeof clientRequestObject === 'string'
      ? parse(clientRequestObject)
      : clientRequestObject;

  if (serverContext.maskHW && hw < serverContext.minHW) {
    throw new Error('Client Hamming weight too small!');
  }

  const galoisKeys = seal.GaloisKeys();
  galoisKeys.load(context, galois);
  serverContext.galois = galoisKeys;

  if (serverContext.maskBin) {
    const relinKeys = seal.RelinKeys();
    relinKeys.load(context, relin);
    serverContext.relin = relinKeys;
  }

  const computationResult = compute(
    arrayOfBase64EncodedCiphertexts,
    hw,
    matrix,
    serverContext
  );

  return getServerResponseObject(computationResult, serialize);
}

/**
 * This function is a replacement for JSON.stringify() since it is missing the functionality
 * to stringify BigInts.
 * @param {Object} value the object to be stringified
 * @returns {string} the resulting JSON string
 */
function stringify(value) {
  if (value !== undefined) {
    return JSON.stringify(value, (_, v) =>
      typeof v === 'bigint' ? `${v}n` : v
    );
  }
}

/**
 * This function is a replacement for JSON.parse() and adds the functionality to parse BigInts,
 * since this is necessary for this protocol.
 * @param {string} text JSON string
 * @returns {Object} the parsed object
 */
function parse(text) {
  return JSON.parse(text, (_, value) => {
    if (typeof value === 'string') {
      const m = value.match(/(-?\d+)n/);
      if (m && m[0] === value) {
        value = BigInt(m[1]);
      }
    }
    return value;
  });
}

export default {
  getClientContext,
  getServerContext,
  clientEncrypt,
  clientDecrypt,
  serverCompute,
  parse,
  stringify
};
