import {createClientHEContext, createServerHEContext} from './HEutil';
import {bigMatMul, getBsgsParams} from "./MatMul";

async function getClientContext(){
    return await createClientHEContext();
}

async function getServerContext(){
    return await createServerHEContext();
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

//takes plain array, return array of base64 encoded ciphertexts to be transmitted to server
function encrypt(inputArray, context){
    const encoder = context.encoder;
    const encryptor = context.encryptor;

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
        decryptor.decrypt(cipherText, plainText);
        resultVec.push(encoder.decodeBigInt(plainText, false))

        cipherText.delete();
        plainText.delete();
    });

    return getRedundantPartsRemovedArray(resultVec, encoder.slotCount);
}

function decryptServerResponseObject(serverResponseObject, clientContext){
    const encryptedResult = JSON.parse(serverResponseObject);
    return decrypt(encryptedResult, clientContext);
}

function getSerializedGaloisKeys(clientContext){
    return clientContext.galoisKeys.save();
}

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
    //for completeness and future changes
    return JSON.stringify(computationResult);
}

const APIR = {
    getContextClient: getClientContext,
    getServerContext: getServerContext,
    encrypt: encrypt,
    encryptForClientRequest: encryptForClientRequest,
    decrypt: decrypt,
    decryptServerResponseObject: decryptServerResponseObject,
    compute: compute,
    computeWithClientRequestObject: computeWithClientRequestObject,
    getSerializedGaloisKeys: getSerializedGaloisKeys,
}

module.exports = APIR;