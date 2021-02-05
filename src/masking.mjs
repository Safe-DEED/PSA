import { getFilledBigUint64Array } from './apiUtil';

function computeMaskHW(arrayOfCiphertexts, hw, serverContext) {
  const seal = serverContext.seal;
  const evaluator = serverContext.evaluator;
  const encoder = serverContext.encoder;
  const galoisKeys = serverContext.galois;

  const W = seal.PlainText();
  const bigUintArrayFilledWithHW = new BigUint64Array(encoder.slotCount).fill(
    BigInt(hw)
  );
  encoder.encode(bigUintArrayFilledWithHW, W);

  let tmp = [];
  arrayOfCiphertexts.forEach((ciphertext) => {
    tmp.push(
      evaluator.sumElements(ciphertext, galoisKeys, seal.SchemeType.bfv)
    );
  });

  const mask = seal.CipherText();
  mask.copy(tmp[0]);
  for (let i = 1; i < arrayOfCiphertexts.length; i++) {
    evaluator.add(tmp[i], mask, mask);
    tmp[i].delete();
  }
  tmp[0].delete();

  evaluator.subPlain(mask, W, mask);
  W.delete();

  return mask;
}

async function computePartBinMask(arrayOfCipherTexts, d, serverContext) {
  const seal = serverContext.seal;
  const evaluator = serverContext.evaluator;
  const encoder = serverContext.encoder;
  const slotCount = encoder.slotCount;
  const galoisKeys = serverContext.galois;
  const relinKeys = serverContext.relin;
  const plainModulusBigInt = getPlainModulusFromContext(serverContext.context)
    .value;

  const y = await getRandomFieldElementWithout0(serverContext);
  const r = await getRandomFieldElementWithout0(serverContext);

  // y vector
  const yEnc = [];
  let startVal = r;
  for (let j = 0; j < arrayOfCipherTexts.length; ++j) {
    const yDecode = new BigUint64Array(slotCount).fill(startVal);
    for (let i = 1; i < slotCount; i++) {
      const tmp = (yDecode[i - 1] * y) % plainModulusBigInt;
      yDecode[i] = tmp;
    }
    const tmp = (yDecode[slotCount - 1] * y) % plainModulusBigInt;
    startVal = tmp;
    yEnc.push(encoder.encode(yDecode));
  }

  // d*y
  const dy = [];

  for (let i = 0; i < arrayOfCipherTexts.length; ++i) {
    dy.push(evaluator.multiplyPlain(d[i], yEnc[i]));
  }

  for (let i = 0; i < arrayOfCipherTexts.length; ++i) {
    //dot(arrayOfCipherTexts[i], dy[i], serverContext);
    evaluator.dotProduct(
      arrayOfCipherTexts[i],
      dy[i],
      relinKeys,
      galoisKeys,
      seal.SchemeType.bfv,
      dy[i]
    );
  }

  const mask = seal.CipherText();
  mask.copy(dy[0]);
  for (let i = 1; i < arrayOfCipherTexts.length; i++) {
    evaluator.add(dy[i], mask, mask);
    dy[i].delete();
  }
  dy[0].delete();

  return mask;
}

async function computeMaskBin(arrayOfCipherTexts, d, serverContext) {
  const evaluator = serverContext.evaluator;

  const mask = await computePartBinMask(arrayOfCipherTexts, d, serverContext);
  const mask1 = await computePartBinMask(arrayOfCipherTexts, d, serverContext);

  evaluator.add(mask, mask1, mask);
  mask1.delete();
  return mask;
}

function subtractOne(arrayOfCiphertexts, { seal, evaluator, encoder }) {
  const slotCount = encoder.slotCount;

  const one = seal.PlainText();
  const result = [];

  encoder.encode(getFilledBigUint64Array(slotCount, 1), one);
  arrayOfCiphertexts.forEach((cipherText) => {
    const cipherTextTmp = seal.CipherText();
    evaluator.subPlain(cipherText, one, cipherTextTmp);
    result.push(cipherTextTmp);
  });

  one.delete();
  return result;
}

function getPlainModulusFromContext(context) {
  return context.keyContextData.parms.plainModulus;
}

