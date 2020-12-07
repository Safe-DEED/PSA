import PSA from '../src'

describe('security level settings', () => {
  it('should initialize with a security level: 128', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20,
      securityLevel: 128
    })
    const expectedCoeffModulus = BigUint64Array.from([
      '68719403009',
      '68719230977',
      '137438822401'
    ])
    const context = clientContext.context
    const contextData = context.keyContextData
    const parms = contextData.parms
    const coeffModulus = parms.coeffModulus
    parms.delete()
    contextData.delete()
    context.delete()
    expect(expectedCoeffModulus).toEqual(coeffModulus)
  })
  it('should initialize with a security level: 192', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20,
      securityLevel: 192
    })
    const expectedCoeffModulus = BigUint64Array.from([
      '33538049',
      '33349633',
      '33292289'
    ])
    const context = clientContext.context
    const contextData = context.keyContextData
    const parms = contextData.parms
    const coeffModulus = parms.coeffModulus
    parms.delete()
    contextData.delete()
    context.delete()
    expect(expectedCoeffModulus).toEqual(coeffModulus)
  })
  it('should initialize with a security level: 256', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 8192,
      plainModulusBitSize: 20,
      securityLevel: 256
    })
    const expectedCoeffModulus = BigUint64Array.from([
      '549755731969',
      '549755486209',
      '1099511480321'
    ])
    const context = clientContext.context
    const contextData = context.keyContextData
    const parms = contextData.parms
    const coeffModulus = parms.coeffModulus
    parms.delete()
    contextData.delete()
    context.delete()
    expect(expectedCoeffModulus).toEqual(coeffModulus)
  })
  it('should initialize with a default security level (128): undefined', async () => {
    const clientContext = await PSA.getClientContext({
      polyModulusDegree: 4096,
      plainModulusBitSize: 20
    })
    const expectedCoeffModulus = BigUint64Array.from([
      '68719403009',
      '68719230977',
      '137438822401'
    ])
    const context = clientContext.context
    const contextData = context.keyContextData
    const parms = contextData.parms
    const coeffModulus = parms.coeffModulus
    parms.delete()
    contextData.delete()
    context.delete()
    expect(expectedCoeffModulus).toEqual(coeffModulus)
  })
})
