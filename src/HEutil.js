"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createClientHEContext = createClientHEContext;
exports.createServerHEContext = createServerHEContext;

var _nodeSeal = _interopRequireDefault(require("./node-seal"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function createHEContext(polyModulusDegree, plainModulus) {
  let Morfix = await (0, _nodeSeal.default)();
  const schemeType = Morfix.SchemeType.BFV;
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
      break;
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
  const [Morfix, context] = await createHEContext(polyModulusDegree, plainModulus);
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

async function createServerHEContext(polyModulusDegree, plainModulus) {
  const [Morfix, context] = await createHEContext(polyModulusDegree, plainModulus);
  let encoder = Morfix.BatchEncoder(context);
  let evaluator = Morfix.Evaluator(context);
  return {
    morfix: Morfix,
    context: context,
    encoder: encoder,
    evaluator: evaluator
  };
}