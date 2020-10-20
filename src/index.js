import {createClientHEContext, createServerHEContext} from './HEutil';

async function getClientContext(){
    return await createClientHEContext();
}

async function getServerContext(){
    return await createServerHEContext();
}

function encrypt(inputArray){

}

function decrypt(array, context){

}

function compute(inputArray, matrix, evaluator, context){

}

const APIR = {
    getContextClient: getClientContext,
    getServerContext: getServerContext,
    encrypt: encrypt,
    decrypt: decrypt,
    compute: compute
}

module.exports = APIR;