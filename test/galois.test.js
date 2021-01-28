import PSA from '../src/index';
import { createGks } from '../src/HEutil';

describe('galois steps test', () => {
  it('set steps and check if set', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20
    });
    const galois = clientContext.seal.GaloisKeys();
    galois.load(
      clientContext.context,
      JSON.parse(JSON.stringify(clientContext.galoisKeys.save()))
    );
    const l = createGks(clientContext.encoder.slotCount);
    expect(galois.size).toBe([...new Set(l)].length);
  }, 9000000);
});
