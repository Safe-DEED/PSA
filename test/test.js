import APIR from '../src';

describe('an apir lib', () => {
    it('without networking object', async () => {
        const clientContext = await APIR.getClientContext();
        const serverContext = await APIR.getServerContext();
        const array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
            54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
            81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];

        const matrix = [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17],
            [18], [19], [20], [21], [22], [23], [24], [25], [26], [27], [28], [29], [30], [31], [32], [33], [34], [35],
            [36], [37], [38], [39], [40], [41], [42], [43], [44], [45], [46], [47], [48], [49], [50], [51], [52], [53],
            [54], [55], [56], [57], [58], [59], [60], [61], [62], [63], [64], [65], [66], [67], [68], [69], [70], [71],
            [72], [73], [74], [75], [76], [77], [78], [79], [80], [81], [82], [83], [84], [85], [86], [87], [88], [89],
            [90], [91], [92], [93], [94], [95], [96], [97], [98], [99]];


        const encryptedArray = APIR.encrypt(array, clientContext);
        const serializedGaloisKeys = APIR.getSerializedGaloisKeys(clientContext);
        const out = APIR.compute(encryptedArray, serializedGaloisKeys, matrix, serverContext);

        // ------------------ TEST---------
        for (let i = 0; i < out.length; ++i) {
            const cipherText = clientContext.morfix.CipherText();
            cipherText.load(clientContext.context, out[i]);
            const noiseBudget = clientContext.decryptor.invariantNoiseBudget(cipherText);
            console.log("noise budget: " + noiseBudget);
            if (noiseBudget <= 0){
                throw new Error('noise budget consumed');
            }
        }
        //------------------------
        const result = APIR.decrypt(out, clientContext);
        console.log(result);
        expect(parseInt(result[0])).toBe(328350);
    }, 9000000);

    it('with networking object', async () => {
        const clientContext = await APIR.getClientContext();
        const serverContext = await APIR.getServerContext();
        const array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
            54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
            81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];

        const matrix = [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17],
            [18], [19], [20], [21], [22], [23], [24], [25], [26], [27], [28], [29], [30], [31], [32], [33], [34], [35],
            [36], [37], [38], [39], [40], [41], [42], [43], [44], [45], [46], [47], [48], [49], [50], [51], [52], [53],
            [54], [55], [56], [57], [58], [59], [60], [61], [62], [63], [64], [65], [66], [67], [68], [69], [70], [71],
            [72], [73], [74], [75], [76], [77], [78], [79], [80], [81], [82], [83], [84], [85], [86], [87], [88], [89],
            [90], [91], [92], [93], [94], [95], [96], [97], [98], [99]];


        const clientRequest = APIR.encryptForClientRequest(array, clientContext);

        const serverResponse = APIR.computeWithClientRequestObject(clientRequest, matrix, serverContext);

        // ------------------ TEST---------
        const computationResult = JSON.parse(serverResponse);
        for (let i = 0; i < computationResult.length; ++i) {
            const cipherText = clientContext.morfix.CipherText();
            cipherText.load(clientContext.context, computationResult[i]);
            const noiseBudget = clientContext.decryptor.invariantNoiseBudget(cipherText);
            console.log("noise budget: " + noiseBudget);
            if (noiseBudget <= 0){
                throw new Error('noise budget consumed');
            }
        }
        //------------------------

        const result = APIR.decryptServerResponseObject(serverResponse, clientContext);
        console.log(result);
        expect(parseInt(result[0])).toBe(328350);
    }, 9000000);

});
