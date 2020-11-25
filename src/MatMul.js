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
  let out = [];
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
  let slots = slotCount;
  let halfSlots = slots >>> 1;
  let out = [];

  for (let i = 0; i < slots; ++i) {
    let outRow = [];

    for (let j = 0; j < halfSlots; ++j) {
      let rowIndex = row * slots + i;
      let colIndex = col * halfSlots + j;
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
  let bsgsN1 = 1 << deg1;
  let bsgsN2 = 1 << deg2;
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

function babyStepGiantStepMatMul(inputState, subMatrix, HEcontext, bsgsN1, bsgsN2) {
  //big v*M
  let matrixDims = HEcontext.encoder.slotCount >>> 1;
  let matrix = [];
  const Morfix = HEcontext.morfix;
  const encoder = HEcontext.encoder;
  const context = HEcontext.context;
  const evaluator = HEcontext.evaluator;
  const galoisKeys = HEcontext.galois;

  for (let i = 0; i < matrixDims; ++i) {
    let diag = []; //2*matrixDims

    let tmp = []; //matrixDims

    for (let j = 0; j < matrixDims; ++j) {
      const val_diag = subMatrix[(i + j) % matrixDims][j];
      diag.push(BigInt(val_diag !== null ? val_diag : 0));
      const val_tmp = subMatrix[(i + j) % matrixDims + matrixDims][j];
      tmp.push(BigInt(val_tmp !== null ? val_tmp : 0));
    }

    let l = Math.floor(i / bsgsN1);

    if (l) {
      rotateN(diag, 2 * matrixDims - l * bsgsN1);
      rotateN(tmp, matrixDims - l * bsgsN1);
    }

    tmp.forEach(elem => {
      diag.push(elem);
    });
    let row = encoder.encode(BigUint64Array.from(diag));
    matrix.push(row);
  }

  let outerSum = Morfix.CipherText({
    context
  });
  let innerSum = Morfix.CipherText({
    context
  }); // prepare rotations

  let rot = []; //size: bsgsN1

  rot[0] = inputState;

  for (let j = 1; j < bsgsN1; j++) {
    rot[j] = evaluator.rotateRows(rot[j - 1], 1, galoisKeys);
  }

  for (let l = 0; l < bsgsN2; l++) {
    evaluator.multiplyPlain(rot[0], matrix[l * bsgsN1], innerSum);

    for (let j = 1; j < bsgsN1; j++) {
      let temp = evaluator.multiplyPlain(rot[j], matrix[l * bsgsN1 + j]);
      evaluator.add(innerSum, temp, innerSum);
      temp.delete();
    }

    if (!l) outerSum.copy(innerSum);else {
      let tmp = l * bsgsN1;
      evaluator.rotateRows(innerSum, tmp, galoisKeys, innerSum);
      evaluator.add(outerSum, innerSum, outerSum);
    }
  }

  for (let i = 1; i < bsgsN1; ++i) {
    rot[i].delete();
  }

  innerSum.delete();
  return outerSum;
}

function getMatElement(matrix, rowIndex, colIndex, N, k) {
  if (rowIndex >= N || colIndex >= k) {
    return 0;
  }

  return matrix[rowIndex][colIndex];
}