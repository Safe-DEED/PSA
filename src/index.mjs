import { createClientHEContext, createServerHEContext } from './HEutil'
import { bigMatMul, getBsgsParams } from './MatMul'

/**
 * This asynchronous function return the client context object.
 * @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulusBitSize the bit size of the plaintext modulus prime that will be generated
 * @param {(128|192|256)} [securityLevel=128] the security level in bits (default = 128)
 * @param {('none'|'zlib'|'zstd')} [compressionMode='zstd'] Optional compression mode for serialization (default = zstd)
 * @returns {Object} a context object necessary for client side actions
 */
async function getClientContext({
  polyModulusDegree,
  plainModulusBitSize,
  securityLevel = 128,
  compressionMode = 'zstd'
}) {
  return await createClientHEContext(
    polyModulusDegree,
    plainModulusBitSize,
    securityLevel,
    compressionMode
  )
}

/**
 * This asynchronous function return the server context object.
 * @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulusBitSize the bit size of the plaintext modulus prime that will be generated
 * @param {(128|192|256)} [securityLevel=128] the security level in bits (default = 128)
 * @param {('none'|'zlib'|'zstd')} [compressionMode='zstd'] Optional compression mode for serialization (default = zstd)
 * @returns {Object} a context object necessary for client side actions
 */
async function getServerContext({
  polyModulusDegree,
  plainModulusBitSize,
  securityLevel = 128,
  compressionMode = 'zstd'
}) {
  return await createServerHEContext(
    polyModulusDegree,
    plainModulusBitSize,
    securityLevel,
    compressionMode
  )
}

/**
 * Generate a zero-filled BigUint64Array
 * @param {number} length The size of the array
 * @returns {BigUint64Array}
 */
function getZeroFilledBigUint64Array(length) {
  return BigUint64Array.from({ length }, _ => BigInt(0))
}

/**
 * Get the special format for the indices
 * @param {number} numInnerArrays
 * @param {number} slotCount The SEAL encoder slot count
 * @param {number[]} vec
 * @returns {BigUint64Array[]}
 */
function getSpecialFormatIndicesVector(numInnerArrays, slotCount, vec) {
  const numberIndices = []
  for (let i = 0; i < numInnerArrays; ++i) {
    const inner_array = getZeroFilledBigUint64Array(slotCount)
    const currentOffset = i * slotCount
    for (let innerI = 0; innerI < slotCount; ++innerI) {
      if (currentOffset + innerI < vec.length) {
        inner_array[innerI] = BigInt(vec[currentOffset + innerI])
      } else {
        break
      }
    }
    numberIndices.push(inner_array)
  }
  return numberIndices
}

function getNumberOfInnerArrays(numberOfIdentities, slotCount) {
  return Math.ceil(numberOfIdentities / slotCount)
}

/**
 * This function encrypts the client's input vector and returns an array of ciphertexts.
 * @param {number[]} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {string[]} an array of ciphertexts
 */
function encrypt(inputArray, { compression, encoder, encryptor }) {
  const numInnerArrays = getNumberOfInnerArrays(
    inputArray.length,
    encoder.slotCount
  )
  const numberIndices = getSpecialFormatIndicesVector(
    numInnerArrays,
    encoder.slotCount,
    inputArray
  )

  const ciphs = []
  for (let i = 0; i < numInnerArrays; ++i) {
    const plainText = encoder.encode(numberIndices[i])
    // Use the `encryptSerializable` function which generates a `Serializable` object
    // ready to be serialized. The benefit is about a 50% reduction in size,
    // but you cannot perform any HE operations until it is deserialized into
    // a proper CipherText instance.
    const cipherTextSerializable = encryptor.encryptSerializable(plainText)
    const cipherTextBase64 = cipherTextSerializable.save(compression)
    plainText.delete()
    cipherTextSerializable.delete()
    ciphs.push(cipherTextBase64)
  }

  return ciphs
}

/**
 * This function encrypts the client's input vector and returns an object ready to be sent to the server.
 * @param {number[]} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {string} JSON to be sent to server without further processing
 */
function encryptForClientRequest(inputArray, clientContext) {
  const encryptedArray = encrypt(inputArray, clientContext)
  return getClientRequestObject(encryptedArray, clientContext)
}

/**
 * Get the relevant parts from the input array
 * @param {bigint[]} arr
 * @param {number} slotCount
 * @returns {bigint[]}
 */
