import PSA from '../src'

describe('an psa lib', () => {
  it.each(['none', 'zlib', 'zstd'])(
    'with networking object (compression: %s)',
    async compressionMode => {
      const polyModulusDegree = 4096
      const plainModulusBitSize = 16

      const clientContext = await PSA.getClientContext({
        polyModulusDegree,
        plainModulusBitSize,
        compressionMode
      })

      expect(clientContext.compression).toBe(
        clientContext.seal.ComprModeType[compressionMode]
      )

      const serverContext = await PSA.getServerContext({
        polyModulusDegree,
        plainModulusBitSize,
        compressionMode
      })
      expect(serverContext.compression).toBe(
        serverContext.seal.ComprModeType[compressionMode]
      )
      // prettier-ignore
      const array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
            54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
            81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];

      // prettier-ignore
      const matrix = [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17],
            [18], [19], [20], [21], [22], [23], [24], [25], [26], [27], [28], [29], [30], [31], [32], [33], [34], [35],
            [36], [37], [38], [39], [40], [41], [42], [43], [44], [45], [46], [47], [48], [49], [50], [51], [52], [53],
            [54], [55], [56], [57], [58], [59], [60], [61], [62], [63], [64], [65], [66], [67], [68], [69], [70], [71],
            [72], [73], [74], [75], [76], [77], [78], [79], [80], [81], [82], [83], [84], [85], [86], [87], [88], [89],
            [90], [91], [92], [93], [94], [95], [96], [97], [98], [99]];

      const hw = array.reduce((a, b) => a+b, 0);
      const clientRequest = PSA.encryptForClientRequest(array, hw, clientContext)
      const serverResponse = PSA.computeWithClientRequestObject(
        clientRequest,
        matrix,
        serverContext
      )

      // ------------------ TEST---------
      const computationResult = JSON.parse(serverResponse)
      for (let i = 0; i < computationResult.length; ++i) {
        const cipherText = clientContext.seal.CipherText()
        cipherText.load(clientContext.context, computationResult[i])
        const noiseBudget = clientContext.decryptor.invariantNoiseBudget(
          cipherText
        )
        console.log('noise budget: ' + noiseBudget)
        if (noiseBudget <= 0) {
          throw new Error('noise budget consumed')
        }
      }
      //------------------------

      const result = PSA.decryptServerResponseObject(
        serverResponse,
        clientContext
      )
      // console.log(result)
      expect(parseInt(result[0])).toBe(328350)
    },
    9000000
  )
})
