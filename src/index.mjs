import { createClientHEContext, createServerHEContext } from './HEutil'
import { bigMatMul, getBsgsParams } from './MatMul'
import crypto from 'crypto';
/**
 * This asynchronous function return the client context object.
 * @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulusBitSize the bit size of the plaintext modulus prime that will be generated
 * @param {(128|192|256)} [securityLevel=128] the security level in bits (default = 128)
 * @param {('none'|'zlib'|'zstd')} [compressionMode='zstd'] Optional compression mode for serialization (default = zstd)
 * @param {Int32Array} galoisSteps
 * @returns {Object} a context object necessary for client side actions
 */
async function getClientContext({
  polyModulusDegree,
  plainModulusBitSize,
  securityLevel = 128,
  compressionMode = 'zstd',
  galoisSteps
}) {
  return await createClientHEContext(
    polyModulusDegree,
    plainModulusBitSize,
    securityLevel,
    compressionMode,
    galoisSteps
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
 * @param {number} value to be used to fill the array with
 * @returns {BigUint64Array}
 */
function getFilledBigUint64Array(length, value) {
  return BigUint64Array.from({ length }, _ => BigInt(value))
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
    const inner_array = getFilledBigUint64Array(slotCount, 0)
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
 * @returns {string[]} an array of serialized ciphertexts
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
 * @param {number} w the hamming weight of the input vector
 * @param {Object} clientContext client side context
 * @returns {string} JSON to be sent to server without further processing
 */
function encryptForClientRequest(inputArray, hw, clientContext) {
  const encryptedArray = encrypt(inputArray, clientContext)
  return getClientRequestObject(encryptedArray, hw, clientContext)
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
function compute(encryptedArray, mask, serializedGaloisKeys, matrix, serverContext) {
  const { seal, context, encoder, evaluator } = serverContext

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

  //apply mask
  const numCipherTexts = Math.ceil((2 * k) / encoder.slotCount);
  for (let i = 0; i < numCipherTexts; ++i){
    evaluator.add(output[i], mask[i], output[i]);
  }

  // Clean up WASM instances
  input.forEach(x => x.delete())
  serverContext.galois.delete()
  return output.map(item => {
    const serialized = item.save(serverContext.compression)
    item.delete()
    return serialized
  })
}

/**
 * This function returns the serialized galois key needed for rotations of the ciphertext.
 * @param {Object} clientContext client side context
 * @returns {string} base64 encoded galois key
 */
function getSerializedGaloisKeys(clientContext) {
  return clientContext.galoisKeys.save(clientContext.compression)
}

//same as dot product with one dot1
function sumElements(input, serverContext){
  const seal = serverContext.seal;
  const evaluator = serverContext.evaluator;
  const encoder = serverContext.encoder;
  const slotCount = encoder.slotCount;
  const galoisKeys = serverContext.galoisKeys;



  const rotated = seal.CipherText();
  let rotIndex = 1;
  while(rotIndex < (slotCount >> 1)){
    evaluator.rotateRows(input, rotIndex, galoisKeys, rotated);
    evaluator.add(input, rotated, input);
    rotIndex *= 2;
  }
  evaluator.rotateColumns(input, galoisKeys, rotated);
  evaluator.add(input, rotated, input);

  //return ciphertext
}



function computeMaskHW(arrayOfCiphertexts, hw, serverContext){
  const seal = serverContext.seal;
  const evaluator = serverContext.evaluator;
  const encoder = serverContext.encoder;
  const galoisKeys = serverContext.galois;

  const W = seal.PlainText();
  const bigUintArrayFilledWithHW = new BigUint64Array(encoder.slotCount).fill(BigInt(hw));
  encoder.encode(bigUintArrayFilledWithHW, W);

  let tmp = [];
  arrayOfCiphertexts.forEach(ciphertext => {
    tmp.push(evaluator.sumElements(ciphertext, galoisKeys, seal.SchemeType.bfv));
  });

  const mask = seal.CipherText();
  mask.copy(tmp[0]);
  for(let i=1; i<arrayOfCiphertexts.length; i++){
    evaluator.add(tmp[i], mask, mask);
    tmp[i].delete();
  }
  tmp[0].delete();

  evaluator.subPlain(mask, W, mask);
  W.delete();

  return mask;
}

function computePartBinMask(arrayOfCipherTexts, d, serverContext){
  const seal = serverContext.seal;
  const evaluator = serverContext.evaluator;
  const encoder = serverContext.encoder;
  const slotCount = encoder.slotCount;
  const galoisKeys = serverContext.galois;
  const plainModulusBigInt = getPlainModulusFromContext(serverContext.context).value();

  const y = getRandomFieldElementWithout0(serverContext);
  const r = getRandomFieldElementWithout0(serverContext);

  // y vector
  const yEnc = [];
  let startVal = r;
  for (let j=0; j < arrayOfCipherTexts.length; ++j){
    const yDecode = new BigUint64Array(slotCount).fill(startVal);
    for (let i = 1; i < slotCount; i++){
      const tmp = (yDecode[i - 1] * y) % plainModulusBigInt;
      yDecode[i] = tmp;
    }
    const tmp = (yDecode[slotCount - 1] * y) % plainModulusBigInt;
    startVal = tmp;
    yEnc.push(encoder.encode(yDecode));
  }

  // d*y
  const dy = []

  for(let i = 0; i < arrayOfCipherTexts.length; ++i){
    dy.push(evaluator.multiplyPlain(d[i], yEnc[i]));
  }

  for(let i = 0; i < arrayOfCipherTexts.length; ++i){
    dot(arrayOfCipherTexts[i], dy[i], serverContext);
  }

  const mask = seal.CipherText();
  mask.copy(dy[0]);
  for(let i=1; i<arrayOfCipherTexts.length; i++){
    evaluator.add(dy[i], mask, mask);
    dy[i].delete();
  }
  dy[0].delete();

  return mask;
}

function dot(in1, inOut, serverContext){
  const evaluator = serverContext.evaluator;
  const relin = serverContext.relin;
  const galois = serverContext.galois;
  const seal = serverContext.seal;

  evaluator.multiply(in1, inOut, inOut);
  evaluator.relinearize(inOut, relin, inOut);
  evaluator.sumElements(inOut, galois, seal.SchemeType.bfv, inOut);
}

function computeMaskBin(arrayOfCipherTexts, d, serverContext) {
  const seal = serverContext.seal;
  const evaluator = serverContext.evaluator;
  const encoder = serverContext.encoder;
  const galoisKeys = serverContext.galois;

  const mask = computePartBinMask(arrayOfCipherTexts, d, serverContext);
  const mask1 = computePartBinMask(arrayOfCipherTexts, d, serverContext);

  evaluator.add(mask, mask1, mask);
  mask1.delete();
  return mask;
}



function subtractOne(arrayOfCiphertexts, { seal, evaluator, encoder}){
  const slotCount = encoder.slotCount;

  const one = seal.PlainText();
  const result = []

  encoder.encode(getFilledBigUint64Array(slotCount, 1), one);
  arrayOfCiphertexts.forEach(cipherText => {
    const cipherTextTmp = seal.CipherText();
    evaluator.subPlain(cipherText, one, cipherTextTmp);
    result.push(cipherTextTmp);
  });

  one.delete();
  return result;
}

function getPlainModulusFromContext(context){
  return context.keyContextData.parms.plainModulus;
}

//since PSA lib works in browser and node environment, it has to check the environment
function isNodeEnvironment(){
  let isNode = false;
  if (typeof process === 'object') {
    if (typeof process.versions === 'object') {
      if (typeof process.versions.node !== 'undefined') {
        isNode = true;
      }
    }
  }
  return isNode;
}

function getRandom64BitBigInt(){
  if (isNodeEnvironment()){
    return getRandom64BitBigIntNode();
  }
  else {
    return getRandom64BitBigIntBrowser();
  }
}

function getRandom64BitBigIntNode(){
  const buf = crypto.randomBytes(256);
  return buf.readBigUInt64LE();
}

function getRandom64BitBigIntBrowser(){
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = []
  randomBytes.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = '0' + h;
    }
    hex.push(h);
  });
  return BigInt('0x' + hex.join(''));
}

function getRandomFieldElement({context}){
  const plainModulus = getPlainModulusFromContext(context);
  const modulusValueAsBigInt = plainModulus.value;
  const bitMask = BigInt((1 << plainModulus.bitCount) - 1);

  let random64BitBigInt = getRandom64BitBigInt();
  let randomFieldElement = random64BitBigInt & bitMask;
  while(randomFieldElement >= modulusValueAsBigInt){
    random64BitBigInt = getRandom64BitBigInt();
    randomFieldElement = random64BitBigInt & bitMask;
  }
  return randomFieldElement;
}

function getRandomFieldElementWithout0(serverContext){
  while(1){
    const element = getRandomFieldElement(serverContext);
    if (element){
      return element;
    }
  }
}

function computeMask(arrayOfCiphertexts, hw, numCipherTexts, serverContext){
  const seal = serverContext.seal;
  const encoder = serverContext.encoder;
  const slotCount = encoder.slotCount;
  const evaluator = serverContext.evaluator;
  let d = subtractOne(arrayOfCiphertexts, serverContext);

  const maskHW = computeMaskHW(arrayOfCiphertexts, hw, serverContext);
  const z = getRandomFieldElement(serverContext);
  const Z = seal.PlainText();
  const bigUintArrayFilledWithZ = new BigUint64Array(encoder.slotCount).fill(z);
  encoder.encode(bigUintArrayFilledWithZ, Z);
  evaluator.multiplyPlain(maskHW, Z, maskHW);

  const maskBin = computeMaskBin(arrayOfCiphertexts, d, serverContext);

  //final add
  evaluator.add(maskHW, maskBin, maskHW);
  maskBin.delete();

  //r vec
  const rEnc = [];
  for (let i = 0; i < numCipherTexts; ++i){
    let rDecode;
    for (let j = 0; j < slotCount; ++j){
      rDecode.push(getRandomFieldElementWithout0());
    }
    rEnc.push(encoder.encode(rDecode));
  }

  //randomizing scalar mask
  const mask = []
  for (let i = 0; i < numCipherTexts; ++i){
    mask.push(evaluator.multiplyPlain(maskHW, rEnc[i]));
  }
  maskHW.delete();
  return mask;
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
  const seal = serverContext.seal;
  const encoder = serverContext.encoder;
  const evaluator = serverContext.evaluator;
  const slotCount = encoder.slotCount;
  const context = serverContext.context;
  const { encryptedArray: arrayOfBase64EncodedCiphertexts, hw, galois, relin } = JSON.parse(clientRequestObject)

  const galoisKeys = seal.GaloisKeys();
  galoisKeys.load(context, galois);
  serverContext.galois = galoisKeys;

  const relinKeys = seal.RelinKeys();
  relinKeys.load(context, relin);
  serverContext.relin = relinKeys;

  //masking
  const arrayOfCiphertexts = [];
  arrayOfBase64EncodedCiphertexts.forEach(base64encodedCipherText => {
    const cipherText = serverContext.seal.CipherText();
    cipherText.load(serverContext.context, base64encodedCipherText);
    arrayOfCiphertexts.push(cipherText);
  });

  const k = matrix[0].length;
  const numCipherTexts = Math.ceil((2 * k) / slotCount);
  const mask = computeMask(arrayOfCiphertexts, hw, numCipherTexts, serverContext)



  //base64encode again here !!!

  const computationResult = compute(
    arrayOfBase64EncodedCiphertexts,
    mask,
    galois,
    matrix,
    serverContext
  )
  return getServerResponseObject(computationResult)
}

/**
 *
 * @param {string[]} encryptedArray
 * @param {number} hw
 * @param {Object} options
 * @param {Object} options.compression
 * @param {Object} options.galoisKeys
 * @returns {string}
 */

function getClientRequestObject(encryptedArray, hw, { compression, galoisKeys, relinKeys }) {
  const galois = galoisKeys.save(compression);
  const relin = relinKeys.save(compression);
  return JSON.stringify({ encryptedArray, hw, galois, relin })
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
