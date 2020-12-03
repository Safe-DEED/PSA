import PSA from '../src'

describe('an psa lib', () => {
  it('passed compression parameter: "none"', async () => {
    const polyModulusDegree = 4096
    const plainModulus = 20
    const clientContext = await PSA.getClientContext(
      polyModulusDegree,
      plainModulus,
      'none'
    )
    expect(clientContext.compression).toBe(
      clientContext.morfix.ComprModeType.none
    )
  })
  it('passed compression parameter: "zlib"', async () => {
    const polyModulusDegree = 4096
    const plainModulus = 20
    const clientContext = await PSA.getClientContext(
      polyModulusDegree,
      plainModulus,
      'zlib'
    )
    expect(clientContext.compression).toBe(
      clientContext.morfix.ComprModeType.zlib
    )
  })
  it('passed compression parameter: "zstd"', async () => {
    const polyModulusDegree = 4096
    const plainModulus = 20
    const clientContext = await PSA.getClientContext(
      polyModulusDegree,
      plainModulus,
      'zstd'
    )
    expect(clientContext.compression).toBe(
      clientContext.morfix.ComprModeType.zstd
    )
  })
  it('passed compression parameter: undefined', async () => {
    const polyModulusDegree = 4096
    const plainModulus = 20
    const clientContext = await PSA.getClientContext(
      polyModulusDegree,
      plainModulus
    )
    expect(clientContext.compression).toBe(
      clientContext.morfix.ComprModeType.zstd
    )
  })
})
