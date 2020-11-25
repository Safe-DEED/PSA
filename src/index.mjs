import {createClientHEContext, createServerHEContext} from './HEutil';
import {bigMatMul, getBsgsParams} from "./MatMul";


/**
 * This asynchronous function return the client context object.
 * @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulus the plaintext modulus
 * @returns {Object} a context object necessary for client side actions
 */
async function getClientContext(polyModulusDegree, plainModulus){
    return await createClientHEContext(polyModulusDegree, plainModulus);
}

/**
 * This asynchronous function return the server context object.
 *  @param {number} polyModulusDegree the polymodulus degree
 * @param {number} plainModulus the plaintext modulus
 * @returns {Object} a context object necessary for client side actions
 */
async function getServerContext(polyModulusDegree, plainModulus){
    return await createServerHEContext(polyModulusDegree, plainModulus);
}

function getZeroFilledBigUint64Array(length) {
    return new BigUint64Array(length).fill(BigInt(0));
}

function getSpecialFormatIndicesVector(numInnerArrays, encoder, vec) {
    let numberIndices = [];
    for (let i = 0; i < numInnerArrays; ++i) {
        let inner_array = getZeroFilledBigUint64Array(encoder.slotCount);
        let currentOffset = i * encoder.slotCount;
        for (let innerI = 0; innerI < encoder.slotCount; ++innerI) {
            if ((currentOffset + innerI) < vec.length) {
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
function encrypt(inputArray, clientContext){
    const encoder = clientContext.encoder;
    const encryptor = clientContext.encryptor;

    let numInnerArrays = getNumberOfInnerArrays(inputArray.length, encoder.slotCount);
    const numberIndices = getSpecialFormatIndicesVector(numInnerArrays, encoder, inputArray);

    let ciphs = [];

    for (let i = 0; i < numInnerArrays; ++i){
        const plainText = encoder.encode(numberIndices[i]);
        const cipherText = encryptor.encrypt(plainText);
        const cipherTextBase64 = cipherText.save();
        ciphs.push(cipherTextBase64);
    }

    return ciphs;

}

/**
 * This function encrypts the client's input vector and returns an object ready to be sent to the server.
 * @param {array<number>} inputArray 1D array of numbers
 * @param {Object} clientContext client side context
 * @returns {string} JSON to be sent to server without further processing
 */
function encryptForClientRequest(inputArray, clientContext){
    const encryptedArray = encrypt(inputArray, clientContext);
    return getClientRequestObject(encryptedArray, clientContext);
}

function getRedundantPartsRemovedArray(arr, slotCount){
    let flatArray = [];
    for (let i=0; i<arr.length; ++i){
        for (let j=0; j < slotCount/2; ++j){
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
function decrypt(encryptedResult, clientContext){
    const Morfix = clientContext.morfix;
    const context = clientContext.context;
    const decryptor = clientContext.decryptor;
    const encoder = clientContext.encoder;

    let resultVec = []
    encryptedResult.forEach(item => {
        const cipherText = Morfix.CipherText();
        cipherText.load(context, item);
        const plainText = Morfix.PlainText();

        const noiseBudget = decryptor.invariantNoiseBudget(cipherText);
        if (noiseBudget <= 0){
            throw new Error('noise budget consumed: ' + noiseBudget);
        }

        decryptor.decrypt(cipherText, plainText);
        resultVec.push(encoder.decodeBigInt(plainText, false))

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
function decryptServerResponseObject(serverResponseObject, clientContext){
    const encryptedResult = JSON.parse(serverResponseObject);
    return decrypt(encryptedResult, clientContext);
}

/**
 * This function returns the serialized galois key needed for rotations of the ciphertext.
 * @param {Object} clientContext client side context
 * @returns {string} base64 encoded galois key
 */
function getSerializedGaloisKeys(clientContext){
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
function compute(encryptedArray, serializedGaloisKeys, matrix, serverContext){
    const Morfix = serverContext.morfix;
    const context = serverContext.context;
    const encoder = serverContext.encoder;
    const encryptedInputArray = encryptedArray;
    let galoisKeys = Morfix.GaloisKeys();
    galoisKeys.load(context, serializedGaloisKeys);
    serverContext.galois = galoisKeys;

    let input = []
    for (let i = 0; i < encryptedInputArray.length; ++i) {
        const cipherText = Morfix.CipherText();
        cipherText.load(context, encryptedInputArray[i]);
        input.push(cipherText);
    }

    const [bsgsN1, bsgsN2] = getBsgsParams(encoder.slotCount);

    let N = matrix.length;
    let k = matrix[0].length;

    let output = bigMatMul(matrix, input, {N:N, k:k,bsgsN1: bsgsN1, bsgsN2: bsgsN2}, serverContext);

    const convertedOutput = [];
    output.forEach(item => {
        convertedOutput.push(item.save());
    });

    return convertedOutput;
}

/**
 * This function computes the dot product between the encrypted client vector and the server matrix.
 * Constraints: If vector is of dimensions (1 x m), then matrix has to be of (m x n).
 * @param {string} clientRequestObject client request object (JSON), received from client
 * @param {array<number>} matrix a 2D array of Numbers.
 * @param {Object} serverContext server side context
 * @returns {string} JSON to be sent to client for decryption
 */
function computeWithClientRequestObject(clientRequestObject, matrix, serverContext){
    const clientRequestObjectParsed = JSON.parse(clientRequestObject);
    const computationResult = compute(clientRequestObjectParsed.arr, clientRequestObjectParsed.galois, matrix, serverContext);
    return getServerResponseObject(computationResult);

}

function getClientRequestObject(encryptedArray, clientContext){
    let galois = clientContext.galoisKeys.save();
    return JSON.stringify({arr: encryptedArray, galois: galois});
}

function getServerResponseObject(computationResult){
    return JSON.stringify(computationResult);
}

export default {
    getClientContext: getClientContext,
    getServerContext: getServerContext,
    encrypt: encrypt,
    encryptForClientRequest: encryptForClientRequest,
    decrypt: decrypt,
    decryptServerResponseObject: decryptServerResponseObject,
    compute: compute,
    computeWithClientRequestObject: computeWithClientRequestObject,
    getSerializedGaloisKeys: getSerializedGaloisKeys,
}
