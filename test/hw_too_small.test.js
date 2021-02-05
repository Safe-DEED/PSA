import PSA from '../src/index';

//dirty little test function
function matmul(vec, mat) {
  const res = [];
  const m = vec.length;
  for (let col = 0; col < mat[0].length; ++col) {
    let tmp = 0;
    for (let row = 0; row < m; ++row) {
      tmp += vec[row] * mat[row][col];
    }
    res.push(tmp);
  }
  return res;
}

describe('test with too small hamming weight', () => {
  it('using too small hw', async () => {
    const psaConf = {
      polyModulusDegree: 8192,
      plainModulusBitSize: 33,
      securityLevel: 128,
      compression: 'zstd',
      maskHW: true,
      minHW: BigInt(100),
      maskBin: true,
      createGkIndices: false // set true if you have enough memory available or if you are running in production
    };

    const clientContext = await PSA.getClientContext(psaConf);
    const serverContext = await PSA.getServerContext(psaConf);

    // prettier-ignore
    const array = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0,
        1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
        0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];

    // prettier-ignore
    const matrix = [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17],
        [18], [19], [20], [21], [22], [23], [24], [25], [26], [27], [28], [29], [30], [31], [32], [33], [34], [35],
        [36], [37], [38], [39], [40], [41], [42], [43], [44], [45], [46], [47], [48], [49], [50], [51], [52], [53],
        [54], [55], [56], [57], [58], [59], [60], [61], [62], [63], [64], [65], [66], [67], [68], [69], [70], [71],
        [72], [73], [74], [75], [76], [77], [78], [79], [80], [81], [82], [83], [84], [85], [86], [87], [88], [89],
        [90], [91], [92], [93], [94], [95], [96], [97], [98], [99]];

    const clientRequest = PSA.clientEncrypt(array, clientContext);
    expect(async () =>
      await PSA.serverCompute(clientRequest, matrix, serverContext)
    ).toThrowError();
  }, 9000000);
});
