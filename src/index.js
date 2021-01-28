"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _HEutil = require("./HEutil");

var _masking = require("./masking");

var _apiUtil = require("./apiUtil");

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
  return await (0, _HEutil.createClientContext)(polyModulusDegree, plainModulusBitSize, securityLevel, compressionMode, maskHW, minHW, maskBin, createGkIndices);
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
  createGkIndices = true
}) {
  return await (0, _HEutil.createServerContext)(polyModulusDegree, plainModulusBitSize, securityLevel, compressionMode, maskHW, minHW, maskBin, createGkIndices);
}
/**
 * This function encrypts the client's input vector and returns an object ready to be sent to the server.
 * @param {number[]} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {string} JSON string to be sent to server without further processing for serverCompute()
 */


function clientEncrypt(inputArray, clientContext) {
  const encryptedArray = (0, _apiUtil.encrypt)(inputArray, clientContext);
  const hw = BigInt(clientContext.maskHW ? inputArray.reduce((a, b) => a + b, 0) : 0);
  return (0, _apiUtil.getClientRequestObject)(encryptedArray, hw, clientContext);
}
/**
 * This function decrypts the server response object. The result will be in the first n cells, if the matrix was of dimension (m x n).
 * @param {string} serverResponseObject server response object (JSON), received from the server
 * @param {Object} clientContext client side context
 * @returns {BigUint64Array[]} resulting array
 */


function clientDecrypt(serverResponseObject, clientContext) {
  const encryptedResult = JSON.parse(serverResponseObject);
  return (0, _apiUtil.decrypt)(encryptedResult, clientContext);
}
/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string} clientRequestObject client request object (JSON), received from client
 * @param {number[]} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @returns {string} JSON to be sent to client for decryption with clientDecrypt()
 */


function serverCompute(clientRequestObject, matrix, serverContext) {
  const seal = serverContext.seal;
  const encoder = serverContext.encoder;
  const slotCount = encoder.slotCount;
  const context = serverContext.context;
  const {
    encryptedArray: arrayOfBase64EncodedCiphertexts,
    hw,
    galois,
    relin
  } = (0, _apiUtil.parse)(clientRequestObject);

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

  const arrayOfCiphertexts = [];
  arrayOfBase64EncodedCiphertexts.forEach(base64encodedCipherText => {
    const cipherText = serverContext.seal.CipherText();
    cipherText.load(serverContext.context, base64encodedCipherText);
    arrayOfCiphertexts.push(cipherText);
  });
  let mask = null;

  if (serverContext.maskHW || serverContext.maskBin) {
    const k = matrix[0].length;
    const numCipherTexts = Math.ceil(2 * k / slotCount);
    mask = (0, _masking.computeMask)(arrayOfCiphertexts, hw, numCipherTexts, serverContext);
  }

  const computationResult = (0, _apiUtil.compute)(arrayOfBase64EncodedCiphertexts, mask, galois, matrix, serverContext);
  return (0, _apiUtil.getServerResponseObject)(computationResult);
}

var _default = {
  getClientContext,
  getServerContext,
  clientEncrypt,
  clientDecrypt,
  serverCompute
};
exports.default = _default;
module.exports = exports.default;