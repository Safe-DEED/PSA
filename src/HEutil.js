"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createClientHEContext = createClientHEContext;
exports.createServerHEContext = createServerHEContext;

var _allows_wasm_node_umd = _interopRequireDefault(require("node-seal/allows_wasm_node_umd"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function createHEContext(polyModulusDegree, plainModulus) {
  // TODO: If it is possible for the application to create multiple client/server contexts,
  // we should move this out into a global singleton as it will trigger a warning
  // related to too many listeners (how WASM signals it is initialized internally).
  const Morfix = await (0, _allows_wasm_node_umd.default)();
  const schemeType = Morfix.SchemeType.bfv;
  const securityLevel = Morfix.SecurityLevel.tc128;
  let bitSizes;

  switch (polyModulusDegree) {
    case 4096:
      bitSizes = [36, 36, 37];
      break;

    case 8192:
      bitSizes = [43, 43, 44, 44, 44];
      break;

    case 16384:
      bitSizes = [48, 48, 48, 49, 49, 49, 49, 49, 49];
      break;

    default:
      throw new Error('unknown polyModulusDegree ' + polyModulusDegree);
  }

  const bitSize = plainModulus;
  const parms = Morfix.EncryptionParameters(schemeType); // Set the PolyModulusDegree

  parms.setPolyModulusDegree(polyModulusDegree); // Create a suitable set of CoeffModulus primes

  parms.setCoeffModulus(Morfix.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes))); // Set the PlainModulus to a prime of bitSize 20.

  parms.setPlainModulus(Morfix.PlainModulus.Batching(polyModulusDegree, bitSize));
  const context = Morfix.Context(parms, // Encryption Parameters
  true, // ExpandModChain
  securityLevel // Enforce a security level
  );

  if (!context.parametersSet()) {
    throw new Error('Could not set the parameters in the given context. Please try different encryption parameters.');
  }

  return [Morfix, context];
}

async function createClientHEContext(polyModulusDegree, plainModulus) {
  const [morfix, context] = await createHEContext(polyModulusDegree, plainModulus);
  const encoder = morfix.BatchEncoder(context);
  const keyGenerator = morfix.KeyGenerator(context);
  const publicKey = keyGenerator.createPublicKey();
  const secretKey = keyGenerator.secretKey(); // Use the `createGaloisKeysSerializable` function which generates a `Serializable` object
  // ready to be serialized. The benefit is about a 50% reduction in size,
  // but you cannot perform any HE operations until it is deserialized into
  // a proper GaloisKeys instance.

  const galoisKeys = keyGenerator.createGaloisKeysSerializable();
  const encryptor = morfix.Encryptor(context, publicKey);
  const decryptor = morfix.Decryptor(context, secretKey);
  const evaluator = morfix.Evaluator(context);
  return {
    morfix,
    context,
    encoder,
    keyGenerator,
    publicKey,
    secretKey,
    galoisKeys,
    encryptor,
    decryptor,
    evaluator
  };
}

async function createServerHEContext(polyModulusDegree, plainModulus) {
  const [morfix, context] = await createHEContext(polyModulusDegree, plainModulus);
  const encoder = morfix.BatchEncoder(context);
  const evaluator = morfix.Evaluator(context);
  return {
    morfix,
    context,
    encoder,
    evaluator
  };
}