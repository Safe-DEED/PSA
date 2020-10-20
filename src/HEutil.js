import { Seal } from 'node-seal/dist/allows_transparent/node/wasm';

export const mod = '8088322049';

async function createHEContext(){
    let Morfix = await Seal()

    const schemeType = Morfix.SchemeType.BFV
    const securityLevel = Morfix.SecurityLevel.tc128
    const polyModulusDegree = 8192
    //const bitSizes = [43,43,44,44,44]
    //const bitSize = 33
    const modulus = Morfix.Modulus(mod);

    const parms = Morfix.EncryptionParameters(schemeType)

    // Set the PolyModulusDegree
    parms.setPolyModulusDegree(polyModulusDegree)

    // Create a suitable set of CoeffModulus primes
    parms.setCoeffModulus(
        Morfix.CoeffModulus.BFVDefault(polyModulusDegree)
    )

    // Set the PlainModulus to a prime of bitSize 20.
    parms.setPlainModulus(modulus);

    let context = Morfix.Context(
        parms, // Encryption Parameters
        true, // ExpandModChain
        securityLevel // Enforce a security level
    )

    if (!context.parametersSet()) {
        throw new Error(
            'Could not set the parameters in the given context. Please try different encryption parameters.'
        )
    }

    return [Morfix, context];
}

export async function createClientHEContext(){

    const [Morfix, context] = await createHEContext();

    let encoder = Morfix.BatchEncoder(context);
    let keyGenerator = Morfix.KeyGenerator(context);
    let publicKey = keyGenerator.publicKey();
    let secretKey = keyGenerator.secretKey();
    let galoisKeys = keyGenerator.galoisKeys();
    let encryptor = Morfix.Encryptor(context, publicKey);
    let decryptor = Morfix.Decryptor(context, secretKey);
    let evaluator = Morfix.Evaluator(context);


    return {
        morfix: Morfix,
        context: context,
        encoder: encoder,
        keyGenerator: keyGenerator,
        publicKey: publicKey,
        secretKey: secretKey,
        galoisKeys: galoisKeys,
        encryptor: encryptor,
        decryptor: decryptor,
        evaluator: evaluator
    };


}

export async function createServerHEContext(){
    const [Morfix, context] = await createHEContext();
    let encoder = Morfix.BatchEncoder(context);
    let evaluator = Morfix.Evaluator(context);
    return {morfix: Morfix, context: context, encoder: encoder, evaluator: evaluator};
}


