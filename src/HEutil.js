import { Seal } from './node-seal';

async function createHEContext(){
    let Morfix = await Seal()

    const schemeType = Morfix.SchemeType.BFV
    const securityLevel = Morfix.SecurityLevel.tc128
    const polyModulusDegree = 4096
    const bitSizes = [36,36,37]
    const bitSize = 20

    const parms = Morfix.EncryptionParameters(schemeType)

    // Set the PolyModulusDegree
    parms.setPolyModulusDegree(polyModulusDegree)

    // Create a suitable set of CoeffModulus primes
    parms.setCoeffModulus(
        Morfix.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes))
    )

    // Set the PlainModulus to a prime of bitSize 20.
    parms.setPlainModulus(
        Morfix.PlainModulus.Batching(polyModulusDegree, bitSize)
    )

    const context = Morfix.Context(
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


