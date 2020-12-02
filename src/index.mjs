import { createClientHEContext, createServerHEContext } from './HEutil'
import { bigMatMul, getBsgsParams } from './MatMul'

/**
 * This asynchronous function return the client context object.
 * @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulus the plaintext modulus
 * @returns {Object} a context object necessary for client side actions
 */
async function getClientContext(polyModulusDegree, plainModulus) {
  return await createClientHEContext(polyModulusDegree, plainModulus)
}

/**
 * This asynchronous function return the server context object.
 *  @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulus the plaintext modulus
 * @returns {Object} a context object necessary for client side actions
 */
async function getServerContext(polyModulusDegree, plainModulus) {
  return await createServerHEContext(polyModulusDegree, plainModulus)
}

function getZeroFilledBigUint64Array(length) {
  return BigUint64Array.from({ length }, _ => BigInt(0))
}

function getSpecialFormatIndicesVector(numInnerArrays, encoder, vec) {
  const numberIndices = []
  for (let i = 0; i < numInnerArrays; ++i) {
    const inner_array = getZeroFilledBigUint64Array(encoder.slotCount)
    const currentOffset = i * encoder.slotCount
    for (let innerI = 0; innerI < encoder.slotCount; ++innerI) {
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
 * @param {array<number>} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {array<CipherText>} an array of ciphertexts
 */
function encrypt(inputArray, { encoder, encryptor }) {
  const numInnerArrays = getNumberOfInnerArrays(
    inputArray.length,
    encoder.slotCount
  )
  const numberIndices = getSpecialFormatIndicesVector(
    numInnerArrays,
    encoder,
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
    const cipherTextBase64 = cipherTextSerializable.save()
    plainText.delete()
    cipherTextSerializable.delete()
    ciphs.push(cipherTextBase64)
  }

  return ciphs
}

/**
 * This function encrypts the client's input vector and returns an object ready to be sent to the server.
 * @param {array<number>} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {string} JSON to be sent to server without further processing
 */
function encryptForClientRequest(inputArray, clientContext) {
  const encryptedArray = encrypt(inputArray, clientContext)
  return getClientRequestObject(encryptedArray, clientContext)
}

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
 * @param {array<CipherText>} encryptedResult 1D array of ciphertexts received from server computation
 * @param {Object} clientContext client side context
 * @returns {array<number>} resulting array
 */
function decrypt(encryptedResult, { morfix, context, decryptor, encoder }) {
  const resultVec = encryptedResult.map(encRes => {
    const cipherText = morfix.CipherText()
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
 * @returns {array<number>} resulting array
 */
function decryptServerResponseObject(serverResponseObject, clientContext) {
  const encryptedResult = JSON.parse(serverResponseObject)
  return decrypt(encryptedResult, clientContext)
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
  const { morfix, context, encoder } = serverContext
  const galoisKeys = morfix.GaloisKeys()
  galoisKeys.load(context, serializedGaloisKeys)
  serverContext.galois = galoisKeys

  const input = encryptedArray.map(inpt => {
    const cipherText = morfix.CipherText()
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
  // cleanup
  input.forEach(x => x.delete())
  return output.map(item => item.save())
}

/**
 * This function returns the serialized galois key needed for rotations of the ciphertext.
 * @param {Object} clientContext client side context
 * @returns {string} base64 encoded galois key
 */
function getSerializedGaloisKeys(clientContext) {
  return clientContext.galoisKeys.save()
}

/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string} clientRequestObject client request object (JSON), received from client
 * @param {array<number>} matrix a 2D array of Numbers.
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

function getClientRequestObject(encryptedArray, { galoisKeys }) {
  const galois = galoisKeys.save()
  return JSON.stringify({ arr: encryptedArray, galois })
}

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
