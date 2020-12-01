"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bigMatMul = bigMatMul;
exports.getBsgsParams = getBsgsParams;
exports.getMatElement = getMatElement;

function bigMatMul(matrix, inputVec, params, HEcontext) {
  const evaluator = HEcontext.evaluator;
  const galoisKeys = HEcontext.galois;
  const out = [];
  const slots = HEcontext.encoder.slotCount;
  const numberOfRows = Math.ceil(params.N / slots);
  const numberOfCols = Math.ceil(2 * params.k / slots);

  for (let col = 0; col < numberOfCols; ++col) {
    for (let row = 0; row < numberOfRows; ++row) {
      const subMat = getSubMatrix(matrix, row, col, params.N, params.k, slots);
      const result = babyStepGiantStepMatMul(inputVec[row], subMat, HEcontext, params.bsgsN1, params.bsgsN2);
      const rotated = evaluator.rotateColumns(result, galoisKeys);
      evaluator.add(result, rotated, result);
      rotated.delete();

      if (row === 0) {
        out.push(result);
      } else {
        evaluator.add(out[col], result, out[col]);
      }
    }
  }

  return out;
} //return a n x n/2 submatrix


function getSubMatrix(matrix, row, col, N, k, slotCount) {
  const slots = slotCount;
  const halfSlots = slots >>> 1;
  const out = [];

  for (let i = 0; i < slots; ++i) {
    const outRow = [];

    for (let j = 0; j < halfSlots; ++j) {
      const rowIndex = row * slots + i;
      const colIndex = col * halfSlots + j;
      outRow.push(getMatElement(matrix, rowIndex, colIndex, N, k));
    }

    out.push(outRow);
  }

  return out;
}

function getBsgsParams(slotCount) {
  const slots = slotCount;
  const deg = Math.ceil(Math.log2(slots >> 1));
  let deg1 = deg >> 1;

  if (deg1 * 2 !== deg) {
    deg1++;
  }

  const deg2 = deg - deg1;
  const bsgsN1 = 1 << deg1;
  const bsgsN2 = 1 << deg2;
  console.assert(slots >> 1 === bsgsN1 * bsgsN2);
  return [bsgsN1, bsgsN2];
}

function rotate(arr, toTheRight) {
  if (toTheRight) arr.unshift(arr.pop());else arr.push(arr.shift());
  return arr;
}

function rotateN(arr, n, toTheRight) {
  while (n > 0) {
    arr = rotate(arr, toTheRight);
    n--;
  }

  return arr;
}

function babyStepGiantStepMatMul(inputState, subMatrix, {
  morfix,
  encoder,
  context,
  evaluator,
  galois: galoisKeys
}, bsgsN1, bsgsN2) {
  //big v*M
  const matrixDims = encoder.slotCount >>> 1;
  const matrix = [];

  for (let i = 0; i < matrixDims; ++i) {
    const diag = []; //2*matrixDims

    const tmp = []; //matrixDims

    for (let j = 0; j < matrixDims; ++j) {
      const val_diag = subMatrix[(i + j) % matrixDims][j];
      diag.push(BigInt(val_diag !== null ? val_diag : 0));
      const val_tmp = subMatrix[(i + j) % matrixDims + matrixDims][j];
      tmp.push(BigInt(val_tmp !== null ? val_tmp : 0));
    }

    const l = Math.floor(i / bsgsN1);

    if (l) {
      rotateN(diag, 2 * matrixDims - l * bsgsN1);
      rotateN(tmp, matrixDims - l * bsgsN1);
    }

    tmp.forEach(elem => {
      diag.push(elem);
    });
    const row = encoder.encode(BigUint64Array.from(diag));
    matrix.push(row);
  }

  const outerSum = morfix.CipherText({
    context
  });
  const innerSum = morfix.CipherText({
    context
  }); // prepare rotations

  const rot = []; //size: bsgsN1
  // Instead of passing by reference, which would refer to the same wasm instance,
  // we clone the inputState to not mutate the original state.

  rot[0] = inputState.clone();

  for (let j = 1; j < bsgsN1; j++) {
    rot[j] = evaluator.rotateRows(rot[j - 1], 1, galoisKeys);
  }

  for (let l = 0; l < bsgsN2; l++) {
    evaluator.multiplyPlain(rot[0], matrix[l * bsgsN1], innerSum);

    for (let j = 1; j < bsgsN1; j++) {
      const temp = evaluator.multiplyPlain(rot[j], matrix[l * bsgsN1 + j]);
      evaluator.add(innerSum, temp, innerSum);
      temp.delete();
    }

    if (!l) outerSum.copy(innerSum);else {
      const tmp = l * bsgsN1;
      evaluator.rotateRows(innerSum, tmp, galoisKeys, innerSum);
      evaluator.add(outerSum, innerSum, outerSum);
    }
  } // Since we only return outerSum, we can clean up
  // the other WASM instances


  rot.forEach(x => x.delete());
  matrix.forEach(x => x.delete());
  innerSum.delete();
  return outerSum;
}

function getMatElement(matrix, rowIndex, colIndex, N, k) {
  if (rowIndex >= N || colIndex >= k) {
    return 0;
  }

  return matrix[rowIndex][colIndex];
}