function getRedundantPartsRemovedArray(arr, slotCount) {
  const flatArray = []
  for (let i = 0; i < arr.length; ++i) {
    for (let j = 0; j < slotCount / 2; ++j) {
      flatArray.push(arr[i][j])
    }
  }
  return flatArray
}

/**
 * This function decrypts the computed result vector. The result will be in the first n cells, if the matrix was of dimension (m x n).
 * @param {string[]} encryptedResult 1D array of serialized ciphertexts received from server computation
 * @param {Object} clientContext client side context
 * @returns {number[]} resulting array
 */
function decrypt(encryptedResult, { seal, context, decryptor, encoder }) {
  const resultVec = encryptedResult.map(encRes => {
    const cipherText = seal.CipherText()
    cipherText.load(context, encRes)

    const noiseBudget = decryptor.invariantNoiseBudget(cipherText)
    if (noiseBudget <= 0) {
      throw new Error('noise budget consumed: ' + noiseBudget)
    }

    const plainText = decryptor.decrypt(cipherText)
    const decoded = encoder.decodeBigInt(plainText, false)
    cipherText.delete()
    plainText.delete()
    return decoded
  })

  return getRedundantPartsRemovedArray(resultVec, encoder.slotCount)
}

/**
 * This function decrypts the server response object. The result will be in the first n cells, if the matrix was of dimension (m x n).
 * @param {string} serverResponseObject server response object (JSON), received from the server
 * @param {Object} clientContext client side context
 * @returns {number[]} resulting array
 */
function decryptServerResponseObject(serverResponseObject, clientContext) {
  const encryptedResult = JSON.parse(serverResponseObject)
  return decrypt(encryptedResult, clientContext)
}

/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string[]} encryptedArray 1D array of serialized ciphertexts received from client
 * @param {string} serializedGaloisKeys base64 encoded galois key
 * @param {number[]} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @returns {string[]} an array of serialized ciphertexts
 */
function compute(encryptedArray, serializedGaloisKeys, matrix, serverContext) {
  const { seal, context, encoder } = serverContext
  const galoisKeys = seal.GaloisKeys()
  galoisKeys.load(context, serializedGaloisKeys)
  serverContext.galois = galoisKeys

  const input = encryptedArray.map(inpt => {
    const cipherText = seal.CipherText()
    cipherText.load(context, inpt)
    return cipherText
  })

  const [bsgsN1, bsgsN2] = getBsgsParams(encoder.slotCount)

  const N = matrix.length
  const k = matrix[0].length

  const output = bigMatMul(
    matrix,
    input,
    { N, k, bsgsN1, bsgsN2 },
    serverContext
  )
  const serialized = output.map(item => item.save(serverContext.compression))
  // Clean up WASM instances
  input.forEach(x => x.delete())
  output.forEach(x => x.delete())
  return serialized
}

/**
 * This function returns the serialized galois key needed for rotations of the ciphertext.
 * @param {Object} clientContext client side context
 * @returns {string} base64 encoded galois key
 */
function getSerializedGaloisKeys(clientContext) {
  return clientContext.galoisKeys.save(clientContext.compression)
}

/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string} clientRequestObject client request object (JSON), received from client
 * @param {number[]} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @returns {string} JSON to be sent to client for decryption
 */
function computeWithClientRequestObject(
  clientRequestObject,
  matrix,
  serverContext
) {
  const { arr, galois } = JSON.parse(clientRequestObject)
  const computationResult = compute(arr, galois, matrix, serverContext)
  return getServerResponseObject(computationResult)
}

/**
 *
 * @param {string[]} encryptedArray
 * @param {Object} options
 * @param {Object} options.compression
 * @param {Object} options.galoisKeys
 * @returns {string}
 */
function getClientRequestObject(encryptedArray, { compression, galoisKeys }) {
  const galois = galoisKeys.save(compression)
  return JSON.stringify({ arr: encryptedArray, galois })
}

/**
 * Stringify a server response
 * @param {string[]} computationResult
 * @returns {string}
 */
function getServerResponseObject(computationResult) {
  return JSON.stringify(computationResult)
}

export default {
  getClientContext,
  getServerContext,
  encrypt,
  encryptForClientRequest,
  decrypt,
  decryptServerResponseObject,
  compute,
  computeWithClientRequestObject,
  getSerializedGaloisKeys
}
