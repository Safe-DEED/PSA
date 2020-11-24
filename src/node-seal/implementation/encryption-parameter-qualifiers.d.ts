import { Instance } from './seal';
import { SecurityLevel } from './security-level';
export declare type EncryptionParameterQualifiersDependencies = {
    (): EncryptionParameterQualifiersConstructorOptions;
};
export declare type EncryptionParameterQualifiersConstructorOptions = {
    (): EncryptionParameterQualifiers;
};
export declare type EncryptionParameterQualifiers = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly parametersSet: () => boolean;
    readonly usingFFT: boolean;
    readonly usingNTT: boolean;
    readonly usingBatching: boolean;
    readonly usingFastPlainLift: boolean;
    readonly usingDescendingModulusChain: boolean;
    readonly securityLevel: SecurityLevel;
};
export declare const EncryptionParameterQualifiersInit: () => EncryptionParameterQualifiersDependencies;