//since PSA lib works in browser and node environment, it has to check the environment
function isNodeEnvironment() {
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

async function getRandom64BitBigInt() {
  if (isNodeEnvironment()) {
    return await getRandom64BitBigIntNode();
  } else {
    return getRandom64BitBigIntBrowser();
  }
}

async function getRandom64BitBigIntNode() {
  const crypto = await import('crypto');
  const buf = crypto.randomBytes(256);
  return buf.readBigUInt64LE();
}

function getRandom64BitBigIntBrowser() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = [];
  randomBytes.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = '0' + h;
    }
    hex.push(h);
  });
  return BigInt('0x' + hex.join(''));
}

async function getRandomFieldElement({ context }) {
  const plainModulus = getPlainModulusFromContext(context);
  const modulusValueAsBigInt = plainModulus.value;
  const bitMask = BigInt((1 << plainModulus.bitCount) - 1);

  let random64BitBigInt = await getRandom64BitBigInt();
  let randomFieldElement = random64BitBigInt & bitMask;
  while (randomFieldElement >= modulusValueAsBigInt) {
    random64BitBigInt = await getRandom64BitBigInt();
    randomFieldElement = random64BitBigInt & bitMask;
  }
  return randomFieldElement;
}

async function getRandomFieldElementWithout0(serverContext) {
  while (1) {
    const element = await getRandomFieldElement(serverContext);
    if (element) {
      return element;
    }
  }
}

function getNoiseBudget(cipherTextArray, serverContext, single = false) {
  if (single) {
    const cipherText = serverContext.seal.CipherText();
    cipherText.load(serverContext.context, cipherTextArray);
    const noiseBudget = serverContext.decryptor.invariantNoiseBudget(
      cipherText
    );
    console.log('noise budget: ' + noiseBudget);
    if (noiseBudget <= 0) {
      throw new Error('noise budget consumed');
    }
  } else {
    for (let i = 0; i < cipherTextArray.length; ++i) {
      const cipherText = serverContext.seal.CipherText();
      cipherText.load(serverContext.context, cipherTextArray[i]);
      const noiseBudget = serverContext.decryptor.invariantNoiseBudget(
        cipherText
      );
      console.log('noise budget: ' + noiseBudget);
      if (noiseBudget <= 0) {
        throw new Error('noise budget consumed');
      }
    }
  }
}

export async function computeMask(
  arrayOfCiphertexts,
  hw,
  numCipherTexts,
  serverContext
) {
  const seal = serverContext.seal;
  const encoder = serverContext.encoder;
  const slotCount = encoder.slotCount;
  const evaluator = serverContext.evaluator;
  let d = subtractOne(arrayOfCiphertexts, serverContext);

  let maskHW;
  if (serverContext.maskHW) {
    maskHW = computeMaskHW(arrayOfCiphertexts, hw, serverContext);
    const z = await getRandomFieldElement(serverContext);
    const Z = seal.PlainText();
    const bigUintArrayFilledWithZ = new BigUint64Array(encoder.slotCount).fill(
      z
    );
    encoder.encode(bigUintArrayFilledWithZ, Z);
    evaluator.multiplyPlain(maskHW, Z, maskHW);
  }

  let maskBin = serverContext.maskBin
    ? await computeMaskBin(arrayOfCiphertexts, d, serverContext)
    : null;

  //setting mask
  const maskTmp = seal.CipherText();
  if (serverContext.maskHW && serverContext.maskBin) {
    evaluator.add(maskHW, maskBin, maskTmp);
    maskBin.delete();
    maskHW.delete();
  } else if (serverContext.maskBin) {
    maskTmp.copy(maskBin);
    maskBin.delete();
  } else if (serverContext.maskHW) {
    maskTmp.copy(maskHW);
    maskHW.delete();
  } else {
    throw new Error('you should not get here!');
  }

  //r vec
  const rEnc = [];
  for (let i = 0; i < numCipherTexts; ++i) {
    let rDecode = new BigUint64Array(slotCount);
    for (let j = 0; j < slotCount; ++j) {
      rDecode[j] = await getRandomFieldElementWithout0(serverContext);
    }
    rEnc.push(encoder.encode(rDecode));
  }

  //randomizing scalar mask
  const mask = [];
  for (let i = 0; i < numCipherTexts; ++i) {
    mask.push(evaluator.multiplyPlain(maskTmp, rEnc[i]));
  }
  maskTmp.delete();
  return mask;
}
