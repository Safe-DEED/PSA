export function bigMatMul(matrix, inputVec, params, HEcontext) {
    const evaluator = HEcontext.evaluator;
    const galoisKeys = HEcontext.galois;
    let out = [];
    const slots = HEcontext.encoder.slotCount;
    const numberOfRows = Math.ceil(params.N / slots);
    const numberOfCols = Math.ceil((2 * params.k) / slots);
    for (let col = 0; col < numberOfCols; ++col) {
        for (let row = 0; row < numberOfRows; ++row) {
            const subMat = getSubMatrix(matrix, row, col, params.N, params.k, slots);
            //console.log("subMat: " + subMat);
            const result = babyStepGiantStepMatMul(inputVec[row], subMat, HEcontext, params.bsgsN1, params.bsgsN2);

            //console.log("matMulresult: " + inputVec);
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
}

//return a n x n/2 submatrix
function getSubMatrix(matrix, row, col, N, k, slotCount) {
    let slots = slotCount;
    let halfSlots = slots >>> 1;
    //console.log("halfSlots: " + halfSlots);
    let out = [];
    for (let i = 0; i < slots; ++i) {
        let outRow = []
        for (let j = 0; j < halfSlots; ++j) {
            let rowIndex = row * slots + i;
            let colIndex = col * halfSlots + j;
            outRow.push(getMatElement(matrix, rowIndex, colIndex, N, k));
        }
        out.push(outRow);
    }
    //console.log(out);
    return out;
}

export function getBsgsParams(slotCount) {
    const slots = slotCount;
    const deg = Math.ceil(Math.log2((slots >> 1)));
    let deg1 = deg >> 1;
    if (deg1 * 2 !== deg) {
        deg1++;
    }
    const deg2 = deg - deg1;
    let bsgsN1 = (1 << deg1);
    let bsgsN2 = (1 << deg2);
    console.assert((slots >> 1) === bsgsN1 * bsgsN2);
    return [bsgsN1, bsgsN2];
}


function rotate(arr, toTheRight) {
    if (toTheRight) arr.unshift(arr.pop());
    else arr.push(arr.shift());
    return arr;
}

function rotateN(arr, n, toTheRight){
    while(n > 0){
        arr = rotate(arr, toTheRight);
        n--;
    }
    return arr;
}



function babyStepGiantStepMatMul(inputState, subMatrix, HEcontext, bsgsN1, bsgsN2) { //big v*M
    let matrixDims = HEcontext.encoder.slotCount >>> 1;
    let matrix = [];
    const Morfix = HEcontext.morfix;
    const encoder = HEcontext.encoder;
    const context = HEcontext.context;
    const evaluator = HEcontext.evaluator;
    const galoisKeys = HEcontext.galois;

    //console.log(HEcontext);
    //const plainText = decryptor.decrypt(inputState);
    //const arr = encoder.decode(plainText, false);
    //console.log(arr);

    for (let i = 0; i < matrixDims; ++i) {
        let diag = [] //2*matrixDims
        let tmp = [] //matrixDims

        for (let j = 0; j < matrixDims; ++j) {
            const val_diag = subMatrix[(i + j) % matrixDims][j]
            diag.push(BigInt(val_diag !== null ? val_diag : 0));
            const val_tmp = subMatrix[(i + j) % matrixDims + matrixDims][j]
            tmp.push(BigInt(val_tmp !== null ? val_tmp : 0));
        }

        let l = Math.floor(i / bsgsN1);

        if (l) {
            //const t2 = performance.now();
            rotateN(diag, (2*matrixDims) - l * bsgsN1);
            rotateN(tmp, matrixDims - l * bsgsN1);
            //const t3 = performance.now();
            //timingReport.rotateN = t3 - t2;
            //console.log(`Call to rotateN took ${timingReport.rotateN} milliseconds.`);
        }

        tmp.forEach(elem => {
            diag.push(elem);
        });

        let row = encoder.encode(BigUint64Array.from(diag));
        matrix.push(row);
    }

    let outerSum = Morfix.CipherText({ context });
    let innerSum = Morfix.CipherText({ context });

    // prepare rotations
    let rot = [] //size: bsgsN1
    rot[0] = inputState;

    //debugger;

    for (let j = 1; j < bsgsN1; j++) {
        rot[j] = evaluator.rotateRows(rot[j - 1], 1, galoisKeys);
    }

    for (let l = 0; l < bsgsN2; l++) {
        evaluator.multiplyPlain(rot[0], matrix[l * bsgsN1], innerSum);

        for (let j = 1; j < bsgsN1; j++) {
            /*const plainText = Morfix.PlainText();
            decryptor.decrypt(matrix[l * bsgsN1 + j], plainText);
            const root = encoder.decode(plainText, false);
            console.log(root);*/
            //const noise = decryptor.invariantNoiseBudget(rot[j]);
            //console.log('Noise:', noise)
            let temp = evaluator.multiplyPlain(rot[j], matrix[l * bsgsN1 + j]);

            evaluator.add(innerSum, temp, innerSum);

            temp.delete();
        }

        if (!l)
            outerSum.copy(innerSum);
        else {
            let tmp = l * bsgsN1;
            evaluator.rotateRows(innerSum, tmp, galoisKeys, innerSum);
            evaluator.add(outerSum, innerSum, outerSum);
        }
    }
    for (let i=1; i<bsgsN1; ++i){
        rot[i].delete();
    }

    //TODO:delete
    //const noise = decryptor.invariantNoiseBudget(outerSum);
    //console.log('Noise:', noise)
    innerSum.delete();

    return outerSum;
}

export function getMatElement(matrix, rowIndex, colIndex, N, k) {
    if (rowIndex >= N || colIndex >= k) {
        return 0;
    }
    return matrix[rowIndex][colIndex];
}


