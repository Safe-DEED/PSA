"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFilledBigUint64Array = getFilledBigUint64Array;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.compute = compute;
exports.getClientRequestObject = getClientRequestObject;
exports.getServerResponseObject = getServerResponseObject;

var _MatMul = require("./MatMul");

var _masking = require("./masking");

var _laplace = require("./laplace");

/**
 * Function to replace JSON.stringify since it does not offer marshalling of BigInts
 * @param value
 * @returns {string}
 */
function stringify(value) {
  if (value !== undefined) {
    return JSON.stringify(value, (_, v) => typeof v === 'bigint' ? `${v}n` : v);
  }
}
/**
 * Generate a zero-filled BigUint64Array
 * @param {number} length The size of the array
 * @param {number} value to be used to fill the array with
 * @returns {BigUint64Array}
 */


function getFilledBigUint64Array(length, value) {
  return BigUint64Array.from({
    length
  }, _ => BigInt(value));
}
/**
 * Get the special format for the indices
 * @param {number} numInnerArrays
 * @param {number} slotCount The SEAL encoder slot count
 * @param {number[]} vec
 * @returns {BigUint64Array[]}
 */


function getSpecialFormatIndicesVector(numInnerArrays, slotCount, vec) {
  const numberIndices = [];

  for (let i = 0; i < numInnerArrays; ++i) {
    const inner_array = getFilledBigUint64Array(slotCount, 0);
    const currentOffset = i * slotCount;

    for (let innerI = 0; innerI < slotCount; ++innerI) {
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
 * @param {number[]} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {string[]} an array of serialized ciphertexts
 */


function encrypt(inputArray, {
  compression,
  encoder,
  encryptor
}) {
  const numInnerArrays = getNumberOfInnerArrays(inputArray.length, encoder.slotCount);
  const numberIndices = getSpecialFormatIndicesVector(numInnerArrays, encoder.slotCount, inputArray);
  const ciphs = [];

  for (let i = 0; i < numInnerArrays; ++i) {
    const plainText = encoder.encode(numberIndices[i]); // Use the `encryptSerializable` function which generates a `Serializable` object
    // ready to be serialized. The benefit is about a 50% reduction in size,
    // but you cannot perform any HE operations until it is deserialized into
    // a proper CipherText instance.

    const cipherTextSerializable = encryptor.encryptSerializable(plainText);
    const cipherTextBase64 = cipherTextSerializable.save(compression);
    plainText.delete();
    cipherTextSerializable.delete();
    ciphs.push(cipherTextBase64);
  }

  return ciphs;
}
/**
 * Get the relevant parts from the input array
 * @param {BigUint64Array[]} arr
 * @param {number} slotCount
 * @returns {BigUint64Array[]}
 */


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
 * @param {string[]} encryptedResult 1D array of serialized ciphertexts received from server computation
 * @param {Object} clientContext client side context
 * @returns {BigUint64Array[]} resulting array
 */


function decrypt(encryptedResult, {
  seal,
  context,
  decryptor,
  encoder
}) {
  const resultVec = encryptedResult.map(encRes => {
    const cipherText = seal.CipherText();
    cipherText.load(context, encRes);
    const noiseBudget = decryptor.invariantNoiseBudget(cipherText);

    if (noiseBudget <= 0) {
      throw new Error('noise budget consumed: ' + noiseBudget);
    }

    const plainText = decryptor.decrypt(cipherText);
    const decoded = encoder.decodeBigInt(plainText);
    cipherText.delete();
    plainText.delete();
    return decoded;
  });
  return getRedundantPartsRemovedArray(resultVec, encoder.slotCount);
}
/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string[]} encryptedArray 1D array of serialized ciphertexts received from client
 * @param {BigInt} hw hamming weight
 * @param {number[]} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @returns {string[]} an array of serialized ciphertexts
 */


function compute(encryptedArray, hw, matrix, serverContext) {
  const {
    seal,
    context,
    encoder,
    evaluator,
    maskHW,
    maskBin
  } = serverContext;
  const slotCount = encoder.slotCount;
  const input = encryptedArray.map(input => {
    const cipherText = seal.CipherText();
    cipherText.load(context, input);
    return cipherText;
  });
  const [bsgsN1, bsgsN2] = (0, _MatMul.getBsgsParams)(slotCount);
  const N = matrix.length;
  const k = matrix[0].length;
  const output = (0, _MatMul.bigMatMul)(matrix, input, {
    N,
    k,
    bsgsN1,
    bsgsN2
  }, serverContext);
  const numCipherTexts = Math.ceil(2 * k / slotCount);
  let mask = null;

  if (serverContext.maskHW || serverContext.maskBin) {
    mask = (0, _masking.computeMask)(input, hw, numCipherTexts, serverContext);
  } //apply mask and noise


  for (let i = 0; i < numCipherTexts; ++i) {
    if (maskHW || maskBin) {
      //masking
      evaluator.add(output[i], mask[i], output[i]);
    }

    if (serverContext.diffPriv) {
      //noise
      const noisePlain = new BigInt64Array(slotCount);

      for (let s = 0; s < slotCount; ++s) {
        let b = serverContext.sensitivity / serverContext.epsilon;
        noisePlain[s] = BigInt(Math.round((0, _laplace.laplace)(1, 0, b)[0]));
      }

      const noise = seal.PlainText();
      encoder.encode(noisePlain, noise);
      evaluator.addPlain(output[i], noise, output[i]);
    }
  } // Clean up WASM instances


  input.forEach(x => x.delete());
  serverContext.galois.delete();
  return output.map(item => {
    const serialized = item.save(serverContext.compression);
    item.delete();
    return serialized;
  });
}
/**
 * This function returns the serialized galois key needed for rotations of the ciphertext.
 * @param {Object} clientContext client side context
 * @returns {string} base64 encoded galois key
 */


function getSerializedGaloisKeys(clientContext) {
  return clientContext.galoisKeys.save(clientContext.compression);
}
/**
 *
 * @param {string[]} encryptedArray
 * @param {BigInt} hw
 * @param {Object} options
 * @param {Object} options.compression
 * @param {Object} options.galoisKeys
 * @param serialize
 * @returns {Object | string}
 */


function getClientRequestObject(encryptedArray, hw, {
  compression,
  galoisKeys,
  relinKeys,
  maskBin
}, serialize) {
  const galois = galoisKeys.save(compression);
  let relin;

  if (maskBin) {
    relin = relinKeys.save(compression);
  }

  const obj = {
    encryptedArray,
    hw,
    galois,
    relin
  };
  return serialize ? stringify(obj) : obj;
}
/**
 * Stringify a server response
 * @param {string[]} computationResult
 * @param {boolean} serialize
 * @returns {Object | string}
 */


function getServerResponseObject(computationResult, serialize) {
  return serialize ? stringify(computationResult) : computationResult;
}