import { LoaderOptions, Instance } from './seal';
import { ParmsIdType, ParmsIdTypeConstructorOptions } from './parms-id-type';
import { ContextData, ContextDataConstructorOptions } from './context-data';
import { EncryptionParameters } from './encryption-parameters';
import { SecurityLevel } from './security-level';
export declare type ContextDependencyOptions = {
    readonly ParmsIdType: ParmsIdTypeConstructorOptions;
    readonly ContextData: ContextDataConstructorOptions;
    readonly SecurityLevel: SecurityLevel;
};
export declare type ContextDependencies = {
    ({ ParmsIdType, ContextData, SecurityLevel }: ContextDependencyOptions): ContextConstructorOptions;
};
export declare type ContextConstructorOptions = {
    (encryptionParams: EncryptionParameters, expandModChain?: boolean, securityLevel?: SecurityLevel): Context;
};
export declare type Context = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly toHuman: () => string;
    readonly getContextData: (parmsId: ParmsIdType) => ContextData;
    readonly keyContextData: ContextData;
    readonly firstContextData: ContextData;
    readonly lastContextData: ContextData;
    readonly parametersSet: () => boolean;
    readonly keyParmsId: ParmsIdType;
    readonly firstParmsId: ParmsIdType;
    readonly lastParmsId: ParmsIdType;
    readonly usingKeyswitching: boolean;
};
export declare const ContextInit: ({ loader }: LoaderOptions) => ContextDependencies;
