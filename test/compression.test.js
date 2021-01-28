import PSA from '../src/index';

describe('compression mode settings', () => {
  it('should initialize with compression mode: none', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20,
      compressionMode: 'none'
    });
    expect(clientContext.compression).toBe(
      clientContext.seal.ComprModeType.none
    );
  });
  it('should initialize with compression mode: zlib', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20,
      compressionMode: 'zlib'
    });
    expect(clientContext.compression).toBe(
      clientContext.seal.ComprModeType.zlib
    );
  });
  it('should initialize with compression mode: zstd', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20,
      compressionMode: 'zstd'
    });
    expect(clientContext.compression).toBe(
      clientContext.seal.ComprModeType.zstd
    );
  });
  it('should initialize with a default compression mode (zstd): undefined', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20
    });
    expect(clientContext.compression).toBe(
      clientContext.seal.ComprModeType.zstd
    );
  });
});
