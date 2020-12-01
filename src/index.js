"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _HEutil = require("./HEutil");

var _MatMul = require("./MatMul");

/**
 * This asynchronous function return the client context object.
 * @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulus the plaintext modulus
 * @returns {Object} a context object necessary for client side actions
 */
async function getClientContext(polyModulusDegree, plainModulus) {
  return await (0, _HEutil.createClientHEContext)(polyModulusDegree, plainModulus);
}
/**
 * This asynchronous function return the server context object.
 *  @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulus the plaintext modulus
 * @returns {Object} a context object necessary for client side actions
 */


async function getServerContext(polyModulusDegree, plainModulus) {
  return await (0, _HEutil.createServerHEContext)(polyModulusDegree, plainModulus);
}

function getZeroFilledBigUint64Array(length) {
  return new BigUint64Array(length).fill(BigInt(0));
}

function getSpecialFormatIndicesVector(numInnerArrays, encoder, vec) {
  const numberIndices = [];

  for (let i = 0; i < numInnerArrays; ++i) {
    const inner_array = getZeroFilledBigUint64Array(encoder.slotCount);
    const currentOffset = i * encoder.slotCount;

    for (let innerI = 0; innerI < encoder.slotCount; ++innerI) {
      if (currentOffset + innerI < vec.length) {
        inner_array[innerI] = BigInt(vec[currentOffset + innerI]);
      } else {
        break;
      }
    }

    numberIndices.push(inner_array);
  }

  return numberIndices;
}

function getNumberOfInnerArrays(numberOfIdentities, slotCount) {
  return Math.ceil(numberOfIdentities / slotCount);
}
/**
 * This function encrypts the client's input vector and returns an array of ciphertexts.
 * @param {array<number>} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {array<CipherText>} an array of ciphertexts
 */


function encrypt(inputArray, clientContext) {
  const encoder = clientContext.encoder;
  const encryptor = clientContext.encryptor;
  const numInnerArrays = getNumberOfInnerArrays(inputArray.length, encoder.slotCount);
  const numberIndices = getSpecialFormatIndicesVector(numInnerArrays, encoder, inputArray);
  const ciphs = [];

  for (let i = 0; i < numInnerArrays; ++i) {
    const plainText = encoder.encode(numberIndices[i]);
    const cipherText = encryptor.encrypt(plainText);
    const cipherTextBase64 = cipherText.save();
    ciphs.push(cipherTextBase64);
    plainText.delete();
    cipherText.delete();
  }

  return ciphs;
}
/**
 * This function encrypts the client's input vector and returns an object ready to be sent to the server.
 * @param {array<number>} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {string} JSON to be sent to server without further processing
 */


function encryptForClientRequest(inputArray, clientContext) {
  const encryptedArray = encrypt(inputArray, clientContext);
  return getClientRequestObject(encryptedArray, clientContext);
}

function getRedundantPartsRemovedArray(arr, slotCount) {
  const flatArray = [];

  for (let i = 0; i < arr.length; ++i) {
    for (let j = 0; j < slotCount / 2; ++j) {
      flatArray.push(arr[i][j]);
    }
  }

  return flatArray;
}
/**
 * This function decrypts the computed result vector. The result will be in the first n cells, if the matrix was of dimension (m x n).
 * @param {array<CipherText>} encryptedResult 1D array of ciphertexts received from server computation
 * @param {Object} clientContext client side context
 * @returns {array<number>} resulting array
 */


function decrypt(encryptedResult, {
  morfix,
  context,
  decryptor,
  encoder
}) {
  const resultVec = [];
  encryptedResult.forEach(encRes => {
    const cipherText = morfix.CipherText();
    cipherText.load(context, encRes);
    const plainText = morfix.PlainText();
    const noiseBudget = decryptor.invariantNoiseBudget(cipherText);

    if (noiseBudget <= 0) {
      throw new Error('noise budget consumed: ' + noiseBudget);
    }

    decryptor.decrypt(cipherText, plainText);
    resultVec.push(encoder.decodeBigInt(plainText, false));
    cipherText.delete();
    plainText.delete();
  });
  return getRedundantPartsRemovedArray(resultVec, encoder.slotCount);
}
/**
 * This function decrypts the server response object. The result will be in the first n cells, if the matrix was of dimension (m x n).
 * @param {string} serverResponseObject server response object (JSON), received from the server
 * @param {Object} clientContext client side context
 * @returns {array<number>} resulting array
 */


function decryptServerResponseObject(serverResponseObject, clientContext) {
  const encryptedResult = JSON.parse(serverResponseObject);
  return decrypt(encryptedResult, clientContext);
}
/**
 * This function returns the serialized galois key needed for rotations of the ciphertext.
 * @param {Object} clientContext client side context
 * @returns {string} base64 encoded galois key
 */


function getSerializedGaloisKeys(clientContext) {
  return clientContext.galoisKeys.save();
}
/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {array<CipherText>} encryptedArray 1D array of ciphertexts received from client
 * @param {string} serializedGaloisKeys base64 encoded galois key
 * @param {array<number>} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @returns {array<CipherText>} an array of ciphertexts
 */


function compute(encryptedArray, serializedGaloisKeys, matrix, serverContext) {
  const {
    morfix,
    context,
    encoder
  } = serverContext;
  const galoisKeys = morfix.GaloisKeys();
  galoisKeys.load(context, serializedGaloisKeys);
  serverContext.galois = galoisKeys;
  const input = encryptedArray.map(inpt => {
    const cipherText = morfix.CipherText();
    cipherText.load(context, inpt);
    return cipherText;
  });
  const [bsgsN1, bsgsN2] = (0, _MatMul.getBsgsParams)(encoder.slotCount);
  const N = matrix.length;
  const k = matrix[0].length;
  const output = (0, _MatMul.bigMatMul)(matrix, input, {
    N,
    k,
    bsgsN1,
    bsgsN2
  }, serverContext); // cleanup

  input.forEach(x => x.delete());
  return output.map(item => item.save());
}
/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string} clientRequestObject client request object (JSON), received from client
 * @param {array<number>} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @returns {string} JSON to be sent to client for decryption
 */


function computeWithClientRequestObject(clientRequestObject, matrix, serverContext) {
  const {
    arr,
    galois
  } = JSON.parse(clientRequestObject);
  const computationResult = compute(arr, galois, matrix, serverContext);
  return getServerResponseObject(computationResult);
}

function getClientRequestObject(encryptedArray, {
  galoisKeys
}) {
  const galois = galoisKeys.save();
  return JSON.stringify({
    arr: encryptedArray,
    galois
  });
}

function getServerResponseObject(computationResult) {
  return JSON.stringify(computationResult);
}

var _default = {
  getClientContext,
  getServerContext,
  encrypt,
  encryptForClientRequest,
  decrypt,
  decryptServerResponseObject,
  compute,
  computeWithClientRequestObject,
  getSerializedGaloisKeys
};
exports.default = _default;
module.exports = exports.default;