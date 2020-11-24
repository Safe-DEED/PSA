import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { EncryptionParameters, EncryptionParametersConstructorOptions } from './encryption-parameters';
import { ParmsIdType, ParmsIdTypeConstructorOptions } from './parms-id-type';
import { EncryptionParameterQualifiers, EncryptionParameterQualifiersConstructorOptions } from './encryption-parameter-qualifiers';
export declare type ContextDataDependencyOptions = {
    readonly Exception: Exception;
    readonly EncryptionParameters: EncryptionParametersConstructorOptions;
    readonly ParmsIdType: ParmsIdTypeConstructorOptions;
    readonly EncryptionParameterQualifiers: EncryptionParameterQualifiersConstructorOptions;
};
export declare type ContextDataDependencies = {
    ({ Exception, EncryptionParameters, ParmsIdType, EncryptionParameterQualifiers }: ContextDataDependencyOptions): ContextDataConstructorOptions;
};
export declare type ContextDataConstructorOptions = {
    (): ContextData;
};
export declare type ContextData = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly parms: EncryptionParameters;
    readonly parmsId: ParmsIdType;
    readonly qualifiers: EncryptionParameterQualifiers;
    readonly totalCoeffModulusBitCount: number;
    readonly prevContextData: ContextData;
    readonly nextContextData: ContextData;
    readonly chainIndex: number;
};
export declare const ContextDataInit: ({ loader }: LoaderOptions) => ContextDataDependencies;
