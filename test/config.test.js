import PSA from '../src/index';
import { getComprModeType } from '../src/HEutil';

describe('config test', () => {
  it('pas in config files and check if configurations are applied', async () => {
    const psaConf = {
      polyModulusDegree: 8192,
      plainModulusBitSize: 33,
      securityLevel: 128,
      compression: 'zstd',
      maskHW: false,
      minHW: BigInt(100),
      maskBin: false
    };

    const clientContext = await PSA.getClientContext(psaConf);
    expect(clientContext.context.keyContextData.parms.polyModulusDegree).toBe(
      psaConf.polyModulusDegree
    );
    expect(
      clientContext.context.keyContextData.parms.plainModulus.bitCount
    ).toBe(psaConf.plainModulusBitSize);
    expect(
      clientContext.context.keyContextData.qualifiers.securityLevel.value
    ).toBe(psaConf.securityLevel);
    expect(clientContext.compression).toBe(
      getComprModeType(psaConf.compression, clientContext.seal)
    );
    expect(clientContext.maskHW).toBe(psaConf.maskHW);
    expect(clientContext.minHW).toBe(psaConf.minHW);
    expect(clientContext.maskBin).toBe(psaConf.maskBin);

    //server
    const serverContext = await PSA.getServerContext(psaConf);
    expect(serverContext.context.keyContextData.parms.polyModulusDegree).toBe(
      psaConf.polyModulusDegree
    );
    expect(
      serverContext.context.keyContextData.parms.plainModulus.bitCount
    ).toBe(psaConf.plainModulusBitSize);
    expect(
      serverContext.context.keyContextData.qualifiers.securityLevel.value
    ).toBe(psaConf.securityLevel);
    expect(serverContext.compression).toBe(
      getComprModeType(psaConf.compression, serverContext.seal)
    );
    expect(serverContext.maskHW).toBe(psaConf.maskHW);
    expect(serverContext.minHW).toBe(psaConf.minHW);
    expect(serverContext.maskBin).toBe(psaConf.maskBin);
  }, 9000000);
});
